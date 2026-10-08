import { Injectable } from "@nestjs/common";

import { PronunciationPhonemesService } from "./pronunciation-phonemes.service";
import { ecclesiasticalPhonemes } from "./pronunciation.constants";

import type { PronunciationEcclesiasticalCharacterContext } from "./pronunciation.types";

/**
 * Provides ecclesiastical pronunciation classification helpers.
 */
@Injectable()
export class PronunciationEcclesiasticalService {
  // 🏗 Dependency Injection

  constructor(private readonly phonemesService: PronunciationPhonemesService) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Checks whether between vowels in pronunciation parsing logic.
   */
  private isBetweenVowels(
    index: number,
    word: string[],
    isVowel: (letter: string) => boolean,
  ): boolean {
    return (
      index > 0 &&
      isVowel(word[index - 1] ?? "") &&
      isVowel(word[index + 1] ?? "")
    );
  }

  /**
   * Checks whether ecclesiastical vocal i in pronunciation parsing logic.
   */
  private isEcclesiasticalVocalI(
    index: number,
    word: string[],
    isVowel: (letter: string) => boolean,
  ): boolean {
    return (
      this.isInitialVocalI(index, word, isVowel) ||
      this.isInterVocalicI(index, word, isVowel)
    );
  }

  /**
   * Checks whether initial vocal i in pronunciation parsing logic.
   */
  private isInitialVocalI(
    index: number,
    word: string[],
    isVowel: (letter: string) => boolean,
  ): boolean {
    return (
      index === 0 && index + 1 < word.length && isVowel(word[index + 1] ?? "")
    );
  }

  /**
   * Checks whether inter vocalic i in pronunciation parsing logic.
   */
  private isInterVocalicI(
    index: number,
    word: string[],
    isVowel: (letter: string) => boolean,
  ): boolean {
    return (
      index - 1 > 0 &&
      index + 1 < word.length &&
      isVowel(word[index - 1] ?? "") &&
      isVowel(word[index + 1] ?? "")
    );
  }

  /**
   * Checks whether the consonant c should be pronounced as palatalized.
   */
  private isPalatalizedCConsonant(index: number, word: string[]): boolean {
    const nextCharacter = word[index + 1] ?? "";
    const nextTwoChars = nextCharacter + (word[index + 2] ?? "");
    return (
      ["ae", "æ", "e", "i", "oe", "y"].includes(nextCharacter) ||
      ["ae", "oe"].includes(nextTwoChars)
    );
  }

  /**
   * Checks whether the consonant g should be pronounced as palatalized.
   */
  private isPalatalizedGConsonant(index: number, word: string[]): boolean {
    const nextCharacter = word[index + 1] ?? "";
    const nextTwoChars = nextCharacter + (word[index + 2] ?? "");
    return (
      ["e", "i", "y"].includes(nextCharacter) ||
      ["ae", "oe"].includes(nextTwoChars)
    );
  }

  /**
   * Checks whether sc consonant in pronunciation parsing logic.
   */
  private isScConsonant(index: number, word: string[]): boolean {
    return (
      index + 2 < word.length &&
      ["ce", "ci"].includes((word[index + 1] ?? "") + (word[index + 2] ?? ""))
    );
  }

  // 🌎 Public Methods

  /**
   * Classifies ecclesiastical c for pronunciation parsing.
   */
  classifyEcclesiasticalC(
    index: number,
    word: string[],
    phonemes: (string | string[][])[],
  ): number {
    let nextIndex = index;
    if (
      nextIndex + 1 < word.length &&
      this.isPalatalizedCConsonant(nextIndex, word)
    ) {
      phonemes.push("ch");
    } else if (nextIndex + 1 < word.length && word[nextIndex + 1] === "c") {
      phonemes.push("ch");
      nextIndex++;
    } else {
      phonemes.push("k");
    }
    return nextIndex;
  }

  /**
   * Classifies ecclesiastical g for pronunciation parsing.
   */
  classifyEcclesiasticalG(
    index: number,
    word: string[],
    phonemes: (string | string[][])[],
  ): number {
    let nextIndex = index;
    if (
      nextIndex + 1 < word.length &&
      this.isPalatalizedGConsonant(nextIndex, word)
    ) {
      phonemes.push("dg");
    } else if (nextIndex + 1 < word.length && word[nextIndex + 1] === "g") {
      phonemes.push("dg");
      nextIndex++;
    } else {
      phonemes.push("g");
    }
    return nextIndex;
  }

  /**
   * Classifies ecclesiastical h for pronunciation parsing.
   */
  classifyEcclesiasticalH(args: {
    index: number;
    phonemes: (string | string[][])[];
    word: string[];
    wordString: string;
  }): void {
    const { index, phonemes, word, wordString } = args;
    if (
      (index - 2 >= 0 &&
        index + 1 < word.length &&
        wordString.slice(index - 2, index + 2) === "mihi") ||
      (index - 2 >= 0 &&
        index + 2 < word.length &&
        wordString.slice(index - 2, index + 3) === "nihil")
    ) {
      phonemes.push("k");
    }
  }

