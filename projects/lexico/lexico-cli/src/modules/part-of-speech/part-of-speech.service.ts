import { Injectable } from "@nestjs/common";
import * as cheerio from "cheerio";

import {
  adjectiveDeclensionValues,
  adjectiveDegreeValues,
  AdjectiveInflection,
  AdverbInflection,
  type Inflection,
  type Lexeme,
  nounDeclensionValues,
  nounGenders,
  NounInflection,
  type PartOfSpeech,
  partOfSpeechEnumValues,
  prepositionCases,
  PrepositionInflection,
  type PrincipalPart,
  UninflectedInflection,
  verbConjugationValues,
  VerbInflection,
} from "@codebase/lexico-entities";

import { PartOfSpeechFormsService } from "./part-of-speech-forms.service";
import {
  adjectiveDeclensionRegex,
  adjectiveDegreeRegex,
  firstPrincipalPartNames,
  genderRegex,
  nounDeclensionRegex,
  prepositionCaseRegex,
  verbConjugationRegex,
} from "./part-of-speech.constants";

import type { AnyNode } from "domhandler";

/**
 * Resolves the part of speech from a Wiktionary HTML element, dispatches
 * inflection and forms parsing for all supported parts of speech, and provides
 * shared form-table parsing utilities.
 */
@Injectable()
export class PartOfSpeechService {
  // 🏗 Dependency Injection

  constructor(
    private readonly partOfSpeechFormsService: PartOfSpeechFormsService,
  ) {}

  // 🔐 Private Fields

  private static readonly adjectiveDeclensionValueList =
    adjectiveDeclensionValues;
  private static readonly adjectiveDegreeValueList = adjectiveDegreeValues;
  private static readonly FORMS_GROUP: Record<
    PartOfSpeech,
    "adverb" | "generic" | "verb"
  > = {
    abbreviation: "generic",
    adjective: "generic",
    adverb: "adverb",
    circumfix: "generic",
    conjunction: "generic",
    determiner: "generic",
    idiom: "generic",
    inflection: "generic",
    interfix: "generic",
    interjection: "generic",
    noun: "generic",
    numeral: "generic",
    participle: "generic",
    particle: "generic",
    phrase: "generic",
    prefix: "generic",
    preposition: "generic",
    pronoun: "generic",
    properNoun: "generic",
    proverb: "generic",
    suffix: "generic",
    verb: "verb",
  };
  private static readonly INFLECTION_GROUP: Record<
    PartOfSpeech,
    | "adjective"
    | "adverb"
    | "noun"
    | "prefix"
    | "preposition"
    | "pronoun"
    | "uninflected"
    | "verb"
  > = {
    abbreviation: "uninflected",
    adjective: "adjective",
    adverb: "adverb",
    circumfix: "prefix",
    conjunction: "uninflected",
    determiner: "pronoun",
    idiom: "uninflected",
    inflection: "uninflected",
    interfix: "prefix",
    interjection: "uninflected",
    noun: "noun",
    numeral: "adjective",
    participle: "adjective",
    particle: "uninflected",
    phrase: "uninflected",
    prefix: "prefix",
    preposition: "preposition",
    pronoun: "pronoun",
    properNoun: "noun",
    proverb: "uninflected",
    suffix: "adjective",
    verb: "verb",
  };
  private static readonly nounDeclensionValueList = nounDeclensionValues;
  private static readonly nounGenderValueList = nounGenders;
  private static readonly partOfSpeechValueSet: ReadonlySet<string> = new Set(
    partOfSpeechEnumValues,
  );
  private static readonly prepositionCaseValueList = prepositionCases;
  private static readonly verbConjugationValueList = verbConjugationValues;

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Returns the first matching typed value from the provided candidate list. */
  private static findTypedValue<ValueType extends string>(
    values: readonly ValueType[],
    candidate: string,
  ): undefined | ValueType {
    return values.find((value): value is ValueType => value === candidate);
  }

  /** Narrows text values to supported part-of-speech labels. */
  private static isPartOfSpeech(value: string): value is PartOfSpeech {
    return PartOfSpeechService.partOfSpeechValueSet.has(value);
  }

  /** Builds adjective inflection for part-of-speech parsing. */
  private buildAdjectiveInflection(declension: string): AdjectiveInflection {
    const degree = declension.match(adjectiveDegreeRegex)?.[0] ?? "positive";
    const matchedDeclension =
      declension.match(adjectiveDeclensionRegex)?.[0] ?? "";
    const adjectiveInflection = new AdjectiveInflection();
    adjectiveInflection.declension =
      PartOfSpeechService.findTypedValue(
        PartOfSpeechService.adjectiveDeclensionValueList,
        matchedDeclension,
      ) ?? "";
    adjectiveInflection.degree =
      PartOfSpeechService.findTypedValue(
        PartOfSpeechService.adjectiveDegreeValueList,
        degree,
      ) ?? "positive";
    return adjectiveInflection;
  }

