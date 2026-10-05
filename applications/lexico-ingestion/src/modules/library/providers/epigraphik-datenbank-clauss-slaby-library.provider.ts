// `obj` is the field name the EDCS API returns, not an abbreviation this code chose.
// cspell:ignore obj

import * as fs from "node:fs/promises";
import path from "node:path";

import { Injectable } from "@nestjs/common";
import _ from "lodash";
import YAML from "yaml";

import { Author, Text } from "@codebase/lexico-entities";
import { LoggerService } from "@codebase/logging";

/**
 * Shape of a single record in the raw JSON chunks returned by the EDCS API.
 * `inschriften` is a sparse tuple where index 0 carries the raw inscription text (possibly HTML-tagged).
 */
interface EpigraphikDatenbankClaussSlabyRecord {
  obj: {
    "edcs-id"?: string;
    edcsId?: string;
    inschriften: [string, unknown, string[], string[]][];
    provinz: null | string;
  };
}

/**
 * Provider for ingesting Epigraphik-Datenbank Clauss-Slaby inscriptions.
 */
@Injectable()
export class EpigraphikDatenbankClaussSlabyLibraryProvider {
  constructor(private readonly logger: LoggerService) {}

  readonly name = "epigraphik-datenbank-clauss-slaby";

  // 🔏 Private Methods

  /**
   * Builds structured data used during EDCS library ingestion.
   */
  private createSourceAuthor(authorSlug: string, host: string): Author {
    const author = new Author();
    author.name = "Epigraphik-Datenbank Clauss-Slaby";
    author.slug = authorSlug;
    author.metadata = { sourceUrl: host };
    author.texts = [];
    return author;
  }

  /**
   * Resolves derived values needed by EDCS library ingestion.
   */
  private getOrCreateBookText(args: {
    author: Author;
    bookSlug: string;
    booksMap: Map<string, Text>;
    province: string;
  }): Text {
    const { author, bookSlug, booksMap, province } = args;
    let bookText = booksMap.get(province);
    if (!bookText) {
      bookText = new Text();
      bookText.type = "book";
      bookText.title = province;
      bookText.slug = bookSlug;
      bookText.childTexts = [];
      booksMap.set(province, bookText);
      author.texts.push(bookText);
    }
    return bookText;
  }

  /**
   * Processes one workflow step for EDCS library ingestion.
   */
  private processEdcsRecord(
    item: EpigraphikDatenbankClaussSlabyRecord,
    provinceData: Map<string, string[]>,
  ): void {
    const object = item.obj;
    const recordId = object["edcs-id"] || object.edcsId;
    const provinz = object.provinz || "Unknown Province";
    const text = object.inschriften[0]?.[0];
    if (!text) return;
    let cleanedText = text;
    let previousText: string;
    do {
      previousText = cleanedText;
      cleanedText = cleanedText.replaceAll(/<[^>]*>?/gm, "");
    } while (cleanedText !== previousText);
    const markdownLine = `**${recordId}** ${cleanedText}`;
    const provArray = provinceData.get(provinz) || [];
    provArray.push(markdownLine);
    provinceData.set(provinz, provArray);
  }

  /**
   * Processes one workflow step for EDCS library ingestion.
   */
  private async processSourceChunkFile(args: {
    file: string;
    index: number;
    provinceData: Map<string, string[]>;
    sourceDataDirectory: string;
    total: number;
  }): Promise<void> {
    const { file, index, provinceData, sourceDataDirectory, total } = args;
    this.logger.info("📜 Starting processing chunk", undefined, { file });
    try {
      const filePath = path.join(sourceDataDirectory, file);
      const fileContent = await fs.readFile(filePath, "utf8");
      const data = JSON.parse(fileContent) as {
        data: EpigraphikDatenbankClaussSlabyRecord[];
      };
      for (const item of data.data) this.processEdcsRecord(item, provinceData);
      this.logger.info("📜 Completed processing chunk", undefined, {
        current: index + 1,
        file,
        percent: Number((((index + 1) / total) * 100).toFixed(2)),
        total,
      });
    } catch (error) {
      this.logger.warn("📄 Failed reading chunk file", undefined, {
        file,
        reason: String(error),
      });
    }
  }

  /**
   * Processes one workflow step for EDCS library ingestion.
   */
  private async processSourceChunkPhase(
    chunkFiles: string[],
    sourceDataDirectory: string,
  ): Promise<Map<string, string[]>> {
    const provinceData = new Map<string, string[]>();
    for (let index = 0; index < chunkFiles.length; index++) {
      const file = chunkFiles[index];
      if (!file) continue;
      await this.processSourceChunkFile({
        file,
        index,
        provinceData,
        sourceDataDirectory,
        total: chunkFiles.length,
      });
    }
    return provinceData;
  }

  /**
   * Loads source data required by EDCS library ingestion.
   */
  private async readSourceChunkFiles(
    sourceDataDirectory: string,
  ): Promise<null | string[]> {
    try {
      const files = await fs.readdir(sourceDataDirectory);
      return files.filter((file) => file.endsWith(".json"));
    } catch {
      this.logger.error(
        "📁 Failed reading the source directory. Did you run the epigraphik-datenbank-clauss-slaby command first?",
        undefined,
        { sourceDataDirectory },
      );
      return null;
    }
  }

