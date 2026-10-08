import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import * as cheerio from "cheerio";
import { Repository } from "typeorm";

import { Lexeme, Pronunciation } from "@codebase/lexico-entities";
import { LoggerService } from "@codebase/logging";

import { PronunciationClassifierService } from "./pronunciation-classifier.service";
import { classicalSubstitutions } from "./pronunciation.constants";

import type {
  PronunciationBuildDefaultContext,
  PronunciationPhoneme,
} from "./pronunciation.types";
import type { AnyNode } from "domhandler";

/**
 * Parses Classical and Ecclesiastical Latin pronunciation from
 * a macronized word and Wiktionary HTML element context.
 */
@Injectable()
export class PronunciationService {
  // 🏗 Dependency Injection

  constructor(
    @InjectRepository(Lexeme)
    private readonly lexemeRepository: Repository<Lexeme>,
    private readonly logger: LoggerService,
    private readonly classifier: PronunciationClassifierService,
  ) {
    this.logger.setContext(PronunciationService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Builds default pronunciation for pronunciation parsing.
   */
  private buildDefaultPronunciation({
    phonemes,
    variant,
  }: PronunciationBuildDefaultContext): Pronunciation {
    const pronunciation = new Pronunciation();
    pronunciation.variant = variant;
    pronunciation.phonemes = phonemes;
    pronunciation.phonemic = null;
    pronunciation.phonetic = null;
    return pronunciation;
  }

  /**
   * Builds pronunciations for pronunciation parsing.
   */
  private buildPronunciations(phonemes: PronunciationPhoneme[]): string[] {
    const pronunciations: string[] = [];

    /**
     * Builds  for pronunciation parsing.
     */
    function build(previous: string[], next: PronunciationPhoneme[]): void {
      if (next.length === 0) {
        pronunciations.push(previous.join(" "));
        return;
      }
      const rest = [...next];
      const phoneme = rest.shift();
      if (Array.isArray(phoneme)) {
        for (const option of phoneme) {
          if (Array.isArray(option)) {
            build([...previous, ...option], [...rest]);
          } else build([...previous, option], [...rest]);
        }
      } else if (phoneme !== undefined) {
        build([...previous, phoneme], [...rest]);
      }
    }

    build([], phonemes);
    return pronunciations;
  }

  /**
   * Gets classical phonemes used by pronunciation parsing.
   */
  private getClassicalPhonemes(wordString: string): string {
    let normalizedWordString = wordString;
    for (const [pattern, replacement] of Object.entries(
      classicalSubstitutions,
    )) {
      normalizedWordString = normalizedWordString.replace(
        new RegExp(pattern),
        replacement,
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-misused-spread
    const word = [...normalizedWordString.toLowerCase()];
    const isVowel = (index: number): boolean =>
      index >= 0 &&
      index < word.length &&
      // eslint-disable-next-line @typescript-eslint/no-misused-spread
      [..."aeiouāēīōūȳ"].includes(word[index] ?? "");
    const phonemes: string[] = [];
    for (let index = 0; index < word.length; index++) {
      const ch = word[index] ?? "";
      index = this.classifier.processClassicalCharacter({
        ch,
        index,
        isVowel,
        phonemes,
        word,
      });
    }
    return phonemes.join(" ");
  }

  /**
   * Gets ecclesiastical phonemes used by pronunciation parsing.
   */
  private getEcclesiasticalPhonemes(
    wordString: string,
  ): PronunciationPhoneme[] {
    const phonemes: PronunciationPhoneme[] = [];
    // eslint-disable-next-line unicorn/consistent-function-scoping
    const isVowel = (letter: string): boolean =>
      ["a", "e", "i", "o", "u"].includes(letter);
    // eslint-disable-next-line @typescript-eslint/no-misused-spread
    const word = [...wordString];
    for (let index = 0; index < word.length; index++) {
      const ch = word[index] ?? "";
      index = this.classifier.processEcclesiasticalCharacter({
        ch,
        index,
        isVowel,
        phonemes,
        word,
        wordString,
      });
    }
    return phonemes;
  }

  /**
   * Gets ecclesiastical pronunciations used by pronunciation parsing.
   */
  private getEcclesiasticalPronunciations(word: string): string[] {
    return this.buildPronunciations(this.getEcclesiasticalPhonemes(word));
  }
  // 🌎 Public Methods

  /**
   * Assigns the new pronunciations onto the loaded entity
   * so TypeORM diffs against the loaded state and cascade-removes orphaned records.
   */
  async ingestLexemePronunciations(
    savedLexeme: Lexeme,
    pronunciations: Pronunciation[],
  ): Promise<void> {
    // Preserve existing IDs to prevent insert/delete churn and unique constraint violations
    if (savedLexeme.pronunciations) {
      for (const newPron of pronunciations) {
        const existing = savedLexeme.pronunciations.find(
          (p) => p.variant === newPron.variant,
        );
        if (existing) newPron.id = existing.id;
      }
    }
    savedLexeme.pronunciations = pronunciations;
    await this.lexemeRepository.save(savedLexeme);
  }

  /**
   * Parses pronunciation data from the Wiktionary HTML element context.
   * Requires `macronizedWord` to already be resolved (call `parsePrincipalParts`
   * before this function). Returns one `Pronunciation` entity per variant.
   */
  parse(
    $: cheerio.CheerioAPI,
    elt: AnyNode,
    macronizedWord: string,
  ): Pronunciation[] {
    const classical = this.buildDefaultPronunciation({
      phonemes: this.getClassicalPhonemes(macronizedWord),
      variant: "classical",
    });
    const ecclesiastical = this.buildDefaultPronunciation({
      phonemes: this.getEcclesiasticalPronunciations(macronizedWord)[0] ?? null,
      variant: "ecclesiastical",
    });
    const vulgar = this.buildDefaultPronunciation({
      phonemes: null,
      variant: "vulgar",
    });
    this.classifier.applyWiktionaryPronunciations({
      $,
      classical,
      ecclesiastical,
      elt,
      vulgar,
    });
    return [classical, ecclesiastical, vulgar];
  }
}