  /** Builds noun inflection for part-of-speech parsing. */
  private buildNounInflection(
    declension: string,
    gender: string,
  ): NounInflection {
    const matchedDeclension = declension.match(nounDeclensionRegex)?.[0] ?? "";
    const matchedGender = gender.match(genderRegex)?.[0] ?? "";
    const nounInflection = new NounInflection();
    nounInflection.declension =
      PartOfSpeechService.findTypedValue(
        PartOfSpeechService.nounDeclensionValueList,
        matchedDeclension,
      ) ?? "";
    nounInflection.gender =
      PartOfSpeechService.findTypedValue(
        PartOfSpeechService.nounGenderValueList,
        matchedGender,
      ) ?? "";
    return nounInflection;
  }

  /** Gets text or empty used by part-of-speech parsing. */
  private getTextOrEmpty(part: PrincipalPart | undefined): string[] {
    return part?.text ?? [];
  }

  /** Ingests adjective inflection in the part-of-speech parsing pipeline. */
  private ingestAdjectiveInflection(
    $: cheerio.CheerioAPI,
    elt: AnyNode,
  ): Inflection {
    const inflectionHtml = $(elt)
      .nextAll("div.mw-heading")
      .filter((_: number, element: AnyNode) =>
        /declension/i.test($(element).text()),
      )
      .first()
      .next();

    if (inflectionHtml.length === 0) {
      return new UninflectedInflection();
    }

    const declension = inflectionHtml
      .text()
      .replaceAll(
        /(-declension)|(declension)|(adjective)|(participle)|(numeral)|[.\d[\]]/gi,
        "",
      )
      .replaceAll(/\s+/g, " ")
      .toLowerCase()
      .trim();

    if (declension.length === 0) {
      return new UninflectedInflection();
    }

    return this.buildAdjectiveInflection(declension);
  }

  /** Ingests adverb forms in the part-of-speech parsing pipeline. */
  private ingestAdverbForms(principalParts: PrincipalPart[]): unknown {
    const forms: Record<string, string[]> = {
      positive: this.getTextOrEmpty(principalParts[0]),
    };
    if (principalParts.length >= 2) {
      forms["comparative"] = this.getTextOrEmpty(principalParts[1]);
    }
    if (principalParts.length >= 3) {
      forms["superlative"] = this.getTextOrEmpty(principalParts[2]);
    }
    return forms;
  }

  /** Ingests adverb inflection in the part-of-speech parsing pipeline. */
  private ingestAdverbInflection(principalParts: PrincipalPart[]): Inflection {
    const adverbInflection = new AdverbInflection();
    adverbInflection.adverbType =
      principalParts.length > 1 ? "descriptive" : "conjunctional";
    adverbInflection.degree = "positive";
    return adverbInflection;
  }

  /** Ingests conjunction inflection in the part-of-speech parsing pipeline. */
  private ingestConjunctionInflection(): Inflection {
    return new UninflectedInflection();
  }

  /** Ingests noun inflection in the part-of-speech parsing pipeline. */
  private ingestNounInflection(
    $: cheerio.CheerioAPI,
    elt: AnyNode,
  ): Inflection {
    const inflectionHtml = $(elt)
      .nextAll("div.mw-heading")
      .filter((_: number, element: AnyNode) =>
        /declension/i.test($(element).text()),
      )
      .first()
      .next();

    if (inflectionHtml.length === 0) {
      return new UninflectedInflection();
    }

    const declension = inflectionHtml
      .text()
      .replaceAll(/(-declension)|(declension)|(noun)|[.\d[\]]/gi, "")
      .replaceAll(/\s+/g, " ")
      .toLowerCase()
      .trim();

    let gender = $(elt).children("span.gender").text();
    gender = gender
      .replace(/^m|m$/, "masculine")
      .replace(/^f|f$/, "feminine")
      .replace(/^n|n$/, "neuter")
      .replace("sg", "singular")
      .replace("pl", "plural");

    if (declension.length === 0 && gender.length === 0) {
      return new UninflectedInflection();
    }

    return this.buildNounInflection(declension, gender);
  }

  /** Ingests prefix inflection in the part-of-speech parsing pipeline. */
  private ingestPrefixInflection(): Inflection {
    return new UninflectedInflection();
  }

  /** Ingests preposition inflection in the part-of-speech parsing pipeline. */
  private ingestPrepositionInflection(
    $: cheerio.CheerioAPI,
    elt: AnyNode,
  ): Inflection {
    const text = $(elt).text();
    const other = text.split("(+ ")[1]?.split(")")[0];

    if (!other?.length) {
      const prepositionInflection = new PrepositionInflection();
      prepositionInflection.case = "accusative";
      return prepositionInflection;
    }

    const prepositionCase = other.match(prepositionCaseRegex)?.[0] ?? "";
    const prepositionInflection = new PrepositionInflection();
    prepositionInflection.case =
      PartOfSpeechService.findTypedValue(
        PartOfSpeechService.prepositionCaseValueList,
        prepositionCase,
      ) ?? "";
    prepositionInflection.other = other;
    return prepositionInflection;
  }

