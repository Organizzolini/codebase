/* cspell:words puella puellam puellamque aquave videsne vides neque atque denique amavisti amavisse amandi amatum */

import { describe, expect, it } from "vitest";

import {
  AdjectivalForm,
  AdverbForm,
  FiniteVerbForm,
  GerundForm,
  InfinitiveForm,
  Lexeme,
  NominalForm,
  ParticipleForm,
  SupineForm,
} from "@codebase/lexico-entities";

import { LexemeType } from "../lexemes/lexeme.entities";

import { LexemeSearchResult, SearchMatchSource } from "./search.entities";
import {
  decomposeEnclitic,
  formatFormIdentifier,
  toLatinMatchSource,
  toLexemeSearchResult,
  toRankedScore,
} from "./search.utilities";

describe("search utilities suite", () => {
  describe(decomposeEnclitic, () => {
    it("decomposes words ending in -que, -ve, -ne", () => {
      expect.hasAssertions();

      expect(decomposeEnclitic("puellamque")).toStrictEqual({
        enclitic: "que",
        stem: "puellam",
      });
      expect(decomposeEnclitic("aquave")).toStrictEqual({
        enclitic: "ve",
        stem: "aqua",
      });
      expect(decomposeEnclitic("videsne")).toStrictEqual({
        enclitic: "ne",
        stem: "vides",
      });
    });

    it("does not strip false positive stems like neque, atque, denique", () => {
      expect.hasAssertions();

      expect(decomposeEnclitic("neque")).toStrictEqual({
        enclitic: null,
        stem: "neque",
      });
      expect(decomposeEnclitic("atque")).toStrictEqual({
        enclitic: null,
        stem: "atque",
      });
      expect(decomposeEnclitic("denique")).toStrictEqual({
        enclitic: null,
        stem: "denique",
      });
    });

    it("returns unmodified word when no enclitic matches", () => {
      expect.hasAssertions();

      expect(decomposeEnclitic("amare")).toStrictEqual({
        enclitic: null,
        stem: "amare",
      });
    });
  });

  describe(formatFormIdentifier, () => {
    it("formats FiniteVerbForm", () => {
      expect.hasAssertions();

      const form = new FiniteVerbForm();
      form.person = "first";
      form.number = "singular";
      form.tense = "present";
      form.voice = "active";
      form.mood = "indicative";

      expect(formatFormIdentifier(form)).toBe(
        "first person singular present active indicative",
      );
    });

    it("formats 2nd and 3rd person correctly", () => {
      expect.hasAssertions();

      const form2 = new FiniteVerbForm();
      form2.person = "second";
      form2.number = "plural";
      form2.tense = "imperfect";
      form2.voice = "passive";
      form2.mood = "subjunctive";

      expect(formatFormIdentifier(form2)).toBe(
        "second person plural imperfect passive subjunctive",
      );

      const form3 = new FiniteVerbForm();
      form3.person = "third";
      form3.number = "singular";
      form3.tense = "future";
      form3.voice = "active";
      form3.mood = "imperative";

      expect(formatFormIdentifier(form3)).toBe(
        "third person singular future active imperative",
      );
    });

    it("formats NominalForm and AdjectivalForm", () => {
      expect.hasAssertions();

      const nominal = new NominalForm();
      nominal.case = "nominative";
      nominal.number = "singular";

      expect(formatFormIdentifier(nominal)).toBe("nominative singular");

      const adjectival = new AdjectivalForm();
      adjectival.case = "accusative";
      adjectival.number = "plural";
      adjectival.gender = "feminine";

      expect(formatFormIdentifier(adjectival)).toBe(
        "accusative plural feminine",
      );
    });

    it("formats ParticipleForm", () => {
      expect.hasAssertions();

      const participle = new ParticipleForm();
      participle.tense = "perfect";
      participle.voice = "passive";

      expect(formatFormIdentifier(participle)).toBe(
        "perfect passive participle",
      );
    });

    it("formats InfinitiveForm, GerundForm, SupineForm, and AdverbForm", () => {
      expect.hasAssertions();

      const infinitive = new InfinitiveForm();
      infinitive.tense = "present";
      infinitive.voice = "active";

      expect(formatFormIdentifier(infinitive)).toBe(
        "present active infinitive",
      );

      const gerund = new GerundForm();
      gerund.case = "genitive";

      expect(formatFormIdentifier(gerund)).toBe("genitive gerund");

      const supine = new SupineForm();
      supine.case = "accusative";

      expect(formatFormIdentifier(supine)).toBe("accusative supine");

      const adverb = new AdverbForm();
      adverb.degree = "positive";

      expect(formatFormIdentifier(adverb)).toBe("positive adverb");
    });

    it("returns null for non-matching form instances", () => {
      expect.hasAssertions();

      expect(formatFormIdentifier({} as unknown as NominalForm)).toBeNull();
    });

    it("formats finite verb form", () => {
      expect.hasAssertions();

      const form = new FiniteVerbForm();
      form.person = "first";
      form.number = "singular";
      form.tense = "present";
      form.voice = "active";
      form.mood = "indicative";

      expect(formatFormIdentifier(form)).toBe(
        "first person singular present active indicative",
      );
    });

    it("formats nominal form", () => {
      expect.hasAssertions();

      const form = new NominalForm();
      form.case = "nominative";
      form.number = "singular";

      expect(formatFormIdentifier(form)).toBe("nominative singular");
    });

    it("formats adjectival form", () => {
      expect.hasAssertions();

      const form = new AdjectivalForm();
      form.case = "accusative";
      form.number = "plural";
      form.gender = "feminine";

      expect(formatFormIdentifier(form)).toBe("accusative plural feminine");
    });

    it("formats participle form", () => {
      expect.hasAssertions();

      const form = new ParticipleForm();
      form.tense = "perfect";
      form.voice = "passive";

      expect(formatFormIdentifier(form)).toBe("perfect passive participle");
    });

    it("formats infinitive form", () => {
      expect.hasAssertions();

      const form = new InfinitiveForm();
      form.tense = "present";
      form.voice = "active";

      expect(formatFormIdentifier(form)).toBe("present active infinitive");
    });

    it("formats gerund form", () => {
      expect.hasAssertions();

      const form = new GerundForm();
      form.case = "genitive";

      expect(formatFormIdentifier(form)).toBe("genitive gerund");
    });

    it("formats supine form", () => {
      expect.hasAssertions();

      const form = new SupineForm();
      form.case = "accusative";

      expect(formatFormIdentifier(form)).toBe("accusative supine");
    });

    it("formats adverb form", () => {
      expect.hasAssertions();

      const form = new AdverbForm();
      form.degree = "comparative";

      expect(formatFormIdentifier(form)).toBe("comparative adverb");
    });
  });

  describe(toLatinMatchSource, () => {
    it("names the tier each Latin score comes from", () => {
      expect(
        [1, 0.9, 0.8, 0.7, 0.4].map((score) => toLatinMatchSource(score)),
      ).toStrictEqual([
        SearchMatchSource.LEMMA_EXACT,
        SearchMatchSource.WORD_EXACT,
        SearchMatchSource.ENCLITIC,
        SearchMatchSource.PREFIX,
        SearchMatchSource.FUZZY,
      ]);
    });

    it("reads a score no tier gives as a fuzzy match", () => {
      expect(toLatinMatchSource(0.55)).toBe(SearchMatchSource.FUZZY);
    });
  });

  describe(toRankedScore, () => {
    it("reads a negated numeric sort key back as the score", () => {
      expect(
        ["-1", "-0.9", -0.6].map((key) => toRankedScore(key)),
      ).toStrictEqual([1, 0.9, 0.6]);
    });
  });

  describe(toLexemeSearchResult, () => {
    it("maps a search match and the lexeme it matched to the result type", () => {
      expect.hasAssertions();

      const lexeme = Object.assign(new Lexeme(), {
        id: "lex-1",
        lemma: "puella",
      });
      const result = toLexemeSearchResult({
        enclitic: "que",
        identifiers: ["accusative singular"],
        lexeme,
        score: 3,
        source: SearchMatchSource.WORD_EXACT,
      });

      expect(result).toBeInstanceOf(LexemeSearchResult);
      expect(result).toMatchObject({
        enclitic: "que",
        identifiers: ["accusative singular"],
        score: 3,
        source: SearchMatchSource.WORD_EXACT,
      });
      expect(result.lexeme).toBeInstanceOf(LexemeType);
      expect(result.lexeme).toMatchObject({ id: "lex-1", lemma: "puella" });
    });
  });
});
