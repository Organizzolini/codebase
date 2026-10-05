import fs from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import { Lexeme, Translation } from "@codebase/lexico-entities";
import { LoggerService } from "@codebase/logging";

import { LexemesService } from "../lexemes/lexemes.service";
import {
  getOptionText,
  requireChoice,
  selectChoice,
} from "../lexico-ingestion/lexico-ingestion.utilities";
import { ManualService } from "../manual/manual.service";
import { TranslationsService } from "../translations/translations.service";

import type {
  CommandOptionChoice,
  CommandOptionValue,
  WiktionaryPage,
} from "../lexico-ingestion/lexico-ingestion.types";
import type { DictionaryCommandOptions } from "./dictionary.types";

/**
 * Ingests cached Wiktionary pages into lexemes, resolves cross-translation references,
 * and applies manual dictionary corrections.
 */
@Command({
  description: "Run the dictionary command",
  name: "dictionary",
})
@Injectable()
export class DictionaryCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly logger: LoggerService,
    private readonly lexemesService: LexemesService,
    private readonly translationsService: TranslationsService,
    private readonly manualService: ManualService,
  ) {
    super();
    this.logger.setContext(DictionaryCommand.name);

    const outputDirectory = path.join(process.cwd(), "output");
    if (!fs.existsSync(outputDirectory))
      fs.mkdirSync(outputDirectory, { recursive: true });
    this.errorLogFilePath = path.join(
      outputDirectory,
      `dictionary-${new Date().toISOString().replaceAll(/[:.]/g, "-")}.log`,
    );
  }

  // 🔐 Private Fields

  private readonly dataDirectory = path.join(
    process.cwd(),
    "./data/wiktionary",
  );
  private readonly errorLogFilePath: string;
  private fileIndex: Map<string, string> | null = null;
  private readonly inProgressWords = new Set<string>();

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Parses and normalizes inputs for dictionary ingestion.
   */
  private escapeCapitals(word: string): string {
    return word.replaceAll(
      /[A-Z]/g,
      (character) => `_${character.toLowerCase()}`,
    );
  }

  /**
   * Resolves derived values needed by dictionary ingestion.
   */
  private getLemmaChoices(): CommandOptionChoice[] {
    const dataDirectory = path.join(process.cwd(), "./data/wiktionary");
    if (!fs.existsSync(dataDirectory)) return [];

    return fs
      .readdirSync(dataDirectory)
      .filter((file) => file.endsWith(".json"))
      .map((file) => {
        const title = file.replace(".json", "");
        return { title, value: title };
      });
  }

  /**
   * Resolves derived values needed by dictionary ingestion.
   */
  private getLemmaFileRange(
    files: string[],
    startLemma?: string,
    endLemma?: string,
  ): string[] {
    if (!startLemma && !endLemma) return files;

    const startIndex = startLemma
      ? files.findIndex((f) => f.replace(".json", "") === startLemma)
      : 0;
    const endIndex = endLemma
      ? files.findIndex((f) => f.replace(".json", "") === endLemma)
      : files.length - 1;

    const start = Math.max(0, startIndex);
    const end = endIndex === -1 ? files.length - 1 : endIndex;

    return files.slice(start, end + 1);
  }

  /**
   * Resolves derived values needed by dictionary ingestion.
   */
  private getPageForLexeme(
    word: string,
    wiktionaryPage?: WiktionaryPage,
  ): WiktionaryPage {
    if (wiktionaryPage) return wiktionaryPage;

    const page = this.loadWiktionaryPageForWord(word);
    if (!page) {
      throw new Error(`File missing or unreadable for word: ${word}`);
    }
    return page;
  }

  /**
   * Resolves derived values needed by dictionary ingestion.
   */
  private getWiktionaryFilePathForWord(word: string): null | string {
    const fileWord = word.normalize("NFD").replaceAll(/[\u0300-\u036F]/gu, "");

    // Exact match
    const p = path.join(
      this.dataDirectory,
      `${this.escapeCapitals(fileWord)}.json`,
    );
    if (fs.existsSync(p)) return p;

    // Build the case-insensitive index on first miss
    if (this.fileIndex === null) {
      this.fileIndex = new Map();
      if (fs.existsSync(this.dataDirectory)) {
        for (const file of fs.readdirSync(this.dataDirectory)) {
          if (!file.endsWith(".json")) continue;
          // Reverse escapeCapitals: Remove all '_' and lowercase the string
          const normalized = file.replaceAll("_", "").toLowerCase();
          this.fileIndex.set(normalized, file);
        }
      }
    }

    const fallbackFileName = this.fileIndex.get(
      `${fileWord.toLowerCase()}.json`,
    );
    if (fallbackFileName) {
      return path.join(this.dataDirectory, fallbackFileName);
    }

    return null;
  }

  /**
   * Handles an internal workflow step for dictionary ingestion.
   */
  private async ingestTranslationReference(
    translation: Translation,
  ): Promise<void> {
    const matches = [...translation.data.matchAll(/\{\*(.+?)\*\}/g)];
    if (matches.length === 0) {
      this.logger.warn(`🔗 Missing reference in translation`, undefined, {
        translation: translation.data,
      });
      return;
    }

    const newTranslations: Translation[] = [];

    for (const match of matches) {
      await this.processTranslationMatch(match, translation, newTranslations);
    }

    if (newTranslations.length > 0) {
      await this.translationsService.saveTranslations(newTranslations);
    }

    translation.data = translation.data.replaceAll(/\{\*(.+?)\*\}/g, "").trim();
    await this.translationsService.saveTranslations([translation]);
  }

  /**
   * Loads source data required by dictionary ingestion.
   */
  private loadWiktionaryPageForWord(word: string): null | WiktionaryPage {
    const filePath = this.getWiktionaryFilePathForWord(word);
    if (!filePath) {
      this.logger.warn("📄 Missing data file for word", undefined, { word });
      return null;
    }
    const page = this.readWiktionaryPageFromFile(filePath);
    if (!page) {
      this.logger.warn("📄 Missing data file for word", undefined, { word });
      return null;
    }
    return page;
  }

  /**
   * Parses and normalizes inputs for dictionary ingestion.
   */
  private normalize(str: string): string {
    return str
      .normalize("NFD")
      .replaceAll(/[\u0300-\u036F]/gu, "")
      .toLowerCase()
      .trim();
  }

  /**
   * Processes one workflow step for dictionary ingestion.
   */
  private async processFile(
    file: string,
    current: number,
    total: number,
  ): Promise<void> {
    try {
      const filePath = path.join(this.dataDirectory, file);
      const wiktionaryPage = this.readWiktionaryPageFromFile(filePath);
      if (!wiktionaryPage) {
        throw new Error("File missing or unreadable");
      }
      await this.ingestLexeme(wiktionaryPage.word, wiktionaryPage, {
        current,
        total,
      });
    } catch (error: unknown) {
      const { logLine } = this.logger.buildErrorLogEntry(file, error);
      this.logger.error("📄 Failed processing file", undefined, { file });
      fs.appendFileSync(this.errorLogFilePath, logLine);
    }
  }

  /**
   * Processes one workflow step for dictionary ingestion.
   */
  private async processTranslationMatch(
    match: RegExpMatchArray,
    translation: Translation,
    newTranslations: Translation[],
  ): Promise<void> {
    let reference = match[1] ?? "";
    if (/\(.*\)/.test(reference)) reference = reference.replace(/ ?\(.*\)/, "");

    const lexemes =
      await this.lexemesService.findLexemesByLemmaWithTranslations(
        this.normalize(reference),
      );

    const lexeme =
      lexemes.find(
        (lexemeEntry) =>
          lexemeEntry.partOfSpeech === translation.lexeme.partOfSpeech,
      ) ?? lexemes[0];

    if (!lexeme) {
      this.logger.warn("🔑 Missing lexeme for reference", undefined, {
        reference,
      });
      return;
    }

    const mapped = (lexeme.translations ?? []).map(
      (t) => new Translation(t.data, translation.lexeme),
    );
    newTranslations.push(...mapped);
  }

  /**
   * Processes one workflow step for dictionary ingestion.
   */
  private async processTranslationReferences(saved: Lexeme): Promise<void> {
    const referencedWords =
      this.translationsService.extractTranslationReferences(
        saved.translations ?? [],
      );
    for (const referenceWord of referencedWords) {
      if (!this.inProgressWords.has(referenceWord)) {
        const referenceExists =
          await this.lexemesService.existsByLemma(referenceWord);
        if (!referenceExists) {
          await this.ingestLexeme(referenceWord);
        }
      }
    }

    const translations =
      await this.translationsService.findTranslationsWithReferences(saved.id);
    for (const translation of translations) {
      await this.ingestTranslationReference(translation);
    }
  }

  /**
   * Loads source data required by dictionary ingestion.
   */
  private readWiktionaryPageFromFile(filePath: string): null | WiktionaryPage {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw) as WiktionaryPage;
  }

  // 🌎 Public Methods

  /**
   * Resolves the optional end-lemma bound: a given lemma must be a cached page at
   * or after `startLemma`, a bare flag prompts on a terminal, and anything else is
   * no bound.
   */
  private async resolveEndLemma(
    endLemma: CommandOptionValue,
    startLemma: string | undefined,
  ): Promise<string | undefined> {
    const choices = this.getLemmaChoices().filter(
      (choice) => !startLemma || choice.value >= startLemma,
    );
    const text = getOptionText(endLemma);
    if (text) {
      return requireChoice(
        text,
        choices,
        `End lemma "${text}" not found in the dataset.`,
      );
    }
    if (endLemma !== true) return undefined;

    return selectChoice({
      choices,
      message: "Select the ending lemma",
      noSelectionTitle: "None",
    });
  }

  /**
   * Resolves the optional start-lemma bound: a given lemma must be a cached page,
   * a bare flag prompts on a terminal, and anything else is no bound.
   */
  private async resolveStartLemma(
    startLemma: CommandOptionValue,
  ): Promise<string | undefined> {
    const choices = this.getLemmaChoices();
    const text = getOptionText(startLemma);
    if (text) {
      return requireChoice(
        text,
        choices,
        `Start lemma "${text}" not found in the dataset.`,
      );
    }
    if (startLemma !== true) return undefined;

    return selectChoice({
      choices,
      message: "Select the starting lemma",
      noSelectionTitle: "None",
    });
  }

  /**
   * Iterates cached `data/wiktionary/*.json` pages within an optional lemma range
   * and ingests each file into persisted lexeme data.
   */
  async ingestAll(startLemma?: string, endLemma?: string): Promise<void> {
    if (!fs.existsSync(this.dataDirectory)) {
      this.logger.warn("📁 Missing data directory", undefined, {
        dataDirectory: this.dataDirectory,
        hint: "Run the Wikipedia dump extraction first",
      });
      return;
    }

    const allFiles = fs
      .readdirSync(this.dataDirectory)
      .filter((fileName) => fileName.endsWith(".json"));

    const files = this.getLemmaFileRange(allFiles, startLemma, endLemma);

    this.logger.info("📖 Processing lexemes", undefined, {
      count: files.length,
    });

    let current = 0;
    const total = files.length;

    for (const file of files) {
      current++;
      await this.processFile(file, current, total);
    }

    this.logger.info("📖 Ingested dictionary");
  }

  /**
   * Ingests one lemma by parsing its Wiktionary HTML into lexemes, saving relations,
   * and recursively resolving `*reference*` translations.
   */
  async ingestLexeme(
    word: string,
    wiktionaryPage?: WiktionaryPage,
    progress?: { current: number; total: number },
  ): Promise<void> {
    this.inProgressWords.add(word);
    try {
      const page = this.getPageForLexeme(word, wiktionaryPage);

      if (!page.html) {
        throw new Error(`Missing HTML data in file for word: ${word}`);
      }

      const progressData = progress
        ? {
            current: progress.current,
            percent: Number(
              ((progress.current / progress.total) * 100).toFixed(2),
            ),
            total: progress.total,
          }
        : {};

      this.logger.info("📝 Ingesting lexeme", undefined, {
        word,
        ...progressData,
      });
      const parsedLexemes = await this.lexemesService.parseLexemes(page);
      for (const lexeme of parsedLexemes) {
        const saved = await this.lexemesService.saveParsedLexeme(lexeme);
        if (!saved) continue;

        await this.processTranslationReferences(saved);
      }
      this.logger.info("📝 Ingested lexeme", undefined, {
        word,
        ...progressData,
      });
    } finally {
      this.inProgressWords.delete(word);
    }
  }

  /**
   * Passes the `--endLemma` text through to `run`, which validates it; commander
   * never calls this for a bare flag, which reaches `run` as `true` instead.
   */
  @Option({
    description: "The lemma to end ingestion at (bare flag: pick one)",
    flags: "-e, --endLemma [lemma]",
  })
  parseEndLemma(endLemma: string): string {
    return endLemma;
  }

  /**
   * Passes the `--startLemma` text through to `run`, which validates it; commander
   * never calls this for a bare flag, which reaches `run` as `true` instead.
   */
  @Option({
    description: "The lemma to start ingestion from (bare flag: pick one)",
    flags: "-s, --startLemma [lemma]",
  })
  parseStartLemma(startLemma: string): string {
    return startLemma;
  }

  /**
   * Runs full dictionary ingestion for the selected lemma range, then applies manual entries.
   */
  async run(
    _arguments: string[],
    options: DictionaryCommandOptions,
  ): Promise<void> {
    this.logger.info("📖 Ingesting dictionary");
    this.logger.info("⚙️ Parsed command options", undefined, { options });
    const startTime = performance.now();

    const startLemma = await this.resolveStartLemma(options.startLemma);
    const endLemma = await this.resolveEndLemma(options.endLemma, startLemma);

    await this.ingestAll(startLemma, endLemma);
    await this.manualService.ingestManual();

    const endTime = performance.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    this.logger.info("📖 Ingested dictionary", undefined, {
      durationSeconds: duration,
    });
  }
}
