import pluralize from "pluralize";
import { SnakeNamingStrategy } from "typeorm-naming-strategies";

// ♟️ Constants
export const formCase = {
  ablative: "ablative",
  accusative: "accusative",
  dative: "dative",
  genitive: "genitive",
  locative: "locative",
  nominative: "nominative",
  vocative: "vocative",
} as const;

/** Grammatical case of a Latin inflected form. */
export type FormCase = (typeof formCase)[keyof typeof formCase];
export const formCaseValues = Object.values(formCase) as FormCase[];

export const formNumber = {
  plural: "plural",
  singular: "singular",
} as const;

/** Grammatical number of an inflected Latin form. */
export type FormNumber = (typeof formNumber)[keyof typeof formNumber];
export const formNumberValues = Object.values(formNumber) as FormNumber[];

export const formGender = {
  feminine: "feminine",
  masculine: "masculine",
  neuter: "neuter",
} as const;

/** Grammatical gender of an inflected Latin form. */
export type FormGender = (typeof formGender)[keyof typeof formGender];
export const formGenderValues = Object.values(formGender) as FormGender[];

export const formMood = {
  imperative: "imperative",
  indicative: "indicative",
  subjunctive: "subjunctive",
} as const;

/** Mood of a finite Latin verb form. */
export type FormMood = (typeof formMood)[keyof typeof formMood];
export const formMoodValues = Object.values(formMood) as FormMood[];

export const formVoice = {
  active: "active",
  passive: "passive",
} as const;

/** Voice of a Latin verb form. */
export type FormVoice = (typeof formVoice)[keyof typeof formVoice];
export const formVoiceValues = Object.values(formVoice) as FormVoice[];

export const formTense = {
  future: "future",
  futurePerfect: "futurePerfect",
  imperfect: "imperfect",
  perfect: "perfect",
  pluperfect: "pluperfect",
  present: "present",
} as const;

/** Tense of a finite Latin verb form. */
export type FormTense = (typeof formTense)[keyof typeof formTense];
export const formTenseValues = Object.values(formTense) as FormTense[];

export const formPerson = {
  first: "first",
  second: "second",
  third: "third",
} as const;

/** Grammatical person of a finite Latin verb form. */
export type FormPerson = (typeof formPerson)[keyof typeof formPerson];
export const formPersonValues = Object.values(formPerson) as FormPerson[];

export const formDegree = {
  comparative: "comparative",
  positive: "positive",
  superlative: "superlative",
} as const;

/** Degree of comparison of a Latin adjective or adverb form. */
export type FormDegree = (typeof formDegree)[keyof typeof formDegree];
export const formDegreeValues = Object.values(formDegree) as FormDegree[];

export const formNonFiniteTense = {
  future: "future",
  perfect: "perfect",
  present: "present",
} as const;

/**
 * Temporal aspect of a non-finite verb form (infinitives, participles, gerunds, supines).
 * Restricted to future, perfect, and present — unlike the fuller tense set available to finite forms.
 */
export type FormNonFiniteTense =
  (typeof formNonFiniteTense)[keyof typeof formNonFiniteTense];

export const formNonFiniteTenseValues = Object.values(
  formNonFiniteTense,
) as FormNonFiniteTense[];

export const formGerundCase = {
  ablative: "ablative",
  accusative: "accusative",
  dative: "dative",
  genitive: "genitive",
} as const;

/**
 * Grammatical case of a Latin gerund.
 * Gerunds only appear in the four oblique cases — nominative and vocative are excluded.
 */
export type FormGerundCase =
  (typeof formGerundCase)[keyof typeof formGerundCase];

export const formGerundCaseValues = Object.values(
  formGerundCase,
) as FormGerundCase[];

export const formSupineCase = {
  ablative: "ablative",
  accusative: "accusative",
} as const;

/**
 * Case of a Latin supine form.
 * Supines occur only in the accusative (to express purpose) and ablative (to express respect).
 */
export type FormSupineCase =
  (typeof formSupineCase)[keyof typeof formSupineCase];

export const formSupineCaseValues = Object.values(
  formSupineCase,
) as FormSupineCase[];

export const nounDeclension = {
  fifth: "fifth",
  first: "first",
  fourth: "fourth",
  none: "",
  second: "second",
  third: "third",
} as const;