  /**
   * Persists generated output for EDCS library ingestion.
   */
  private async saveEdcsChunkFile(args: {
    authorSlug: string;
    bookDirectory: string;
    bookSlug: string;
    bookText: Text;
    chunk: string[];
    title: string;
    titleSlug: string;
  }): Promise<void> {
    const {
      authorSlug,
      bookDirectory,
      bookSlug,
      bookText,
      chunk,
      title,
      titleSlug,
    } = args;
    const textEntity = new Text();
    textEntity.type = "text";
    textEntity.title = title;
    textEntity.slug = titleSlug;
    textEntity.metadata = { sourceUrl: `${bookSlug}/${titleSlug}.md` };
    bookText.childTexts.push(textEntity);
    const frontmatterObject = {
      author: authorSlug,
      text_metadata: { source_url: "https://db.edcs.eu" },
      title,
      type: "text",
    };
    let markdown = `---\n${YAML.stringify(frontmatterObject)}---\n\n`;
    markdown += `# ${title}\n\n`;
    markdown += `${chunk.join("\n\n")}\n`;
    await fs.writeFile(
      path.join(bookDirectory, `${titleSlug}.md`),
      markdown,
      "utf8",
    );
  }

  /**
   * Persists generated output for EDCS library ingestion.
   */
  private async saveEdcsProvince(args: {
    author: Author;
    authorDirectory: string;
    authorSlug: string;
    booksMap: Map<string, Text>;
    inscriptions: string[];
    options: undefined | { text?: string };
    province: string;
  }): Promise<void> {
    const {
      author,
      authorDirectory,
      authorSlug,
      booksMap,
      inscriptions,
      options,
      province,
    } = args;
    this.logger.info("🌍 Starting province", undefined, { province });
    const bookSlug = _.kebabCase(province);
    const bookDirectory = path.join(authorDirectory, bookSlug);
    await fs.mkdir(bookDirectory, { recursive: true });
    const bookText = this.getOrCreateBookText({
      author,
      bookSlug,
      booksMap,
      province,
    });
    const chunkSize = 1000;
    for (let index = 0; index < inscriptions.length; index += chunkSize) {
      const chunk = inscriptions.slice(index, index + chunkSize);
      const title = `${province} Part ${Math.floor(index / chunkSize) + 1}`;
      const titleSlug = _.kebabCase(title);
      const textSlug = `${authorSlug}/${bookSlug}/${titleSlug}`;
      if (options?.text && textSlug !== options.text) continue;
      await this.saveEdcsChunkFile({
        authorSlug,
        bookDirectory,
        bookSlug,
        bookText,
        chunk,
        title,
        titleSlug,
      });
    }
    this.logger.info("🌍 Completed province", undefined, { province });
  }

  /**
   * Persists generated output for EDCS library ingestion.
   */
  private async saveEdcsProvincePhase(args: {
    author: Author;
    authorDirectory: string;
    authorSlug: string;
    options: undefined | { text?: string };
    provinceData: Map<string, string[]>;
  }): Promise<void> {
    const { author, authorDirectory, authorSlug, options, provinceData } = args;
    const booksMap = new Map<string, Text>();
    const provinceEntries = [...provinceData.entries()];
    const totalProvinces = provinceEntries.length;
    let currentProvince = 0;
    for (const [province, inscriptions] of provinceEntries) {
      await this.saveEdcsProvince({
        author,
        authorDirectory,
        authorSlug,
        booksMap,
        inscriptions,
        options,
        province,
      });
      currentProvince++;
      this.logger.info("🌍 Completed province", undefined, {
        current: currentProvince,
        percent: Number(((currentProvince / totalProvinces) * 100).toFixed(2)),
        province,
        total: totalProvinces,
      });
    }
  }

  // 🌎 Public Methods

  /**
   * Parse inscriptions from Epigraphik-Datenbank Clauss-Slaby JSON files and group them by province.
   */
  async ingest(options?: {
    author?: string;
    text?: string;
  }): Promise<Author[]> {
    const host = "https://edcs.hist.uzh.ch/api/query";
    this.logger.info(
      "🗂️ Ingesting Epigraphik-Datenbank Clauss-Slaby from local data",
    );
    const dataPath = path.resolve("data", "library", this.name);
    const authorSlug = "epigraphik-datenbank-clauss-slaby";
    if (options?.author && authorSlug !== options.author) return [];
    const authorDirectory = path.join(dataPath, authorSlug);
    await fs.mkdir(authorDirectory, { recursive: true });
    const author = this.createSourceAuthor(authorSlug, host);
    const sourceDataDirectory = path.resolve(
      "data",
      "epigraphik-datenbank-clauss-slaby-source",
    );
    this.logger.info(
      "🗂️ Reading Epigraphik-Datenbank Clauss-Slaby chunks",
      undefined,
      { sourceDataDirectory },
    );
    const chunkFiles = await this.readSourceChunkFiles(sourceDataDirectory);
    if (!chunkFiles) return [];
    const provinceData = await this.processSourceChunkPhase(
      chunkFiles,
      sourceDataDirectory,
    );
    await this.saveEdcsProvincePhase({
      author,
      authorDirectory,
      authorSlug,
      options,
      provinceData,
    });
    return [author];
  }
}
