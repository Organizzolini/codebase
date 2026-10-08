import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import * as cheerio from "cheerio";
import { Repository } from "typeorm";

import { Lexeme } from "@codebase/lexico-entities";
import { LoggerService } from "@codebase/logging";

import { EtymologyService } from "../etymology/etymology.service";
import { FormsBuilderService } from "../forms/forms-builder.service";
import { FormsService } from "../forms/forms.service";
import { LEXICO_INGESTION_BY_ID } from "../lexico-ingestion/lexico-ingestion.constants";
import { PartOfSpeechService } from "../part-of-speech/part-of-speech.service";
import { PrincipalPartsService } from "../principal-parts/principal-parts.service";
import { PronunciationService } from "../pronunciation/pronunciation.service";
import { TranslationsService } from "../translations/translations.service";
import { WordsService } from "../words/words.service";

import { skipPOS, validPOS } from "./lexemes.constants";

import type { WiktionaryPage } from "../lexico-ingestion/lexico-ingestion.types";
import type { PartOfSpeech } from "@codebase/lexico-entities";
import type { AnyNode } from "domhandler";

/**
 * Coordinates conversion of Wiktionary headword sections into persisted `Lexeme`
 * graphs, delegating specialized parsing to domain services.
 */
@Injectable()
export class LexemesService {
  // 🏗 Dependency Injection

