export const partOfSpeech = {
  abbreviation: "abbreviation",
  adjective: "adjective",
  adverb: "adverb",
  circumfix: "circumfix",
  conjunction: "conjunction",
  determiner: "determiner",
  idiom: "idiom",
  inflection: "inflection",
  interfix: "interfix",
  interjection: "interjection",
  noun: "noun",
  numeral: "numeral",
  participle: "participle",
  particle: "particle",
  phrase: "phrase",
  prefix: "prefix",
  preposition: "preposition",
  pronoun: "pronoun",
  properNoun: "properNoun",
  proverb: "proverb",
  suffix: "suffix",
  verb: "verb",
} as const;

/**
 * Union of allowed part-of-speech string literals.
 */
export type PartOfSpeech = (typeof partOfSpeech)[keyof typeof partOfSpeech];

export const partsOfSpeech = Object.values(partOfSpeech) as PartOfSpeech[];
