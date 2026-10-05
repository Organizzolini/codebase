import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import numberToWords from "number-to-words";
import { Repository } from "typeorm";

import { Lexeme, Translation } from "@codebase/lexico-entities";
import { LoggerService } from "@codebase/logging";

import { NumeralsService } from "../numerals/numerals.service";
import { WordsService } from "../words/words.service";

import {
  MANUAL_LEXEMES_TO_DELETE,
  PRAENOMEN_ABBREVIATIONS,
} from "./manual.constants";
import {
  buildHicTemplate,
  buildIlleTemplate,
  buildOmnisTemplate,
  buildPraenomenAbbreviationTemplate,
  buildRomanNumeralTemplate,
} from "./manual.utilities";

import type { ManualPraenomenAbbreviation } from "./manual.types";

/**
 * Ingests manually-curated dictionary lexemes (hic, ille, omnis, Roman numerals).
 */
@Injectable()
export class ManualService {
  // 🏗 Dependency Injection

  constructor(
    @InjectRepository(Lexeme)
    private readonly lexemesRepository: Repository<Lexeme>,
    private readonly wordsService: WordsService,
    private readonly numeralsService: NumeralsService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(ManualService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Builds praenomen lexeme for manual lexeme ingestion.
   */
  private buildPraenomenLexeme(
    abbreviation: string,
    praenomen: ManualPraenomenAbbreviation,
  ): Lexeme {
    const lexeme = buildPraenomenAbbreviationTemplate();
    lexeme.lemma = abbreviation;
    if (lexeme.principalParts[0]) {
      lexeme.principalParts[0].text = [abbreviation];
    }
    if (lexeme.principalParts[1]) {
      lexeme.principalParts[1].text = [`${abbreviation}.`];
    }
    lexeme.translations = this.buildPraenomenTranslations(praenomen, lexeme);
    const inflection = lexeme.inflection;
    if (inflection && "gender" in inflection) {
      inflection.gender = this.resolvePraenomenGender(praenomen);
    }
    return lexeme;
  }

  /**
   * Builds praenomen translations for manual lexeme ingestion.
   */
  private buildPraenomenTranslations(
    praenomen: ManualPraenomenAbbreviation,
    lexeme: Lexeme,
  ): Translation[] {
    const translations: Translation[] = [];
    if (praenomen.masculine) {
      translations.push(
        new Translation(
          `Praenomen abbreviation: ${praenomen.masculine} (male)`,
          lexeme,
        ),
      );
    }
    if (praenomen.feminine) {
      translations.push(
        new Translation(
          `Praenomen abbreviation: ${praenomen.feminine} (female)`,
          lexeme,
        ),
      );
    }
    return translations;
  }

  /**
   * Ingests praenomen abbreviations in the manual lexeme ingestion pipeline.
   */
  private async ingestPraenomenAbbreviations(): Promise<void> {
    this.logger.info("🏷️ Ingesting praenomen abbreviations");
    const praenomenEntries = Object.entries(PRAENOMEN_ABBREVIATIONS);

    for (const [abbreviation, praenomen] of praenomenEntries) {
      await this.createManual(
        this.buildPraenomenLexeme(abbreviation, praenomen),
      );
    }
    this.logger.info("🏷️ Ingested praenomen abbreviations");
  }

  /**
   * Ingests roman numerals in the manual lexeme ingestion pipeline.
   */
  private async ingestRomanNumerals(): Promise<void> {
    this.logger.info("🔢 Ingesting Roman numerals");
    const total = 3999;
    for (let index = 1; index < 4000; index++) {
      const roman = this.numeralsService.toRoman(index).toLowerCase();
      const lexeme = buildRomanNumeralTemplate();
      lexeme.lemma = roman;
      if (lexeme.principalParts[0]) {
        lexeme.principalParts[0].text = [roman];
      }
      lexeme.translations = [
        new Translation(
          `Roman numeral: ${index} (${numberToWords.toWords(index)})`,
          lexeme,
        ),
      ];
      await this.createManual(lexeme);
      if (index % 500 === 0) {
        this.logger.debug("🔢 Ingesting Roman numerals", undefined, {
          current: index,
          total,
        });
      }
    }
    this.logger.info("🔢 Ingested Roman numerals");
  }

  /**
   * Resolves praenomen gender for manual lexeme ingestion.
   */
  private resolvePraenomenGender(praenomen: {
    feminine?: string;
    masculine?: string;
  }): string {
    if (praenomen.masculine && !praenomen.feminine) return "masculine";
    if (!praenomen.masculine && praenomen.feminine) return "feminine";
    return "neuter";
  }

  // 🌎 Public Methods

  /** Deletes any existing row with the same lemma and disambiguator then saves `manual` and
   * re-ingests its word search records. The save keeps TypeORM's reload on: the
   * cascaded forms need the lexeme's generated id for their `lexeme_id`. */
  async createManual(manual: Lexeme): Promise<void> {
    await this.deleteManual(manual.lemma, manual.disambiguator);
    this.logger.info("✏️ Creating lemma:disambiguator", undefined, {
      disambiguator: manual.disambiguator,
      lemma: manual.lemma,
    });
    const lexeme = await this.lexemesRepository.save(manual);
    await this.wordsService.ingestLexemeWords(lexeme);
    this.logger.info("✏️ Created lemma:disambiguator", undefined, {
      disambiguator: manual.disambiguator,
      lemma: manual.lemma,
    });
  }

  /** Removes the `Lexeme` row identified by `lemma` and `disambiguator` from the database. */
  async deleteManual(lemma: string, disambiguator: number): Promise<void> {
    this.logger.info("🗑️ Deleting lemma:disambiguator", undefined, {
      disambiguator,
      lemma,
    });
    await this.lexemesRepository.delete({ disambiguator, lemma });
    this.logger.info("🗑️ Deleted lemma:disambiguator", undefined, {
      disambiguator,
      lemma,
    });
  }

  /** Runs the full manual-lexeme pipeline: deletes stale overrides, re-creates
   * hic/ille/omnis lexemes, populates praenomen abbreviations, and ingests
   * Roman numeral lexemes I–MMMCMXCIX. */
  async ingestManual(): Promise<void> {
    this.logger.info("📋 Ingesting manual lexemes");

    for (const { disambiguator, lemma } of MANUAL_LEXEMES_TO_DELETE) {
      await this.deleteManual(lemma, disambiguator);
    }

    await this.createManual(buildHicTemplate());
    await this.createManual(buildIlleTemplate());
    await this.createManual(buildOmnisTemplate());

    await this.ingestPraenomenAbbreviations();
    await this.ingestRomanNumerals();

    this.logger.info("📋 Ingested manual lexemes");
  }
}
