// ♟️ Constants

import {
  adjectiveDeclensionValues,
  adjectiveDegreeValues,
  nounDeclensionValues,
  nounGenders,
  type PartOfSpeech,
  prepositionCases,
  verbConjugationValues,
} from "@codebase/lexico-entities";

const isCompactStringArray = (
  values: readonly (number | string)[] | Readonly<Record<string, never>>,
): values is readonly (number | string)[] => Array.isArray(values);

const compactStringValues = (
  values: readonly (number | string)[] | Readonly<Record<string, never>>,
): string[] => {
  if (!isCompactStringArray(values)) {
    return [];
  }

  return values.filter(
    (value): value is string => typeof value === "string" && value.length > 0,
  );
};

const adjectiveDeclensionValueList = compactStringValues(
  adjectiveDeclensionValues,
);
const adjectiveDegreeValueList = compactStringValues(adjectiveDegreeValues);
const nounDeclensionValueList = compactStringValues(nounDeclensionValues);
const nounGenderValueList = compactStringValues(nounGenders);
const prepositionCaseValueList = compactStringValues(prepositionCases);
const verbConjugationValueList = compactStringValues(verbConjugationValues);

// ♟️ POS regex constants
export const nounDeclensionRegex = new RegExp(
  nounDeclensionValueList.join("|"),
);
export const genderRegex = new RegExp(nounGenderValueList.join("|"));
export const adjectiveDeclensionRegex = new RegExp(
  adjectiveDeclensionValueList.join("|"),
);
export const adjectiveDegreeRegex = new RegExp(
  adjectiveDegreeValueList.join("|"),
);
export const verbConjugationRegex = new RegExp(
  verbConjugationValueList.join("|"),
);
export const prepositionCaseRegex = new RegExp(
  prepositionCaseValueList.join("|"),
);

// ♟️ First principal part name per POS
export const firstPrincipalPartNames: Partial<Record<PartOfSpeech, string>> = {
  abbreviation: "conjunction",
  adjective: "masculine",
  adverb: "positive",
  circumfix: "masculine",
  conjunction: "conjunction",
  determiner: "masculine",
  idiom: "conjunction",
  inflection: "conjunction",
  interfix: "masculine",
  interjection: "conjunction",
  noun: "nominative",
  numeral: "masculine",
  participle: "masculine",
  particle: "conjunction",
  phrase: "conjunction",
  prefix: "masculine",
  preposition: "preposition",
  pronoun: "masculine",
  properNoun: "nominative",
  proverb: "conjunction",
  suffix: "masculine",
  verb: "present active",
};

// ♟️ esse/fui lookup table for periphrastic verb forms
export const sumEsseFui: Record<
  string,
  Record<string, Record<string, Record<string, Record<string, string[]>>>>
> = {
  indicative: {
    active: {
      future: {
        plural: { first: ["erimus"], second: ["eritis"], third: ["erunt"] },
        singular: { first: ["erō"], second: ["eris"], third: ["erit"] },
      },
      futurePerfect: {
        plural: {
          first: ["fuerimus"],
          second: ["fueritis"],
          third: ["fuerint"],
        },
        singular: { first: ["fuerō"], second: ["fueris"], third: ["fuerit"] },
      },
      imperfect: {
        plural: { first: ["erāmus"], second: ["erātis"], third: ["erant"] },
        singular: { first: ["eram"], second: ["erās"], third: ["erat"] },
      },
      perfect: {
        plural: {
          first: ["fuimus"],
          second: ["fuistis"],
          third: ["fuērunt", "fuēre"],
        },
        singular: { first: ["fuī"], second: ["fuistī"], third: ["fuit"] },
      },
      pluperfect: {
        plural: {
          first: ["fuerāmus"],
          second: ["fuerātis"],
          third: ["fuerant"],
        },
        singular: { first: ["fueram"], second: ["fuerās"], third: ["fuerat"] },
      },
      present: {
        plural: { first: ["sumus"], second: ["estis"], third: ["sunt"] },
        singular: { first: ["sum"], second: ["es"], third: ["est"] },
      },
    },
  },
  subjunctive: {
    active: {
      imperfect: {
        plural: {
          first: ["essēmus", "forēmus"],
          second: ["essētis", "forētis"],
          third: ["essent", "forent"],
        },
        singular: {
          first: ["essem", "forem"],
          second: ["essēs", "forēs"],
          third: ["esset", "foret"],
        },
      },
      perfect: {
        plural: {
          first: ["fuerīmus"],
          second: ["fuerītis"],
          third: ["fuerint"],
        },
        singular: { first: ["fuerim"], second: ["fuerīs"], third: ["fuerit"] },
      },
      pluperfect: {
        plural: {
          first: ["fuissēmus"],
          second: ["fuissētis"],
          third: ["fuissent"],
        },
        singular: {
          first: ["fuissem"],
          second: ["fuissēs"],
          third: ["fuisset"],
        },
      },
      present: {
        plural: { first: ["sīmus"], second: ["sītis"], third: ["sint"] },
        singular: { first: ["sim"], second: ["sīs"], third: ["sit"] },
      },
    },
  },
};
