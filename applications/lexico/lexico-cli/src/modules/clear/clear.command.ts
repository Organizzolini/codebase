import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Command, CommandRunner, Option } from "nest-commander";
import prompts from "prompts";
import { Repository } from "typeorm";

import {
  Author,
  Lexeme,
  Line,
  Text,
  Token,
  Translation,
  Word,
} from "@codebase/lexico-entities";
import { LoggerService } from "@codebase/logging";

import type { ClearCommandOptions, ClearPromptResponse } from "./clear.types";

/**
 * Clears dictionary and literature data from the database.
 */
@Command({
  description: "Run the clear command",
  name: "clear",
})
@Injectable()
export class ClearCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly logger: LoggerService,
    @InjectRepository(Lexeme)
    private readonly lexemesRepository: Repository<Lexeme>,
    @InjectRepository(Translation)
    private readonly translationsRepository: Repository<Translation>,
    @InjectRepository(Word)
    private readonly wordsRepository: Repository<Word>,
    @InjectRepository(Line)
    private readonly linesRepository: Repository<Line>,
    @InjectRepository(Text)
    private readonly textsRepository: Repository<Text>,
    @InjectRepository(Author)
    private readonly authorsRepository: Repository<Author>,
    @InjectRepository(Token)
    private readonly tokensRepository: Repository<Token>,
  ) {
    super();
    this.logger.setContext(ClearCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Deletes all `Word`, `Translation`, and `Lexeme` rows from the database
   * in dependency order to avoid foreign-key constraint violations. */
  private async clearDictionary(): Promise<void> {
    this.logger.log("🗑️ Clearing dictionary");
    this.logger.log("🧹 Deleting words");
    await this.wordsRepository.createQueryBuilder().delete().execute();
    this.logger.log("🧹 Deleting translations");
    await this.translationsRepository.createQueryBuilder().delete().execute();
    this.logger.log("🧹 Deleting lexemes");
    await this.lexemesRepository.createQueryBuilder().delete().execute();
    this.logger.log("✨ Cleared dictionary");
  }

  /** Deletes all literature data */
  private async clearLiterature(): Promise<void> {
    this.logger.log("🗑️ Clearing literature");
    this.logger.log("🧹 Deleting tokens");
    await this.tokensRepository.createQueryBuilder().delete().execute();
    this.logger.log("🧹 Deleting lines");
    await this.linesRepository.createQueryBuilder().delete().execute();
    this.logger.log("🧹 Deleting texts");
    await this.textsRepository.createQueryBuilder().delete().execute();
    this.logger.log("🧹 Deleting authors");
    await this.authorsRepository.createQueryBuilder().delete().execute();
    this.logger.log("✨ Cleared literature");
  }

  /**
   * Parses prompt output into strongly typed clear options.
   */
  private parsePromptResponse(response: unknown): ClearPromptResponse {
    if (
      typeof response !== "object" ||
      response === null ||
      Array.isArray(response)
    ) {
      return {};
    }

    const parsedResponse: ClearPromptResponse = {};
    const dictionaryValue =
      "dictionary" in response ? response.dictionary : undefined;
    const literatureValue =
      "literature" in response ? response.literature : undefined;

    if (typeof dictionaryValue === "boolean") {
      parsedResponse.dictionary = dictionaryValue;
    }

    if (typeof literatureValue === "boolean") {
      parsedResponse.literature = literatureValue;
    }

    return parsedResponse;
  }

  // 🌎 Public Methods

  /** Parses the `--dictionary` flag; returns true/false. */
  @Option({
    description: "Clear all dictionary entries, translations, and words",
    flags: "--dictionary [boolean]",
  })
  parseDictionary(value: string | undefined): boolean {
    if (value === undefined) return true;
    return value !== "false" && value !== "0";
  }

  /** Parses the `--literature` flag; returns true/false. */
  @Option({
    description: "Clear all literature entries (authors, books, texts, lines)",
    flags: "--literature [boolean]",
  })
  parseLiterature(value: string | undefined): boolean {
    if (value === undefined) return true;
    return value !== "false" && value !== "0";
  }

  /** Runs the clear pipeline for the options provided. If no options are
   * specified, it prompts the user. */
  async run(
    _passedParameters: string[],
    options: ClearCommandOptions,
  ): Promise<void> {
    if (options.dictionary === undefined && options.literature === undefined) {
      const response: unknown = await prompts([
        {
          initial: true,
          message: "Clear dictionary entries?",
          name: "dictionary",
          type: "confirm",
        },
        {
          initial: true,
          message: "Clear literature entries?",
          name: "literature",
          type: "confirm",
        },
      ]);
      const parsedResponse = this.parsePromptResponse(response);
      options.dictionary = parsedResponse.dictionary === true;
      options.literature = parsedResponse.literature === true;
    }

    this.logger.log("🧹 Running clear command");
    this.logger.log(`⚙️ Parsed command options`, undefined, { options });

    if (options.literature) {
      await this.clearLiterature();
    }
    if (options.dictionary) {
      await this.clearDictionary();
    }
  }
}