/** Declension class of a Latin noun, which determines its inflectional endings. */
export type NounDeclension =
  (typeof nounDeclension)[keyof typeof nounDeclension];

export const nounDeclensionValues = Object.values(
  nounDeclension,
) as NounDeclension[];

export const adjectiveDeclension = {
  firstSecond: "first/second",
  none: "",
  third: "third",
} as const;

/** Declension class of a Latin adjective (first/second or third). */
export type AdjectiveDeclension =
  (typeof adjectiveDeclension)[keyof typeof adjectiveDeclension];

export const adjectiveDeclensionValues = Object.values(
  adjectiveDeclension,
) as AdjectiveDeclension[];

export const inflectionDeclension = {
  ...nounDeclension,
  ...adjectiveDeclension,
} as const;

export const inflectionDeclensionValues = Object.values(inflectionDeclension);

export const nounGender = {
  feminine: "feminine",
  mascFem: "masc/fem",
  masculine: "masculine",
  neuter: "neuter",
  none: "",
} as const;

/** Grammatical gender of a Latin noun, including `masc/fem` for nouns whose gender varies by referent. */
export type NounGender = (typeof nounGender)[keyof typeof nounGender];
export const nounGenders = Object.values(nounGender) as NounGender[];

export const adjectiveDegree = {
  comparative: "comparative",
  positive: "positive",
  superlative: "superlative",
} as const;

/** Degree of comparison of a Latin adjective. */
export type AdjectiveDegree =
  (typeof adjectiveDegree)[keyof typeof adjectiveDegree];

export const adjectiveDegreeValues = Object.values(
  adjectiveDegree,
) as AdjectiveDegree[];

export const adverbType = {
  conjunctional: "conjunctional",
  descriptive: "descriptive",
  none: "",
} as const;

/**
 * Functional classification of a Latin adverb.
 * Descriptive adverbs modify a verb or adjective; conjunctional adverbs link clauses.
 */
export type AdverbType = (typeof adverbType)[keyof typeof adverbType];
export const adverbTypes = Object.values(adverbType) as AdverbType[];

export const adverbDegree = {
  comparative: "comparative",
  positive: "positive",
  superlative: "superlative",
} as const;

/** Degree of comparison of a Latin adverb. */
export type AdverbDegree = (typeof adverbDegree)[keyof typeof adverbDegree];
export const adverbDegrees = Object.values(adverbDegree) as AdverbDegree[];

export const verbConjugation = {
  first: "first",
  fourth: "fourth",
  none: "",
  second: "second",
  third: "third",
  thirdIo: "third-io",
} as const;

/** Conjugation class of a Latin verb, which determines its inflectional stem and personal endings. */
export type VerbConjugation =
  (typeof verbConjugation)[keyof typeof verbConjugation];

export const verbConjugationValues = Object.values(
  verbConjugation,
) as VerbConjugation[];

export const prepositionCase = {
  ablative: "ablative",
  accusative: "accusative",
  none: "",
} as const;

/** Grammatical case governed by a Latin preposition. */
export type PrepositionCase =
  (typeof prepositionCase)[keyof typeof prepositionCase];

export const prepositionCases = Object.values(
  prepositionCase,
) as PrepositionCase[];

/**
 * Custom TypeORM naming strategy that extends SnakeNamingStrategy with:
 * - Automatic pluralization of table names
 * - Join table names formed from the two table names combined alphabetically in snake_case.
 */
export class LexicoNamingStrategy extends SnakeNamingStrategy {
  /**
   * Builds a deterministic join table name from both entity table names.
   */
  override joinTableName(
    firstEntityName: string,
    secondEntityName: string,
  ): string {
    const firstTableName = super.tableName(firstEntityName, firstEntityName);
    const secondTableName = super.tableName(secondEntityName, secondEntityName);
    const sortedPluralizedTableNames = [
      pluralize(firstTableName),
      pluralize(secondTableName),
    ].toSorted();
    const joinTableName = sortedPluralizedTableNames.join("_");
    return joinTableName;
  }

  /**
   * Converts a base table name to the pluralized table name used in the schema.
   */
  override tableName(targetName: string, userSpecifiedName: string): string {
    const baseTableName = super.tableName(targetName, userSpecifiedName);
    const tableName = pluralize(baseTableName);
    return tableName;
  }
}
