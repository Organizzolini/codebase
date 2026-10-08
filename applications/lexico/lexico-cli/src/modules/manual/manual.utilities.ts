import {
  AdjectivalForm,
  AdjectiveInflection,
  type FormCase,
  type FormGender,
  type FormNumber,
  Lexeme,
  NounInflection,
  PrincipalPart,
  Translation,
  UninflectedInflection,
} from "@codebase/lexico-entities";

/**
 * Builds adjectival forms for manual lexeme ingestion.
 */
export function buildAdjectivalForms(
  rawForms: Record<string, Record<string, Record<string, string[]>>>,
): AdjectivalForm[] {
  return Object.entries(rawForms).flatMap(([gender, cases]) => {
    return Object.entries(cases).flatMap(([caseName, numbers]) => {
      return Object.entries(numbers).flatMap(([number, values]) => {
        if (values.length === 0) {
          return [];
        }

        return [
          createAdjectivalForm({
            caseName,
            gender,
            number,
          }),
        ];
      });
    });
  });
}

/**
 * Builds gendered principal parts for manual lexeme ingestion.
 */
export function buildGenderedPrincipalParts(
  masculine: string,
  feminine: string,
  neuter: string,
): PrincipalPart[] {
  const masculinePrincipalPart = new PrincipalPart();
  masculinePrincipalPart.name = "masculine";
  masculinePrincipalPart.text = [masculine];

  const femininePrincipalPart = new PrincipalPart();
  femininePrincipalPart.name = "feminine";
  femininePrincipalPart.text = [feminine];

  const neuterPrincipalPart = new PrincipalPart();
  neuterPrincipalPart.name = "neuter";
  neuterPrincipalPart.text = [neuter];

  return [masculinePrincipalPart, femininePrincipalPart, neuterPrincipalPart];
}

/**
 * Creates a manual pronoun template for `hic` with predefined declension forms,
 * principal parts, and canonical translations.
 */
export function buildHicTemplate(): Lexeme {
  const lexeme = new Lexeme();
  lexeme.lemma = "hic";

  lexeme.disambiguator = 100;
  lexeme.partOfSpeech = "pronoun";

  const inflection = new AdjectiveInflection();
  inflection.declension = "first/second";
  inflection.degree = "positive";
  lexeme.inflection = inflection;

  lexeme.principalParts = buildGenderedPrincipalParts("hic", "haec", "hoc");

  lexeme.translations = [
    new Translation("he, she, it; ", lexeme),
    new Translation("this (thing); these (things)", lexeme),
  ];

  lexeme.forms = buildAdjectivalForms({
    feminine: {
      ablative: { plural: ["hīs"], singular: ["hāc"] },
      accusative: { plural: ["hās"], singular: ["hanc"] },
      dative: { plural: ["hīs"], singular: ["huic"] },
      genitive: { plural: ["hārum"], singular: ["huius", "hujus"] },
      nominative: { plural: ["hae"], singular: ["haec"] },
    },
    masculine: {
      ablative: { plural: ["hīs"], singular: ["hōc"] },
      accusative: { plural: ["hōs"], singular: ["hunc"] },
      dative: { plural: ["hīs"], singular: ["huic"] },
      genitive: { plural: ["hōrum"], singular: ["huius", "hujus"] },
      nominative: { plural: ["hī"], singular: ["hic"] },
    },
    neuter: {
      ablative: { plural: ["hīs"], singular: ["hōc"] },
      accusative: { plural: ["haec"], singular: ["hoc"] },
      dative: { plural: ["hīs"], singular: ["huic"] },
      genitive: { plural: ["hōrum"], singular: ["huius", "hujus"] },
      nominative: { plural: ["haec"], singular: ["hoc"] },
    },
  });

  return lexeme;
}

/**
 * Creates a manual pronoun template for `ille` with predefined declension forms,
 * principal parts, and canonical translations.
 */
