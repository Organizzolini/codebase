import { existsSync, mkdirSync } from "node:fs";
import * as fs from "node:fs/promises";
import path from "node:path";

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import _ from "lodash";
import { toString } from "mdast-util-to-string";
import { remark } from "remark";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import YAML from "yaml";

import { Author, Line, Text, Token, Word } from "@codebase/lexico-entities";
import { LoggerService } from "@codebase/logging";

import { NumeralsService } from "../numerals/numerals.service";

import { LiteratureLibraryScanService } from "./literature-library-scan.service";
import { LiteratureTextIngestionService } from "./literature-text-ingestion.service";
import { LiteratureWordNormalizationService } from "./literature-word-normalization.service";
import {
  authorIdToName,
  DEFAULT_LINE_CHUNK_SIZE,
  DEFAULT_TEXT_CHUNK_SIZE,
  DEFAULT_TOKEN_CHUNK_SIZE,
  LABEL_PATTERN,
  LEADING_WHITESPACE_PATTERN,
  ROMAN_NUMERAL_PATTERN,
  TOKEN_SEGMENT_PATTERN,
  WORD_TOKEN_PATTERN,
} from "./literature.constants";

import type {
  IngestTextArguments,
  LibraryEntry,
  ParsedLabelResult,
} from "./literature.types";
import type { Paragraph, PhrasingContent, Root, Strong } from "mdast";
import type { Repository } from "typeorm";
import type { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity.js";

/** Scans provider markdown files and ingests normalized literature data. */
@Injectable()
export class LiteratureService {
  // 🏗 Dependency Injection

  public constructor(
    @InjectRepository(Author)
    private readonly authorRepository: Repository<Author>,
    @InjectRepository(Line)
    private readonly lineRepository: Repository<Line>,
    private readonly numeralsService: NumeralsService,
    @InjectRepository(Text)
    private readonly textRepository: Repository<Text>,
    @InjectRepository(Token)
    private readonly tokenRepository: Repository<Token>,
    @InjectRepository(Word)
    private readonly wordRepository: Repository<Word>,
    private readonly literatureLibraryScanService: LiteratureLibraryScanService,
    private readonly literatureTextIngestionService: LiteratureTextIngestionService,
    private readonly literatureWordNormalizationService: LiteratureWordNormalizationService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(LiteratureService.name);
    const outputDirectory = path.join(process.cwd(), "output");
    if (!existsSync(outputDirectory)) {
      mkdirSync(outputDirectory, { recursive: true });
    }

    this.logFilePath = path.join(
      outputDirectory,
      `literature-${new Date().toISOString().replaceAll(/[:.]/g, "-")}.log`,
    );
  }

  // 🔐 Private Fields

  private readonly logFilePath: string;

  private readonly memoizedWordCache = new Map<string, null | string>();
  private wordsCache: Map<string, string> | null = null;

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Builds line entity from paragraph for literature ingestion.
   */
  private buildLineEntityFromParagraph(
    paragraph: Paragraph,
    index: number,
    text: Text,
  ): QueryDeepPartialEntity<Line> {
    let label = `${index + 1}`;
    let lineNodes: PhrasingContent[] = [...paragraph.children];
    const firstNode = lineNodes[0];
    if (firstNode?.type === "strong") {
      const parsed = this.parseLabelFromStrongNode(firstNode, lineNodes);
      label = parsed.label;
      lineNodes = parsed.lineNodes;
    }
    const lineText = toString({ children: lineNodes, type: "paragraph" });
    return {
      author: { id: text.author.id },
      data: lineText,
      index,
      label,
      text: { id: text.id },
    };
  }

  /**
   * Ensure parent texts for literature ingestion.
   */
  private async ensureParentTexts(
    authorEntity: Author,
    authorSlug: string,
    texts: LibraryEntry[],
  ): Promise<Map<string, Text>> {
    const parentTexts = new Map<string, Text>();
    for (const text of texts) {
      if (text.pathParts.length === 0) continue;
      let currentPath = authorSlug;
      for (const part of text.pathParts) {
        const parentSlug = currentPath;
        currentPath = `${currentPath}/${part}`;
        if (parentTexts.has(currentPath)) continue;
        const parentText = parentTexts.get(parentSlug);
        await this.textRepository.upsert(
          {
            author: { id: authorEntity.id },
            ...(parentText ? { parentText: { id: parentText.id } } : {}),
            slug: currentPath,
            title: _.startCase(part),
            type: "book",
          },
          { conflictPaths: ["slug"], skipUpdateIfNoValuesChanged: true },
        );
        const newParent = await this.textRepository.findOneOrFail({
          where: { slug: currentPath },
        });
        parentTexts.set(currentPath, newParent);
      }
    }
    return parentTexts;
  }
  /**
   * Extracts tokens from line from literature ingestion input.
   */
  private extractTokensFromLine(
    line: Line,
    text: Text,
    wordMap: Map<string, string>,
  ): QueryDeepPartialEntity<Token>[] {
    const tokenStrings = line.data.match(TOKEN_SEGMENT_PATTERN) || [];
    return tokenStrings.map((data, index) => {
      const isPunctuation = !WORD_TOKEN_PATTERN.test(data);
      let wordId: null | string = null;
      if (!isPunctuation) {
        wordId = this.memoizedWordCache.get(data) || null;
        if (!wordId) {
          const normalized =
            this.literatureWordNormalizationService.escapeCapitals(
              this.literatureWordNormalizationService.normalize(data),
            );
          wordId = wordMap.get(normalized) || null;
          this.memoizedWordCache.set(data, wordId);
        }
      }
      return {
        author: { id: text.author.id },
        data,
        index,
        isPunctuation,
        line: { id: line.id },
        text: { id: text.id },
        word: wordId ? { id: wordId } : null,
      };
    });
  }
  /**
   * Returns metadata as a record when present and object-like.
   */
  private getMetadataRecord(
    metadata: null | Record<string, unknown> | undefined,
  ): Record<string, unknown> {
    return metadata ?? {};
  }

  /**
   * Gets words cache used by literature ingestion.
   */
  private async getWordsCache(): Promise<Map<string, string>> {
    if (!this.wordsCache) {
      this.logger.info("📖 Caching dictionary words for token mapping");
      const words = await this.wordRepository.find({
        select: { data: true, id: true },
      });
      this.wordsCache = new Map(words.map((word) => [word.data, word.id]));
      this.logger.info("📖 Cached words", undefined, {
        count: this.wordsCache.size,
      });
    }
    return this.wordsCache;
  }
  /**
   * Ingests author group in the literature ingestion pipeline.
   */
  private async ingestAuthorGroup(
    authorSlug: string,
    texts: LibraryEntry[],
  ): Promise<void> {
    this.logger.info("👤 Starting author", undefined, { authorSlug });
    await this.authorRepository.upsert(
      {
        name: authorIdToName[authorSlug] || _.startCase(authorSlug),
        slug: authorSlug,
      },
      { conflictPaths: ["slug"], skipUpdateIfNoValuesChanged: true },
    );
    const authorEntity = await this.authorRepository.findOneOrFail({
      where: { slug: authorSlug },
    });
    const parentTexts = await this.ensureParentTexts(
      authorEntity,
      authorSlug,
      texts,
    );
    await this.ingestTextChunks({
      authorEntity,
      authorSlug,
      parentTexts,
      texts,
    });
  }
  /**
   * Ingests lines in the literature ingestion pipeline.
   */
  private async ingestLines(text: Text, ast: Root): Promise<void> {
    this.logger.info("📜 Parsing lines for text", undefined, {
      title: text.title,
    });
    const wordMap = await this.getWordsCache();
    const tokenEntities: QueryDeepPartialEntity<Token>[] = [];
    const paragraphs = ast.children.filter(
      (child): child is Paragraph => child.type === "paragraph",
    );
    if (paragraphs.length === 0)
      this.logger.warn("📜 Missing lines in text", undefined, {
        slug: text.slug,
      });
    const lineEntities = paragraphs.map((paragraph, index) =>
      this.buildLineEntityFromParagraph(paragraph, index, text),
    );
    const savedLines = await this.upsertAndFetchLines(lineEntities, text);
    this.logger.info("💾 Saved lines", undefined, {
      count: savedLines.length,
    });
    for (const line of savedLines) {
      const tokens = this.extractTokensFromLine(line, text, wordMap);
      tokenEntities.push(...tokens);
    }
    await this.upsertTokens(tokenEntities, text);
  }
  /**
   * Ingests text in the literature ingestion pipeline.
   */
  private async ingestText(args: IngestTextArguments): Promise<void> {
    const { author, parentText, textPath, textSlugName, title } = args;
    const textSlug = parentText
      ? `${parentText.slug}/${textSlugName}`
      : `${author.slug}/${textSlugName}`;
    const content = await fs.readFile(textPath, "utf8");
    const ast = remark().use(remarkFrontmatter).use(remarkGfm).parse(content);
    const frontmatterData = this.parseFrontmatter(ast);
    if (frontmatterData["author_metadata"]) {
      const existingMetadata = this.getMetadataRecord(author.metadata);
      author.metadata = _.merge(
        existingMetadata,
        frontmatterData["author_metadata"],
      );
      await this.authorRepository.save(author);
    }
    const text = await this.saveTextToDatabase({
      author,
      frontmatterData,
      parentText,
      textSlug,
      title,
    });
    await this.ingestLines(text, ast);
  }
  /**
   * Ingests text chunks in the literature ingestion pipeline.
   */
  private async ingestTextChunks(args: {
    authorEntity: Author;
    authorSlug: string;
    parentTexts: Map<string, Text>;
    texts: LibraryEntry[];
  }): Promise<void> {
    const { authorEntity, authorSlug, parentTexts, texts } = args;
    let currentText = 0;
    const totalTexts = texts.length;
    const textChunks = _.chunk(texts, DEFAULT_TEXT_CHUNK_SIZE);
    for (const chunk of textChunks) {
      for (const textEntry of chunk) {
        currentText++;
        await this.literatureTextIngestionService.ingestTextWithLogging(
          {
            ingestText: async (ingestArguments): Promise<void> =>
              this.ingestText(ingestArguments),
          },
          {
            authorEntity,
            authorSlug,
            currentText,
            logFilePath: this.logFilePath,
            parentTexts,
            textEntry,
            totalTexts,
          },
        );
      }
    }
  }
  /**
   * Guards unknown values as non-array records.
   */
  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
  /**
   * Parses frontmatter during literature ingestion.
   */
  private parseFrontmatter(ast: Root): Record<string, unknown> {
    const yamlNode = ast.children.find((node) => node.type === "yaml");
    if (!yamlNode?.value) return {};
    try {
      const parsed: unknown = YAML.parse(yamlNode.value);
      if (this.isRecord(parsed)) {
        return parsed;
      }

      return {};
    } catch {
      return {};
    }
  }
  /**
   * Parses label from strong node during literature ingestion.
   */
  private parseLabelFromStrongNode(
    strongNode: Strong,
    lineNodes: PhrasingContent[],
  ): ParsedLabelResult {
    const rawLabel = toString(strongNode).trim();
    const labelMatch = LABEL_PATTERN.exec(rawLabel);
    if (labelMatch?.[1]) {
      return this.parseStandardLabel(labelMatch, lineNodes);
    }
    return this.parseNonStandardLabel(rawLabel, lineNodes);
  }
  /**
   * Parses non standard label during literature ingestion.
   */
  private parseNonStandardLabel(
    rawLabel: string,
    lineNodes: PhrasingContent[],
  ): ParsedLabelResult {
    let label = `${lineNodes.length + 1}`;
    let resultNodes: PhrasingContent[] = lineNodes.slice(1);
    if (rawLabel.length <= 32) {
      label = ROMAN_NUMERAL_PATTERN.test(rawLabel)
        ? `${this.numeralsService.toDecimal(rawLabel)}`
        : rawLabel;
    } else {
      resultNodes = [{ type: "text", value: `${rawLabel} ` }, ...resultNodes];
    }
    const nextNode = resultNodes[0];
    if (nextNode?.type === "text" && "value" in nextNode) {
      nextNode.value = nextNode.value.replace(LEADING_WHITESPACE_PATTERN, "");
    }
    return { label, lineNodes: resultNodes };
  }
  /**
   * Parses standard label during literature ingestion.
   */
  private parseStandardLabel(
    labelMatch: RegExpExecArray,
    lineNodes: PhrasingContent[],
  ): ParsedLabelResult {
    let label = labelMatch[1] ?? "";
    if (ROMAN_NUMERAL_PATTERN.test(label)) {
      label = `${this.numeralsService.toDecimal(label)}`;
    }
    const remainder = labelMatch[2];
    let resultNodes: PhrasingContent[] = lineNodes.slice(1);
    if (remainder) {
      resultNodes = [{ type: "text", value: `${remainder} ` }, ...resultNodes];
    }
    return { label, lineNodes: resultNodes };
  }
  /**
   * Save text to database for literature ingestion.
   */
  private async saveTextToDatabase(args: {
    author: Author;
    frontmatterData: Record<string, unknown>;
    parentText: Text | undefined;
    textSlug: string;
    title: string;
  }): Promise<Text> {
    const { author, frontmatterData, parentText, textSlug, title } = args;
    const textSaveObject: QueryDeepPartialEntity<Text> = {
      author: { id: author.id },
      slug: textSlug,
      title,
      type: "text",
    };
    if (parentText) {
      textSaveObject.parentText = { id: parentText.id };
    }
    await this.textRepository.upsert(textSaveObject, {
      conflictPaths: ["slug"],
      skipUpdateIfNoValuesChanged: true,
    });
    const textEntity = await this.textRepository.findOneOrFail({
      relations: { author: true },
      where: { slug: textSlug },
    });

    if (this.isRecord(frontmatterData["text_metadata"])) {
      textEntity.metadata = frontmatterData["text_metadata"];
      await this.textRepository.save(textEntity);
    }

    return textEntity;
  }
  /**
   * Upsert and fetch lines for literature ingestion.
   */
  private async upsertAndFetchLines(
    lineEntities: QueryDeepPartialEntity<Line>[],
    text: Text,
  ): Promise<Line[]> {
    const lineChunks = _.chunk(lineEntities, DEFAULT_LINE_CHUNK_SIZE);
    await Promise.all(
      lineChunks.map(async (chunk) =>
        this.lineRepository.upsert(chunk, {
          conflictPaths: ["text", "index"],
          skipUpdateIfNoValuesChanged: true,
        }),
      ),
    );
    return this.lineRepository.find({
      loadEagerRelations: false,
      order: { index: "ASC" },
      select: { data: true, id: true, index: true },
      where: { text: { id: text.id } },
    });
  }
  /**
   * Upsert tokens for literature ingestion.
   */
  private async upsertTokens(
    tokenEntities: QueryDeepPartialEntity<Token>[],
    text: Text,
  ): Promise<void> {
    this.logger.info("💾 Saving tokens for text", undefined, {
      count: tokenEntities.length,
      title: text.title,
    });
    const tokenChunks = _.chunk(tokenEntities, DEFAULT_TOKEN_CHUNK_SIZE);
    await Promise.all(
      tokenChunks.map(async (chunk) =>
        this.tokenRepository.upsert(chunk, {
          conflictPaths: ["line", "index"],
          skipUpdateIfNoValuesChanged: true,
        }),
      ),
    );
  }
  // 🌎 Public Methods

  /** Ingests all selected texts grouped by author. */
  public async ingestAllAuthors(textsToIngest: LibraryEntry[]): Promise<void> {
    const grouped = _.groupBy(textsToIngest, "authorSlug");
    const authors = Object.entries(grouped);
    let currentAuthor = 0;
    const totalAuthors = authors.length;
    for (const [authorSlug, texts] of authors) {
      await this.ingestAuthorGroup(authorSlug, texts);
      currentAuthor++;
      this.logger.info("👤 Completed author", undefined, {
        authorSlug,
        current: currentAuthor,
        percent: Number(((currentAuthor / totalAuthors) * 100).toFixed(2)),
        total: totalAuthors,
      });
    }
  }

  /** Scans the local library directory and returns discovered text entries. */
  public async scanLibrary(): Promise<LibraryEntry[]> {
    return this.literatureLibraryScanService.scanLibrary();
  }
}