  /** Ingests pronoun inflection in the part-of-speech parsing pipeline. */
  private ingestPronounInflection(
    $: cheerio.CheerioAPI,
    elt: AnyNode,
  ): Inflection {
    if (!$(elt).text().includes(";")) {
      return new UninflectedInflection();
    }

    let declension = ($(elt).text().split("; ")[1] ?? "")
      .replace("pronoun", "")
      .replace("-", "")
      .replace("declension", "")
      .replaceAll(/\s+/g, " ")
      .trim();

    if (declension.length === 0) {
      return new UninflectedInflection();
    }

    declension = declension.match(adjectiveDeclensionRegex)?.[0] ?? "";

    const adjectiveInflection = new AdjectiveInflection();
    adjectiveInflection.declension =
      PartOfSpeechService.findTypedValue(
        PartOfSpeechService.adjectiveDeclensionValueList,
        declension,
      ) ?? "";
    adjectiveInflection.degree = "positive";
    return adjectiveInflection;
  }

  /** Ingests verb inflection in the part-of-speech parsing pipeline. */
  private ingestVerbInflection(
    $: cheerio.CheerioAPI,
    elt: AnyNode,
  ): Inflection {
    if (!$(elt).text().includes(";")) {
      return new UninflectedInflection();
    }

    let conjugation = $(elt).text().trim().split("; ")[1] ?? "";
    conjugation = conjugation
      .replaceAll(/(conjugation)|[\d[\]]/gi, "")
      .replace(" ,", ",")
      .replaceAll(/\s+/g, " ")
      .trim();

    const other = conjugation;
    const finalConjugation = /third.*io-variant/.test(conjugation)
      ? "third-io"
      : (conjugation.match(verbConjugationRegex)?.[0] ?? "");

    const verbInflection = new VerbInflection();
    verbInflection.conjugation =
      PartOfSpeechService.findTypedValue(
        PartOfSpeechService.verbConjugationValueList,
        finalConjugation,
      ) ?? "";
    verbInflection.other = other;
    return verbInflection;
  }

  // 🌎 Public Methods

  /**
   * Returns the first principal part name for the given part of speech,
   * or undefined if the POS is not supported.
   */
  getFirstPrincipalPartName(pos: PartOfSpeech): string | undefined {
    return firstPrincipalPartNames[pos];
  }

  /**
   * Resolves the part-of-speech label from the nearest preceding heading.
   */
  getPartOfSpeech($: cheerio.CheerioAPI, elt: AnyNode): PartOfSpeech {
    const text = $(elt)
      .prevAll("div.mw-heading")
      .first()
      .find("h3, h4")
      .text()
      .toLowerCase()
      .replaceAll(/(\[edit])|\d+/g, "")
      .trim()
      .replace("proper noun", "properNoun");
    return PartOfSpeechService.isPartOfSpeech(text) ? text : "phrase";
  }

  /**
   * Dispatches to the appropriate inflection parser for the given POS.
   */
  ingestInflection(args: {
    $: cheerio.CheerioAPI;
    elt: AnyNode;
    pos: PartOfSpeech;
    principalParts: PrincipalPart[];
  }): Inflection {
    const { $, elt, pos, principalParts } = args;
    const group = PartOfSpeechService.INFLECTION_GROUP[pos];
    const handlers: Record<string, () => Inflection> = {
      adjective: () => this.ingestAdjectiveInflection($, elt),
      adverb: () => this.ingestAdverbInflection(principalParts),
      noun: () => this.ingestNounInflection($, elt),
      prefix: () => this.ingestPrefixInflection(),
      preposition: () => this.ingestPrepositionInflection($, elt),
      pronoun: () => this.ingestPronounInflection($, elt),
      uninflected: () => this.ingestConjunctionInflection(),
      verb: () => this.ingestVerbInflection($, elt),
    };
    return (handlers[group] ?? (() => this.ingestConjunctionInflection()))();
  }

  /**
   * Parses forms for the given lexeme. Dispatches to POS-specific form parsers
   * for verbs and adverbs; falls back to the generic form-table parser.
   */
  parseForms(args: {
    $: cheerio.CheerioAPI;
    elt: AnyNode;
    lexeme: Lexeme;
    pos: PartOfSpeech;
    principalParts: PrincipalPart[];
  }): unknown {
    const { $, elt, lexeme, pos, principalParts } = args;
    const group = PartOfSpeechService.FORMS_GROUP[pos];
    const handlers: Record<string, () => unknown> = {
      adverb: () => this.ingestAdverbForms(principalParts),
      generic: () =>
        this.partOfSpeechFormsService.parseGenericForms({ $, elt, lexeme }),
      verb: () => this.partOfSpeechFormsService.parseVerbForms({ $, elt }),
    };
    return (handlers[group] ?? (() => null))();
  }
}