export function buildIlleTemplate(): Lexeme {
  const lexeme = new Lexeme();
  lexeme.lemma = "ille";

  lexeme.disambiguator = 100;
  lexeme.partOfSpeech = "pronoun";

  const inflection = new AdjectiveInflection();
  inflection.declension = "first/second";
  inflection.degree = "positive";
  lexeme.inflection = inflection;

  lexeme.principalParts = buildGenderedPrincipalParts("ille", "illa", "illud");

  lexeme.translations = [
    new Translation("that (thing); those (things)", lexeme),
    new Translation(
      "(Vulgar Latin) he, she, it (third-person personal pronoun)",
      lexeme,
    ),
  ];

  lexeme.forms = buildAdjectivalForms({
    feminine: {
      ablative: { plural: ["illīs"], singular: ["illā"] },
      accusative: { plural: ["illās"], singular: ["illam"] },
      dative: { plural: ["illīs"], singular: ["illī"] },
      genitive: { plural: ["illārum"], singular: ["illīus"] },
      nominative: { plural: ["illae"], singular: ["illa"] },
    },
    masculine: {
      ablative: { plural: ["illīs"], singular: ["illō"] },
      accusative: { plural: ["illōs"], singular: ["illum"] },
      dative: { plural: ["illīs"], singular: ["illī"] },
      genitive: { plural: ["illōrum"], singular: ["illīus"] },
      nominative: { plural: ["illī"], singular: ["ille"] },
    },
    neuter: {
      ablative: { plural: ["illīs"], singular: ["illōc"] },
      accusative: { plural: ["illa"], singular: ["illud"] },
      dative: { plural: ["illīs"], singular: ["illī"] },
      genitive: { plural: ["illōrum"], singular: ["illīus"] },
      nominative: { plural: ["illa"], singular: ["illud"] },
    },
  });

  return lexeme;
}

/**
 * Creates a manual adjective template for `omnis` with third-declension forms
 * and normalized translation text.
 */
export function buildOmnisTemplate(): Lexeme {
  const lexeme = new Lexeme();
  lexeme.lemma = "omnis";

  lexeme.disambiguator = 100;
  lexeme.partOfSpeech = "adjective";

  const inflection = new AdjectiveInflection();
  inflection.declension = "third";
  inflection.degree = "positive";
  lexeme.inflection = inflection;

  lexeme.principalParts = buildGenderedPrincipalParts("omnis", "omnis", "omne");

  lexeme.translations = [new Translation("every (sg), all (pl)", lexeme)];

  lexeme.forms = buildAdjectivalForms({
    feminine: {
      ablative: { plural: ["omnibus"], singular: ["omnī"] },
      accusative: { plural: ["omnēs", "omnīs"], singular: ["omnem"] },
      dative: { plural: ["omnibus"], singular: ["omnī"] },
      genitive: { plural: ["omnium"], singular: ["omnis"] },
      nominative: { plural: ["omnēs"], singular: ["omnis"] },
      vocative: { plural: ["omnēs"], singular: ["omnis"] },
    },
    masculine: {
      ablative: { plural: ["omnibus"], singular: ["omnī"] },
      accusative: { plural: ["omnēs", "omnīs"], singular: ["omnem"] },
      dative: { plural: ["omnibus"], singular: ["omnī"] },
      genitive: { plural: ["omnium"], singular: ["omnis"] },
      nominative: { plural: ["omnēs"], singular: ["omnis"] },
      vocative: { plural: ["omnēs"], singular: ["omnis"] },
    },
    neuter: {
      ablative: { plural: ["omnibus"], singular: ["omnī"] },
      accusative: { plural: ["omnia"], singular: ["omne"] },
      dative: { plural: ["omnibus"], singular: ["omnī"] },
      genitive: { plural: ["omnium"], singular: ["omnis"] },
      nominative: { plural: ["omnia"], singular: ["omne"] },
      vocative: { plural: ["omnia"], singular: ["omne"] },
    },
  });

  return lexeme;
}

/**
 * Creates a reusable noun template used to expand praenomen abbreviations.
 */
export function buildPraenomenAbbreviationTemplate(): Lexeme {
  const lexeme = new Lexeme();
  lexeme.disambiguator = 100;
  lexeme.partOfSpeech = "noun";

  const inflection = new NounInflection();
  inflection.declension = "";
  lexeme.inflection = inflection;

  const lettersPrincipalPart = new PrincipalPart();
  lettersPrincipalPart.name = "letters";

  const periodPrincipalPart = new PrincipalPart();
  periodPrincipalPart.name = "period";

  lexeme.principalParts = [lettersPrincipalPart, periodPrincipalPart];

  return lexeme;
}

/**
 * Creates a reusable numeral template for manual Roman numeral entries.
 */
export function buildRomanNumeralTemplate(): Lexeme {
  const lexeme = new Lexeme();
  lexeme.disambiguator = 100;
  lexeme.partOfSpeech = "numeral";

  const inflection = new UninflectedInflection();
  lexeme.inflection = inflection;

  const principalPart = new PrincipalPart();
  principalPart.name = "masculine";

  lexeme.principalParts = [principalPart];

  return lexeme;
}

/**
 * Creates a strongly-typed adjectival form from string form dimensions.
 */
function createAdjectivalForm({
  caseName,
  gender,
  number,
}: {
  caseName: string;
  gender: string;
  number: string;
}): AdjectivalForm {
  const form = new AdjectivalForm();
  form.gender = gender as FormGender; // type-coverage:ignore-line
  form.case = caseName as FormCase; // type-coverage:ignore-line
  form.number = number as FormNumber; // type-coverage:ignore-line
  return form;
}
