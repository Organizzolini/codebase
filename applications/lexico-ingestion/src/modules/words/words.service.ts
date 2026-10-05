import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";

import {
  Form,
  Lexeme,
  Word,
  WordForm,
  WordLexeme,
} from "@codebase/lexico-entities";
import { LoggerService } from "@codebase/logging";

import { LEXICO_INGESTION_BY_ID } from "../lexico-ingestion/lexico-ingestion.constants";

/**
 * Ingests Word search records from all dictionary lexemes.
 */
@Injectable()
export class WordsService {
  // 🏗 Dependency Injection

  constructor(
    @InjectRepository(Word)
    private readonly wordsRepository: Repository<Word>,
    @InjectRepository(WordLexeme)
    private readonly wordLexemeRepository: Repository<WordLexeme>,
    @InjectRepository(WordForm)
    private readonly wordFormRepository: Repository<WordForm>,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(WordsService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Builds word form values for word indexing.
   */
  private buildWordFormValues(
    formsByWord: Map<string, Set<Form>>,
    wordMap: Map<string, Word>,
  ): Partial<WordForm>[] {
    const wordFormValues: Partial<WordForm>[] = [];
    for (const [normalized, formSet] of formsByWord) {
      const word = wordMap.get(normalized);
      if (!word) continue;
      for (const form of formSet) {
        wordFormValues.push({
          createdBy: LEXICO_INGESTION_BY_ID,
          form,
          updatedBy: LEXICO_INGESTION_BY_ID,
          word,
        });
      }
    }
    return wordFormValues;
  }

  /**
   * Escape capitals for word indexing.
   */
  private escapeCapitals(word: string): string {
    return word.replaceAll(
      /[A-Z]/g,
      (character) => `_${character.toLowerCase()}`,
    );
  }

  /**
   * Insert word form chunks for word indexing.
   */
  private async insertWordFormChunks(
    wordFormValues: Partial<WordForm>[],
  ): Promise<void> {
    if (wordFormValues.length === 0) return;
    const chunkSize = 1000;
    this.logger.debug("🧩 Inserting word form chunks", undefined, {
      chunkSize,
      totalValues: wordFormValues.length,
    });
    let chunksWritten = 0;
    for (let index = 0; index < wordFormValues.length; index += chunkSize) {
      const chunk = wordFormValues.slice(index, index + chunkSize);
      await this.wordFormRepository
        .createQueryBuilder()
        .insert()
        .into(WordForm)
        .values(chunk)
        .orIgnore()
        .execute();
      chunksWritten++;
    }
    this.logger.debug("🧩 Inserted word form chunks", undefined, {
      chunksWritten,
    });
  }

  /**
   * Normalizes input values used by word indexing.
   */
  private normalize(str: string): string {
    return str
      .normalize("NFD")
      .replaceAll(/[\u0300-\u036F]/gu, "")
      .toLowerCase()
      .trim();
  }

  // 🌎 Public Methods

  /** Returns all searchable word strings for a lexeme — the text of each
   * principal part. Form-based words are ingested separately via DictionaryService. */
  getLexemeWords(lexeme: Lexeme): string[] {
    const words: string[] = [];
    lexeme.principalParts.forEach((pp) => words.push(...pp.text));
    return words;
  }

  /** Generates and persists a `Word` row for every inflected form and
   * principal part that belongs to the given `Lexeme`.
   * Upserts rows in bulk and creates junction records to avoid N+1 queries. */
  async ingestLexemeWords(lexeme: Lexeme): Promise<void> {
    this.logger.info("🔤 Ingesting words for lexeme", undefined, {
      lexemeId: lexeme.id,
    });

    const wordStrings = this.getLexemeWords(lexeme);
    const normalizedWords = [
      ...new Set(
        wordStrings
          .map((w) => this.escapeCapitals(this.normalize(w)))
          .filter((w) => /^-?[A-Za-z]/.test(w)),
      ),
    ];

    if (normalizedWords.length > 0) {
      // Upsert all Word rows by their unique word strings.
      await this.wordsRepository.upsert(
        normalizedWords.map((word) => ({ data: word })),
        {
          conflictPaths: ["data"],
          skipUpdateIfNoValuesChanged: true,
        },
      );

      // Fetch the inserted words to get their IDs for the junction table
      const words = await this.wordsRepository.find({
        where: { data: In(normalizedWords) },
      });

      // Insert WordLexeme junction rows — ignore if the pair already exists.
      if (words.length > 0) {
        await this.wordLexemeRepository
          .createQueryBuilder()
          .insert()
          .into(WordLexeme)
          .values(words.map((word) => ({ lexeme, word })))
          .orIgnore()
          .execute();
      }
    }

    this.logger.info("🔤 Ingested words for lexeme", undefined, {
      lexemeId: lexeme.id,
    });
  }

  /** Upserts an array of normalized word strings into the `Word` table, then
   * ensures they are linked to the provided `Lexeme` via `WordLexeme` and to the Form via `WordForm` junctions. */
  async upsertWordsAndJunctions(
    formsByWord: Map<string, Set<Form>>,
    lexeme: Lexeme,
  ): Promise<void> {
    const normalizedWords = [...formsByWord.keys()];
    if (normalizedWords.length === 0) return;

    await this.wordsRepository.upsert(
      normalizedWords.map((w) => ({
        createdBy: LEXICO_INGESTION_BY_ID,
        data: w,
        updatedBy: LEXICO_INGESTION_BY_ID,
      })),
      { conflictPaths: ["data"], skipUpdateIfNoValuesChanged: true },
    );

    const words = await this.wordsRepository.find({
      where: { data: In(normalizedWords) },
    });

    const wordMap = new Map(words.map((w) => [w.data, w]));

    const wordLexemeValues = words.map((word) => ({
      createdBy: LEXICO_INGESTION_BY_ID,
      lexeme,
      updatedBy: LEXICO_INGESTION_BY_ID,
      word,
    }));

    if (wordLexemeValues.length > 0) {
      await this.wordLexemeRepository
        .createQueryBuilder()
        .insert()
        .into(WordLexeme)
        .values(wordLexemeValues)
        .orIgnore()
        .execute();
    }

    await this.insertWordFormChunks(
      this.buildWordFormValues(formsByWord, wordMap),
    );
  }
}
