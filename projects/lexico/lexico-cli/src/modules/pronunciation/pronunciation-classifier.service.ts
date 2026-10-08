import { Injectable } from "@nestjs/common";
import _ from "lodash";

import { PronunciationClassicalService } from "./pronunciation-classical.service";
import { PronunciationEcclesiasticalService } from "./pronunciation-ecclesiastical.service";

import type {
  PronunciationApplyWiktionaryContext,
  PronunciationCharacterContext,
  PronunciationEcclesiasticalCharacterContext,
  PronunciationUpdateVariantContext,
} from "./pronunciation.types";
import type { Pronunciation } from "@codebase/lexico-entities";
import type { AnyNode } from "domhandler";

/**
 * Classifies pronunciation phonemes for Classical and Ecclesiastical Latin.
 *
 * Delegates ecclesiastical classification to EcclesiasticalPronunciationClassifier
 * while handling classical pronunciation rules and shared parsing logic.
 */
@Injectable()
export class PronunciationClassifierService {
  // 🏗 Dependency Injection

  /**
   * Initializes classifier with ecclesiastical pronunciation provider.
   */
  constructor(
    private readonly classicalService: PronunciationClassicalService,
    private readonly ecclesiasticalService: PronunciationEcclesiasticalService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Parses phonics during pronunciation parsing.
   */
  private parsePhonics(
    pronunciations: string[],
  ): Pick<Pronunciation, "phonemic" | "phonetic"> {
    const parsed: Pick<Pronunciation, "phonemic" | "phonetic"> = {
      phonemic: null,
      phonetic: null,
    };
    for (const pronunciation of pronunciations) {
      if (/\/.*\//.test(pronunciation)) {
        parsed.phonemic = pronunciation.trim();
      } else if (/\[.*\]/.test(pronunciation)) {
        parsed.phonetic = pronunciation.trim();
      }
    }
    return parsed;
  }

  /**
   * Update variant pronunciation for pronunciation parsing.
   */
  private updateVariantPronunciation(
    args: PronunciationUpdateVariantContext,
  ): void {
    const {
      anchorText,
      classical,
      ecclesiastical,
      pronunciationsText,
      vulgar,
    } = args;
    if (anchorText.includes("Classical")) {
      _.assign(classical, this.parsePhonics(pronunciationsText));
    } else if (anchorText.includes("Ecclesiastical")) {
      _.assign(ecclesiastical, this.parsePhonics(pronunciationsText));
    } else if (anchorText.includes("Vulgar")) {
      _.assign(vulgar, this.parsePhonics(pronunciationsText));
    }
  }

  // 🌎 Public Methods

  /**
   * Applies Wiktionary IPA pronunciations onto pronunciation variants.
   */
  public applyWiktionaryPronunciations(
    args: PronunciationApplyWiktionaryContext,
  ): void {
    const { $, classical, ecclesiastical, elt, vulgar } = args;
    const pronunciationHeader = $(elt)
      .prevAll("div.mw-heading")
      .filter((_index: number, element: AnyNode) =>
        /pronunciation/i.test($(element).text()),
      )
      .first();
    if (pronunciationHeader.length <= 0) return;
    for (const pr of pronunciationHeader.next("ul").children()) {
      if (/^audio/i.test($(pr).text())) continue;
      const pronunciationsText = $(pr)
        .text()
        .split("IPA(key):")[1]
        ?.split(", ");
      if (!pronunciationsText) continue;
      const anchorText = $(pr).find("a").text();
      this.updateVariantPronunciation({
        anchorText,
        classical,
        ecclesiastical,
        pronunciationsText,
        vulgar,
      });
    }
  }

  /**
   * Processes one classical-character position and returns the next index.
   */
  public processClassicalCharacter(
    args: PronunciationCharacterContext & {
      isVowel: (index: number) => boolean;
    },
  ): number {
    return this.classicalService.processClassicalCharacter(args);
  }

  /**
   * Processes one ecclesiastical-character position and returns the next index.
   */
  public processEcclesiasticalCharacter(
    args: PronunciationEcclesiasticalCharacterContext,
  ): number {
    return this.ecclesiasticalService.processEcclesiasticalCharacter(args);
  }
}