  /**
   * Classifies ecclesiastical i for pronunciation parsing.
   */
  classifyEcclesiasticalI(args: {
    index: number;
    isVowel: (letter: string) => boolean;
    phonemes: (string | string[][])[];
    word: string[];
  }): void {
    const { index, isVowel, phonemes, word } = args;
    if (this.isEcclesiasticalVocalI(index, word, isVowel)) {
      phonemes.push("j");
    } else {
      phonemes.push(
        this.phonemesService.getStringPhoneme(ecclesiasticalPhonemes, "i"),
      );
    }
  }

  /**
   * Classifies ecclesiastical s for pronunciation parsing.
   */
  classifyEcclesiasticalS(args: {
    index: number;
    isVowel: (letter: string) => boolean;
    phonemes: (string | string[][])[];
    word: string[];
  }): number {
    const { isVowel, phonemes, word } = args;
    let nextIndex = args.index;
    if (this.isBetweenVowels(nextIndex, word, isVowel)) {
      phonemes.push("z");
    } else if (this.isScConsonant(nextIndex, word)) {
      phonemes.push("sh");
      nextIndex++;
    } else {
      phonemes.push("s");
    }
    if (word[nextIndex + 1] === "s") nextIndex++;
    return nextIndex;
  }

  /**
   * Classifies ecclesiastical t for pronunciation parsing.
   */
  classifyEcclesiasticalT(
    index: number,
    word: string[],
    phonemes: (string | string[][])[],
  ): void {
    if (word[index + 1] === "i") phonemes.push("ts");
    else phonemes.push("t");
  }

  /**
   * Classifies ecclesiastical x for pronunciation parsing.
   */
  classifyEcclesiasticalX(args: {
    index: number;
    isVowel: (letter: string) => boolean;
    phonemes: (string | string[][])[];
    word: string[];
  }): number {
    const { isVowel, phonemes, word } = args;
    let nextIndex = args.index;
    if (this.isBetweenVowels(nextIndex, word, isVowel)) {
      phonemes.push("gz");
    } else if (this.isScConsonant(nextIndex, word)) {
      phonemes.push("ksh");
      nextIndex++;
    } else {
      phonemes.push("ks");
    }
    return nextIndex;
  }

  /**
   * Looks up multi character phoneme used by pronunciation parsing.
   */
  lookupMultiCharacterPhoneme(args: {
    ch: string;
    index: number;
    phonemes: (string | string[][])[];
    word: string[];
  }): number {
    const { ch, index, phonemes, word } = args;
    const twoAheadKey = ch + word.slice(index + 1, index + 3).join("");
    const oneAheadKey = ch + (word[index + 1] ?? "");
    const twoCharacterPhoneme = ecclesiasticalPhonemes[twoAheadKey];
    const oneCharacterPhoneme = ecclesiasticalPhonemes[oneAheadKey];

    if (index + 2 < word.length && twoCharacterPhoneme !== undefined) {
      phonemes.push(
        this.phonemesService.getStringPhoneme(
          ecclesiasticalPhonemes,
          twoAheadKey,
        ),
      );
      return index + 2;
    }

    if (index + 1 < word.length && oneCharacterPhoneme !== undefined) {
      phonemes.push(
        this.phonemesService.getStringPhoneme(
          ecclesiasticalPhonemes,
          oneAheadKey,
        ),
      );
      return index + 1;
    }

    phonemes.push(
      this.phonemesService.getStringPhoneme(ecclesiasticalPhonemes, ch),
    );
    return index;
  }

  /**
   * Processes one ecclesiastical-character position and returns the next index.
   */
  processEcclesiasticalCharacter(
    args: PronunciationEcclesiasticalCharacterContext,
  ): number {
    const { ch, isVowel, phonemes, word, wordString } = args;
    const index = args.index;
    switch (ch) {
      case "c": {
        return this.classifyEcclesiasticalC(index, word, phonemes);
      }
      case "g": {
        return this.classifyEcclesiasticalG(index, word, phonemes);
      }
      case "h": {
        this.classifyEcclesiasticalH({ index, phonemes, word, wordString });
        break;
      }
      case "i": {
        this.classifyEcclesiasticalI({ index, isVowel, phonemes, word });
        break;
      }
      case "s": {
        return this.classifyEcclesiasticalS({ index, isVowel, phonemes, word });
      }
      case "t": {
        this.classifyEcclesiasticalT(index, word, phonemes);
        break;
      }
      case "x": {
        return this.classifyEcclesiasticalX({ index, isVowel, phonemes, word });
      }
      default: {
        return this.lookupMultiCharacterPhoneme({ ch, index, phonemes, word });
      }
    }
    return index;
  }
}
