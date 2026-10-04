import { Injectable } from "@nestjs/common";

import {
  In,
  InjectRepository,
  type Repository,
  Word,
  WordForm,
  WordLexeme,
} from "@codebase/lexico-entities";

/**
 * Service for resolving surface Latin words and their lexical/morphological mapping.
 */
@Injectable()
export class WordsService {
  // 🏗 Dependency Injection

  public constructor(
    @InjectRepository(Word)
    private readonly wordRepository: Repository<Word>,
    @InjectRepository(WordForm)
    private readonly wordFormRepository: Repository<WordForm>,
    @InjectRepository(WordLexeme)
    private readonly wordLexemeRepository: Repository<WordLexeme>,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Returns a single surface word and all of its morphological and lexical links.
   */
  public async findByData(data: string): Promise<null | Word> {
    return this.wordRepository.findOne({
      relations: {
        wordForms: {
          form: true,
        },
        wordLexemes: {
          lexeme: {
            forms: true,
            inflection: true,
            principalParts: true,
            pronunciations: true,
            translations: true,
          },
        },
      },
      where: { data },
    });
  }

  /**
   * Returns multiple surface words in the input order.
   */
  public async findByDataList(data: string[]): Promise<Word[]> {
    if (data.length === 0) {
      return [];
    }

    return this.wordRepository.find({
      relations: {
        wordForms: {
          form: true,
        },
        wordLexemes: {
          lexeme: {
            forms: true,
            inflection: true,
            principalParts: true,
            pronunciations: true,
            translations: true,
          },
        },
      },
      where: { data: In(data) },
    });
  }

  /**
   * Finds all stored word rows by their identifiers.
   */
  public async findByIds(ids: string[]): Promise<Word[]> {
    if (ids.length === 0) {
      return [];
    }

    return this.wordRepository.find({
      relations: {
        wordForms: {
          form: true,
        },
        wordLexemes: {
          lexeme: {
            forms: true,
            inflection: true,
            principalParts: true,
            pronunciations: true,
            translations: true,
          },
        },
      },
      where: { id: In(ids) },
    });
  }

  /**
   * Returns all word-form rows for a given word identifier.
   */
  public async findFormRowsByWordId(wordId: string): Promise<WordForm[]> {
    return this.wordFormRepository.find({
      relations: { form: true, word: true },
      where: { word: { id: wordId } },
    });
  }

  /**
   * Returns every morphological form linked to the given word surface.
   */
  public async findFormsByData(data: string): Promise<WordForm[]> {
    const foundWord = await this.findByData(data);
    return foundWord?.wordForms ?? [];
  }

  /**
   * Returns the word-lexeme junction rows for the given surface word.
   */
  public async findLexemeLinksByData(data: string): Promise<WordLexeme[]> {
    const foundWord = await this.findByData(data);
    return foundWord?.wordLexemes ?? [];
  }

  /**
   * Returns all word-lexeme rows for a given word identifier.
   */
  public async findLexemeRowsByWordId(wordId: string): Promise<WordLexeme[]> {
    return this.wordLexemeRepository.find({
      relations: { lexeme: true, word: true },
      where: { word: { id: wordId } },
    });
  }
}
