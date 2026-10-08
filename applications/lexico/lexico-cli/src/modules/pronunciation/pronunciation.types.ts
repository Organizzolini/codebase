import type { Pronunciation } from "@codebase/lexico-entities";
import type * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";

// 🏷️ Types

/** Phoneme map for classical pronunciation classification. */
export type ClassicalPhonemeMap = Record<string, string>;

/** Phoneme map for ecclesiastical pronunciation classification. */
export type EcclesiasticalPhonemeMap = Record<string, string | string[][]>;

/** Context for applying Wiktionary pronunciation variants. */
export interface PronunciationApplyWiktionaryContext {
  $: cheerio.CheerioAPI;
  classical: Pronunciation;
  ecclesiastical: Pronunciation;
  elt: AnyNode;
  vulgar: Pronunciation;
}

/** Context for creating a default pronunciation entity. */
export interface PronunciationBuildDefaultContext {
  phonemes: null | string;
  variant: PronunciationVariant;
}

/** Shared character-processing context used by pronunciation services. */
export interface PronunciationCharacterContext {
  ch: string;
  index: number;
  phonemes: PronunciationPhoneme[];
  word: string[];
}

/** Classical pronunciation character-processing context. */
export interface PronunciationClassicalCharacterContext extends PronunciationCharacterContext {
  isVowel: (index: number) => boolean;
}

/** Ecclesiastical pronunciation character-processing context. */
export interface PronunciationEcclesiasticalCharacterContext extends PronunciationCharacterContext {
  isVowel: (letter: string) => boolean;
  wordString: string;
}

/** Mixed phoneme entry used during pronunciation expansion. */
export type PronunciationPhoneme = string | string[][];

/** Context for assigning phonetic values to a pronunciation variant. */
export interface PronunciationUpdateVariantContext {
  anchorText: string;
  classical: Pronunciation;
  ecclesiastical: Pronunciation;
  pronunciationsText: string[];
  vulgar: Pronunciation;
}

/** Supported pronunciation variants. */
export type PronunciationVariant = "classical" | "ecclesiastical" | "vulgar";
