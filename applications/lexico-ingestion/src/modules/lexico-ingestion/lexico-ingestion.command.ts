import { Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";
import prompts from "prompts";

import { LoggerService } from "@codebase/logging";

import { CorpusScriptorumEcclesiasticorumLatinorumCommand } from "../corpus-scriptorum-ecclesiasticorum-latinorum/corpus-scriptorum-ecclesiasticorum-latinorum.command";
import { DictionaryCommand } from "../dictionary/dictionary.command";
import { EpigraphikDatenbankClaussSlabyCommand } from "../epigraphik-datenbank-clauss-slaby/epigraphik-datenbank-clauss-slaby.command";
import { LatinLibraryCommand } from "../latin-library/latin-library.command";
import { LibraryCommand } from "../library/library.command";
import { LiteratureCommand } from "../literature/literature.command";
import { PerseusCommand } from "../perseus/perseus.command";
import { WiktionaryCommand } from "../wiktionary/wiktionary.command";

import type { LexicoIngestionCommandOptions } from "./lexico-ingestion.types";

/**
 * Root CLI pipeline command that prompts for missing stage flags and runs the
 * selected ingestion stages in sequence.
 */
@Command({
  description: "Run the lexico-ingestion command",
  name: "lexico-ingestion",
})
@Injectable()
export class LexicoIngestionCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly logger: LoggerService,
    private readonly corpusScriptorumEcclesiasticorumLatinorumCommand: CorpusScriptorumEcclesiasticorumLatinorumCommand,
    private readonly dictionaryCommand: DictionaryCommand,
    private readonly epigraphikDatenbankClaussSlabyCommand: EpigraphikDatenbankClaussSlabyCommand,
    private readonly latinLibraryCommand: LatinLibraryCommand,
    private readonly libraryCommand: LibraryCommand,
    private readonly literatureCommand: LiteratureCommand,
    private readonly perseusCommand: PerseusCommand,
    private readonly wiktionaryCommand: WiktionaryCommand,
  ) {
    super();
    this.logger.setContext(LexicoIngestionCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Processes one workflow step for root ingestion pipeline execution.
   */
  private async executeStages(
    options: LexicoIngestionCommandOptions,
  ): Promise<void> {
    let step = 1;

    if (options.wikipedia) {
      this.logger.info("🌐 Ingesting Wikipedia (Wiktionary) pages", undefined, {
        step: step++,
      });
      await this.wiktionaryCommand.run();
    }

    if (options.dictionary) {
      this.logger.info("📖 Processing dictionary lexemes", undefined, {
        step: step++,
      });
      await this.dictionaryCommand.ingestAll();
    }

    if (options.librarySources) {
      this.logger.info("📥 Downloading library sources", undefined, {
        step: step++,
      });
      await this.runLibrarySourcesStage();
    }

    if (options.library) {
      this.logger.info("📝 Parsing library into markdown", undefined, {
        step: step++,
      });
      await this.libraryCommand.run([], {});
    }

    if (options.literature) {
      this.logger.info("📜 Ingesting literature texts", undefined, { step });
      await this.literatureCommand.run([], {});
    }
  }

  /**
   * Prompts for missing CLI options used by root ingestion pipeline execution.
   */
  private async promptForMissingOptions(
    options: LexicoIngestionCommandOptions,
  ): Promise<void> {
    options.wikipedia = await this.promptOption(
      options.wikipedia,
      "Run the Wikipedia (Wiktionary) stage?",
      "wikipedia",
    );
    options.dictionary = await this.promptOption(
      options.dictionary,
      "Run the dictionary stage?",
      "dictionary",
    );
    options.librarySources = await this.promptOption(
      options.librarySources,
      "Run the library sources stage?",
      "librarySources",
    );
    options.library = await this.promptOption(
      options.library,
      "Run the library stage?",
      "library",
    );
    options.literature = await this.promptOption(
      options.literature,
      "Run the literature stage?",
      "literature",
    );
  }

  // 🌎 Public Methods

  /**
   * Prompts for missing CLI options used by root ingestion pipeline execution.
   */
  private async promptOption(
    currentValue: boolean | undefined,
    message: string,
    name: string,
  ): Promise<boolean> {
    if (currentValue !== undefined) return currentValue;
    const response = await prompts({
      initial: true,
      message,
      name,
      type: "confirm",
    });
    return response[name] as boolean;
  }

  /**
   * Handles an internal workflow step for root ingestion pipeline execution.
   */
  private async runLibrarySourcesStage(): Promise<void> {
    await this.perseusCommand.run();
    await this.latinLibraryCommand.run();
    await this.corpusScriptorumEcclesiasticorumLatinorumCommand.run();
    await this.epigraphikDatenbankClaussSlabyCommand.run();
  }

  /**
   * Parses `--dictionary` as a boolean toggle (`false`/`0` disable the stage).
   */
  @Option({
    description: "Activate/deactivate the dictionary stage",
    flags: "--dictionary [boolean]",
  })
  parseDictionary(value: string | undefined): boolean {
    if (value === undefined) return true;
    return value !== "false" && value !== "0";
  }

  /**
   * Parses `--library` as a boolean toggle (`false`/`0` disable the stage).
   */
  @Option({
    description: "Activate/deactivate the library stage",
    flags: "--library [boolean]",
  })
  parseLibrary(value: string | undefined): boolean {
    if (value === undefined) return true;
    return value !== "false" && value !== "0";
  }

  /**
   * Parses `--library-sources` as a boolean toggle (`false`/`0` disable the stage).
   */
  @Option({
    description: "Activate/deactivate the library sources stage",
    flags: "--library-sources [boolean]",
  })
  parseLibrarySources(value: string | undefined): boolean {
    if (value === undefined) return true;
    return value !== "false" && value !== "0";
  }

  /**
   * Parses `--literature` as a boolean toggle (`false`/`0` disable the stage).
   */
  @Option({
    description: "Activate/deactivate the literature stage",
    flags: "--literature [boolean]",
  })
  parseLiterature(value: string | undefined): boolean {
    if (value === undefined) return true;
    return value !== "false" && value !== "0";
  }

  /**
   * Parses `--wikipedia` as a boolean toggle (`false`/`0` disable the stage).
   */
  @Option({
    description: "Activate/deactivate the Wikipedia (Wiktionary) stage",
    flags: "--wikipedia [boolean]",
  })
  parseWikipedia(value: string | undefined): boolean {
    if (value === undefined) return true;
    return value !== "false" && value !== "0";
  }

  /**
   * Executes the selected stage sequence after prompting for any unspecified toggles.
   */
  async run(
    _passedParameters: string[],
    options: LexicoIngestionCommandOptions,
  ): Promise<void> {
    await this.promptForMissingOptions(options);

    this.logger.info("🚀 Starting full ingestion pipeline");
    this.logger.info("⚙️ Parsed command options", undefined, { options });
    const startTime = performance.now();

    await this.executeStages(options);

    const endTime = performance.now();
    const durationSeconds = ((endTime - startTime) / 1000).toFixed(2);
    this.logger.info("🎉 Completed the full ingestion pipeline", undefined, {
      durationSeconds,
    });
  }
}