  constructor(
    @InjectRepository(Lexeme)
    private readonly lexemeRepository: Repository<Lexeme>,
    private readonly logger: LoggerService,
    private readonly etymologyService: EtymologyService,
    private readonly formsBuilderService: FormsBuilderService,
    private readonly formsService: FormsService,
    private readonly partOfSpeechService: PartOfSpeechService,
    private readonly principalPartsService: PrincipalPartsService,
    private readonly pronunciationService: PronunciationService,
    private readonly translationsService: TranslationsService,
    private readonly wordsService: WordsService,
  ) {
    this.logger.setContext(LexemesService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Builds structured data used during lexeme parsing and persistence.
   */
  private buildLexeme(
    word: string,
    index: number,
    partOfSpeech: PartOfSpeech,
  ): Lexeme {
    const lexeme = new Lexeme();
    lexeme.lemma = this.normalize(word);
    lexeme.disambiguator = index;
    lexeme.partOfSpeech = partOfSpeech;
    return lexeme;
  }

  /**
   * Handles an internal workflow step for lexeme parsing and persistence.
   */
  private async enrichLexeme(args: {
    $: cheerio.CheerioAPI;
    elt: AnyNode;
    firstPrincipalPartName: string;
    lexeme: Lexeme;
    partOfSpeech: PartOfSpeech;
  }): Promise<void> {
    const { $, elt, firstPrincipalPartName, lexeme, partOfSpeech } = args;
    const { macronizedWord, principalParts } =
      this.principalPartsService.parsePrincipalParts({
        $,
        elt,
        firstPrincipalPartName,
        lexeme,
      });
    lexeme.principalParts = principalParts;

    lexeme.inflection = this.partOfSpeechService.ingestInflection({
      $,
      elt,
      pos: partOfSpeech,
      principalParts,
    });

    const translations = this.translationsService.parseTranslations(
      $,
      elt,
      lexeme,
    );
    const { etymology, participleTranslation } = this.etymologyService.parse(
      $,
      elt,
      lexeme,
    );
    lexeme.etymology = etymology;
    lexeme.translations = participleTranslation
      ? [...translations, participleTranslation]
      : translations;

    lexeme.pronunciations = this.pronunciationService.parse(
      $,
      elt,
      macronizedWord,
    );

    const rawForms = await this.partOfSpeechService.parseForms({
      $,
      elt,
      lexeme,
      pos: partOfSpeech,
      principalParts,
    });
    lexeme.forms = this.formsBuilderService.buildFormsForPartOfSpeech(
      partOfSpeech,
      rawForms,
      lexeme,
    );
  }

  /**
   * Parses and normalizes inputs for lexeme parsing and persistence.
   */
  private normalize(str: string): string {
    return str
      .normalize("NFD")
      .replaceAll(/[\u0300-\u036F]/gu, "")
      .toLowerCase()
      .trim();
  }

  /**
   * Parses and normalizes inputs for lexeme parsing and persistence.
   */
  private async parseLexemeFromElement(args: {
    $: cheerio.CheerioAPI;
    elt: AnyNode;
    index: number;
    word: string;
  }): Promise<Lexeme | null> {
    const { $, elt, index, word } = args;
    const partOfSpeech = this.partOfSpeechService.getPartOfSpeech($, elt);

    if (!validPOS.has(partOfSpeech)) {
      if (!skipPOS.has(partOfSpeech)) {
        this.logger.debug("🏷️ Skipping unsupported part of speech", undefined, {
          partOfSpeech,
          word,
        });
      }
      return null;
    }

    const firstPrincipalPartName =
      this.partOfSpeechService.getFirstPrincipalPartName(partOfSpeech);
    if (firstPrincipalPartName === undefined) {
      this.logger.debug(
        "🏷️ Skipping word without a principal-part name",
        undefined,
        { partOfSpeech, word },
      );
      return null;
    }

    const lexeme = this.buildLexeme(word, index, partOfSpeech);

    try {
      await this.enrichLexeme({
        $,
        elt,
        firstPrincipalPartName,
        lexeme,
        partOfSpeech,
      });
      return lexeme;
    } catch (error) {
      this.logger.warn("🧩 Failed parsing lexeme", undefined, {
        disambiguator: lexeme.disambiguator,
        lemma: lexeme.lemma,
        reason: String(error),
      });
      return null;
    }
  }

  // 🌎 Public Methods

  /**
   * Persists generated output for lexeme parsing and persistence.
   */
  private async saveInflection(
    lexeme: Lexeme,
    savedLexeme: Lexeme,
  ): Promise<void> {
    if (!lexeme.inflection) return;
    if (savedLexeme.inflection) {
      lexeme.inflection.id = savedLexeme.inflection.id;
    }
    lexeme.inflection.lexeme = savedLexeme;
    await lexeme.inflection.save();
    savedLexeme.inflection = lexeme.inflection;
  }

  /**
   * Persists generated output for lexeme parsing and persistence.
   */
  private async saveLexemeRelations(
    lexeme: Lexeme,
    savedLexeme: Lexeme,
  ): Promise<void> {
    await this.saveInflection(lexeme, savedLexeme);

    await this.principalPartsService.ingestLexemePrincipalParts(
      savedLexeme,
      lexeme.principalParts,
    );

    if (lexeme.pronunciations !== undefined && lexeme.pronunciations !== null) {
      await this.pronunciationService.ingestLexemePronunciations(
        savedLexeme,
        lexeme.pronunciations,
      );
    }

    await this.saveTranslations(lexeme, savedLexeme);

    if (lexeme.forms.length > 0) {
      await this.formsService.ingestLexemeForms(lexeme.forms, savedLexeme);
    }

    await this.wordsService.ingestLexemeWords(savedLexeme);
  }

  /**
   * Persists generated output for lexeme parsing and persistence.
   */
  private async saveTranslations(
    lexeme: Lexeme,
    savedLexeme: Lexeme,
  ): Promise<void> {
    if (lexeme.translations !== undefined && lexeme.translations !== null) {
      const preparedTranslations =
        this.translationsService.prepareTranslationsForSave(
          savedLexeme,
          lexeme.translations,
        );
      savedLexeme.translations = preparedTranslations;
      await this.lexemeRepository.save(savedLexeme);
    }
  }

  /**
   * Returns whether at least one lexeme row already exists for the normalized lemma.
   */
  async existsByLemma(lemma: string): Promise<boolean> {
    const count = await this.lexemeRepository
      .createQueryBuilder("lexeme")
      .where("lexeme.lemma = :lemma", { lemma })
      .getCount();
    return count > 0;
  }

  /**
   * Reloads a saved lexeme by `(lemma, disambiguator)` with all related ingestion entities.
   */
  async fetchSavedLexeme(
    lemma: string,
    disambiguator: number,
  ): Promise<Lexeme | null> {
    return this.lexemeRepository.findOne({
      relations: {
        inflection: true,
        principalParts: true,
        pronunciations: true,
        translations: true,
      },
      where: { disambiguator, lemma },
    });
  }

  /**
   * Finds all lexeme variants for a lemma and eagerly loads translation rows.
   */
  async findLexemesByLemmaWithTranslations(lemma: string): Promise<Lexeme[]> {
    return this.lexemeRepository
      .createQueryBuilder("lexeme")
      .leftJoinAndSelect("lexeme.translations", "translations")
      .where("lexeme.lemma = :lemma", { lemma })
      .getMany();
  }

  /**
   * Parses one Wiktionary page into lexemes by iterating `p:has(strong.Latn.headword)`
   * sections and enriching each accepted part of speech.
   */
  async parseLexemes(wiktionaryPage: WiktionaryPage): Promise<Lexeme[]> {
    if (!wiktionaryPage.html) return [];

    const $ = cheerio.load(wiktionaryPage.html);
    const word = this.normalize(wiktionaryPage.word);
    const lexemes: Lexeme[] = [];

    const headwordElements = $("p:has(strong.Latn.headword)").toArray();

    if (headwordElements.length === 0) {
      this.logger.warn("🔤 Missing headwords for word", undefined, {
        word: wiktionaryPage.word,
      });
      return [];
    }

    for (const [index, elt] of headwordElements.entries()) {
      const lexeme = await this.parseLexemeFromElement({ $, elt, index, word });
      if (lexeme) lexemes.push(lexeme);
    }

    return lexemes;
  }

  /**
   * Upserts a parsed lexeme row, then persists related inflection, forms, pronunciations,
   * principal parts, translations, and derived words.
   */
  async saveParsedLexeme(lexeme: Lexeme): Promise<Lexeme | null> {
    await this.upsertLexeme(lexeme);
    const savedLexeme = await this.fetchSavedLexeme(
      lexeme.lemma,
      lexeme.disambiguator,
    );
    if (!savedLexeme) return null;

    await this.saveLexemeRelations(lexeme, savedLexeme);

    this.logger.debug("🔑 Upserted lexeme", undefined, {
      disambiguator: lexeme.disambiguator,
      lemma: lexeme.lemma,
    });
    return savedLexeme;
  }

  /**
   * Writes the base lexeme row with ingestion attribution metadata.
   */
  async upsertLexeme(lexeme: Lexeme): Promise<void> {
    lexeme.createdBy = LEXICO_INGESTION_BY_ID;
    lexeme.updatedBy = LEXICO_INGESTION_BY_ID;
    await this.lexemeRepository.upsert(lexeme, {
      conflictPaths: ["lemma", "disambiguator"],
      skipUpdateIfNoValuesChanged: true,
    });
  }
}
