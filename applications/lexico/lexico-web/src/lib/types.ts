/**
 * Adjective/adjectival-pronoun forms grouped by grammatical gender.
 */
export interface AdjectiveForms {
  feminine?: NounForms;
  masculine?: NounForms;
  neuter?: NounForms;
}

/**
 * Full entry payload used by entry-detail views.
 */
export interface EntryFull {
  etymology: null | string;
  forms: Forms;
  id: string;
  inflection: Record<string, object>;

  part_of_speech: PartOfSpeech;

  principal_parts: PrincipalParts;
  pronunciation: Pronunciation;
  translations: string[];
}

/**
 * Entry payload returned by search endpoints, including match metadata.
 */
export interface EntrySearchResult {
  etymology: null | string;
  forms: Forms;
  id: string;
  inflection: Record<string, object>;

  part_of_speech: PartOfSpeech;

  principal_parts: PrincipalParts;
  pronunciation: Pronunciation;
  similarities: number[];
  translations: string[];
  words: string[];
}

/**
 * Union of form payload variants returned by lexical APIs.
 */
export type Forms =
  | AdjectiveForms
  | NounForms
  | Record<string, unknown>
  | VerbForms;

/**
 * Nominal forms grouped by case, then singular/plural.
 */
export interface NounForms {
  ablative?: NumberGroup;
  accusative?: NumberGroup;
  dative?: NumberGroup;
  genitive?: NumberGroup;
  locative?: NumberGroup;
  nominative?: NumberGroup;
  vocative?: NumberGroup;
}

/**
 * Number split for a case slot (singular vs plural spellings).
 */
export interface NumberGroup {
  plural?: string[];
  singular?: string[];
}

/**
 * Supported part-of-speech labels emitted by lexical APIs.
 */
export type PartOfSpeech =
  | "adjective"
  | "adverb"
  | "conjunction"
  | "interjection"
  | "noun"
  | "numeral"
  | "preposition"
  | "pronoun"
  | "properNoun"
  | "suffix"
  | "verb";

/**
 * Principal-part slots used across noun, adjective, and verb paradigms.
 */
export interface PrincipalParts {
  /** Additional principal parts */
  [key: string]: string | undefined;
  /** Genitive singular (nouns/adjectives) */
  genitive?: string;
  /** Infinitive form (verbs) */
  infinitive?: string;
  /** Nominative singular (nouns/adjectives) */
  nominative?: string;
  /** Perfect tense stem (verbs) */
  perfect?: string;
  /** Present tense stem (verbs) */
  present?: string;
  /** Supine form (verbs) */
  supine?: string;
}

/**
 * Pronunciation values keyed by tradition.
 */
export interface Pronunciation {
  /** Classical Latin pronunciation */
  classical?: PronunciationDialect;
  /** Ecclesiastical Latin pronunciation */
  ecclesiastical?: PronunciationDialect;
}

/**
 * IPA-like pronunciation fields for one tradition.
 */
export interface PronunciationDialect {
  /** Phoneme representation */
  phonemes?: string;
  /** Phonemic transcription */
  phonemic?: string;
  /** Phonetic transcription (IPA) */
  phonetic?: string;
}

/**
 * Verb paradigms grouped by mood and voice with finite/non-finite branches.
 */
export interface VerbForms {
  imperative?: {
    active?: ImperativeTenses;
    passive?: ImperativeTenses;
  };
  indicative?: {
    active?: TenseGroup;
    passive?: TenseGroup;
  };
  nonFinite?: {
    infinitive?: InfinitiveGroup;
    participle?: ParticipleGroup;
  };
  subjunctive?: {
    active?: SubjunctiveTenses;
    passive?: SubjunctiveTenses;
  };
  verbalNoun?: {
    gerund?: GerundForms;
    supine?: SupineForms;
  };
}

/**
 * Gerund spellings grouped by case.
 */
interface GerundForms {
  ablative?: string[];
  accusative?: string[];
  dative?: string[];
  genitive?: string[];
}

/**
 * Imperative person slots (second and third) for singular/plural.
 */
interface ImperativePersonGroup {
  plural?: { second?: string[]; third?: string[] };
  singular?: { second?: string[]; third?: string[] };
}

/**
 * Imperative tense grouping.
 */
interface ImperativeTenses {
  future?: ImperativePersonGroup;
  present?: ImperativePersonGroup;
}

/**
 * Infinitive forms grouped by voice and tense.
 */
interface InfinitiveGroup {
  active?: { future?: string[]; perfect?: string[]; present?: string[] };
  passive?: { future?: string[]; perfect?: string[]; present?: string[] };
}

/**
 * Participle forms grouped by voice and tense.
 */
interface ParticipleGroup {
  active?: { future?: string[]; present?: string[] };
  passive?: { future?: string[]; perfect?: string[] };
}

/**
 * Finite-verb person slots.
 */
interface PersonGroup {
  first?: string[];
  second?: string[];
  third?: string[];
}

/**
 * Finite-verb forms grouped by grammatical number.
 */
interface PersonNumberGroup {
  plural?: PersonGroup;
  singular?: PersonGroup;
}

/**
 * Subjunctive tense grouping.
 */
interface SubjunctiveTenses {
  imperfect?: PersonNumberGroup;
  perfect?: PersonNumberGroup;
  pluperfect?: PersonNumberGroup;
  present?: PersonNumberGroup;
}

/**
 * Supine spellings grouped by case.
 */
interface SupineForms {
  ablative?: string[];
  accusative?: string[];
}

/**
 * Indicative tense grouping for one voice.
 */
interface TenseGroup {
  future?: PersonNumberGroup;
  futurePerfect?: PersonNumberGroup;
  imperfect?: PersonNumberGroup;
  perfect?: PersonNumberGroup;
  pluperfect?: PersonNumberGroup;
  present?: PersonNumberGroup;
}
