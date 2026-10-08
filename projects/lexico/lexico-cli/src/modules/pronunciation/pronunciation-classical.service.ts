import { Injectable } from "@nestjs/common";

import {
  classicalDevocalize,
  classicalPhonemes,
} from "./pronunciation.constants";

import type {
  PronunciationCharacterContext,
  PronunciationClassicalCharacterContext,
} from "./pronunciation.types";

/**
 * Provides classical pronunciation classification helpers.
 */
@Injectable()
export class PronunciationClassicalService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Classifies and adds the classical H phoneme based on surrounding vowels.
   */
  private classifyClassicalH(
    args: PronunciationClassicalCharacterContext,
  ): void {
    const { index, isVowel, phonemes, word } = args;
    if (
      index === 0 ||
      (isVowel(index + 1) && index - 1 >= 0 && word[index - 1] !== "r")
    ) {
      phonemes.push("H");
    }
  }

  /**
   * Classifies and adds the classical I or J phoneme based on vowel context.
   */
  private classifyClassicalI(
    args: PronunciationClassicalCharacterContext,
  ): void {
    const { ch, index, isVowel, phonemes } = args;
    if (isVowel(index + 1) && (index === 0 || isVowel(index - 1))) {
      phonemes.push("J");
    } else {
      phonemes.push(classicalPhonemes[ch] ?? "");
    }
  }

  /**
   * Classifies and adds the classical J phoneme based on surrounding consonants.
   */
  private classifyClassicalJ(
    args: PronunciationClassicalCharacterContext,
  ): void {
    const { ch, index, isVowel, phonemes, word } = args;
    if (
      !isVowel(index - 1) &&
      ["l", "m", "n", "q", "t"].includes(word[index - 1] ?? "")
    ) {
      phonemes.push("I");
    } else {
      phonemes.push(classicalPhonemes[ch] ?? "");
    }
  }

  /**
   * Classifies and adds the classical N or NG phoneme based on following consonants.
   */
  private classifyClassicalN(
    args: PronunciationClassicalCharacterContext,
  ): void {
    const { ch, index, isVowel, phonemes, word } = args;
    if (
      !isVowel(index + 1) &&
      ["c", "g", "q", "x"].includes(word[index + 1] ?? "")
    ) {
      phonemes.push("NG");
    } else {
      phonemes.push(classicalPhonemes[ch] ?? "");
    }
  }

  /**
   * Looks up the classical devocalized phoneme when the next character requires it.
   */
  private lookupClassicalDevocalizeCharacter(
    args: PronunciationCharacterContext,
  ): void {
    const { ch, index, phonemes, word } = args;
    const nextCharacter = word[index + 1] ?? "";
    if (
      index + 1 < word.length &&
      ["c", "f", "k", "p", "q", "s", "t"].includes(nextCharacter)
    ) {
      phonemes.push(classicalDevocalize[ch] ?? "");
    } else {
      phonemes.push(classicalPhonemes[ch] ?? "");
    }
  }

  /**
   * Looks up a classical multi-character phoneme.
   */
  private lookupMultiCharacterPhoneme(
    args: PronunciationCharacterContext,
  ): number {
    const { ch, index, phonemes, word } = args;
    const twoAheadKey = ch + word.slice(index + 1, index + 3).join("");
    const oneAheadKey = ch + (word[index + 1] ?? "");
    const twoCharacterPhoneme = classicalPhonemes[twoAheadKey];
    const oneCharacterPhoneme = classicalPhonemes[oneAheadKey];

    if (index + 2 < word.length && twoCharacterPhoneme !== undefined) {
      phonemes.push(twoCharacterPhoneme);
      return index + 2;
    }

    if (index + 1 < word.length && oneCharacterPhoneme !== undefined) {
      phonemes.push(oneCharacterPhoneme);
      return index + 1;
    }

    phonemes.push(classicalPhonemes[ch] ?? "");
    return index;
  }

  // 🌎 Public Methods

  /**
   * Processes one classical-character position and returns the next index.
   */
  public processClassicalCharacter(
    args: PronunciationClassicalCharacterContext,
  ): number {
    const { ch, index, isVowel, phonemes, word } = args;

    switch (ch) {
      case "h": {
        this.classifyClassicalH({ ch, index, isVowel, phonemes, word });
        return index;
      }
      case "i": {
        this.classifyClassicalI({ ch, index, isVowel, phonemes, word });
        return index;
      }
      case "j": {
        this.classifyClassicalJ({ ch, index, isVowel, phonemes, word });
        return index;
      }
      case "n": {
        this.classifyClassicalN({ ch, index, isVowel, phonemes, word });
        return index;
      }
      default: {
        if (Object.hasOwn(classicalDevocalize, ch)) {
          this.lookupClassicalDevocalizeCharacter({
            ch,
            index,
            phonemes,
            word,
          });
          return index;
        }

        return this.lookupMultiCharacterPhoneme({ ch, index, phonemes, word });
      }
    }
  }
}
