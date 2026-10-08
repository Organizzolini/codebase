// ♟️ Constants

import {
  formCaseValues,
  formGerundCaseValues,
  formMoodValues,
  formNonFiniteTenseValues,
  formNumberValues,
  formPersonValues,
  formSupineCaseValues,
  formTenseValues,
  formVoiceValues,
  type PartOfSpeech,
  partOfSpeechEnumValues,
} from "@codebase/lexico-entities";

const isNormalizableStringArray = (
  values: readonly (number | string)[] | Readonly<Record<string, never>>,
): values is readonly (number | string)[] => Array.isArray(values);

const normalizeStringArray = (
  values: readonly (number | string)[] | Readonly<Record<string, never>>,
): string[] => {
  if (!isNormalizableStringArray(values)) {
    return [];
  }

  return values.filter(
    (value): value is string => typeof value === "string" && value.length > 0,
  );
};

export const adjectivalPartOfSpeechSet: ReadonlySet<PartOfSpeech> =
  new Set<PartOfSpeech>(["adjective", "numeral", "participle", "suffix"]);

export const nominalPartOfSpeechSet: ReadonlySet<PartOfSpeech> =
  new Set<PartOfSpeech>(["determiner", "noun", "pronoun", "properNoun"]);

export const unsupportedPartOfSpeechSet: ReadonlySet<PartOfSpeech> =
  new Set<PartOfSpeech>([
    "abbreviation",
    "circumfix",
    "conjunction",
    "idiom",
    "inflection",
    "interfix",
    "interjection",
    "particle",
    "phrase",
    "prefix",
    "preposition",
    "proverb",
  ]);

export const formCaseValueList: readonly string[] =
  normalizeStringArray(formCaseValues);
export const formGerundCaseValueList: readonly string[] =
  normalizeStringArray(formGerundCaseValues);
export const formMoodValueList: readonly string[] =
  normalizeStringArray(formMoodValues);
export const formNonFiniteTenseValueList: readonly string[] =
  normalizeStringArray(formNonFiniteTenseValues);
export const formNumberValueList: readonly string[] =
  normalizeStringArray(formNumberValues);
export const formPersonValueList: readonly string[] =
  normalizeStringArray(formPersonValues);
export const formSupineCaseValueList: readonly string[] =
  normalizeStringArray(formSupineCaseValues);
export const formTenseValueList: readonly string[] =
  normalizeStringArray(formTenseValues);
export const formVoiceValueList: readonly string[] =
  normalizeStringArray(formVoiceValues);
export const partOfSpeechValueList: readonly string[] = normalizeStringArray(
  partOfSpeechEnumValues,
);
