/* cspell:words puellam puellamque aquave videsne vides neque atque denique amavisti amavisse amandi amatum */

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

import {
  SCORE_LEMMA_EXACT,
  SCORE_PREFIX,
  SCORE_WORD_EXACT,
} from "./search.constants";
import { type LexemeSearchResult, SearchMatchSource } from "./search.entities";
import {
  calculateEnglishMatchScore,
  decomposeEnclitic,
  formatFormIdentifier,
  mergeSearchResult,
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

  describe(calculateEnglishMatchScore, () => {
    it("assigns higher score for exact match and prefix match", () => {
      expect.hasAssertions();

      const exactScore = calculateEnglishMatchScore("love", "love");
      const prefixScore = calculateEnglishMatchScore("love, adore", "love");
      const fullTextScore = calculateEnglishMatchScore("to love", "love");

      expect(exactScore).toBe(1);
      expect(prefixScore).toBe(0.8);
      expect(fullTextScore).toBe(0.6);
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

  describe(mergeSearchResult, () => {
    it("adds candidate to empty map", () => {
      expect.hasAssertions();

      const map = new Map<string, LexemeSearchResult>();
      const lexeme = new Lexeme();
      lexeme.id = "lex-1";

      const candidate: LexemeSearchResult = {
        enclitic: "que",
        identifiers: ["nominative singular"],
        lexeme,
        score: SCORE_WORD_EXACT,
        source: SearchMatchSource.WORD_EXACT,
      };

      mergeSearchResult(map, candidate);

      expect(map.get("lex-1")).toStrictEqual(candidate);
    });

    it("upgrades result when higher score candidate is merged", () => {
      expect.hasAssertions();

      const map = new Map<string, LexemeSearchResult>();
      const lexeme = new Lexeme();
      lexeme.id = "lex-1";

      const lowerCandidate: LexemeSearchResult = {
        enclitic: "que",
        identifiers: ["prefix match"],
        lexeme,
        score: SCORE_PREFIX,
        source: SearchMatchSource.PREFIX,
      };
      const higherCandidate: LexemeSearchResult = {
        enclitic: null,
        identifiers: ["exact match"],
        lexeme,
        score: SCORE_LEMMA_EXACT,
        source: SearchMatchSource.LEMMA_EXACT,
      };

      mergeSearchResult(map, lowerCandidate);
      mergeSearchResult(map, higherCandidate);

      const merged = map.get("lex-1");

      expect(merged?.score).toBe(SCORE_LEMMA_EXACT);
      expect(merged?.enclitic).toBe("que");
      expect(merged?.identifiers).toContain("prefix match");
      expect(merged?.identifiers).toContain("exact match");

      const map2 = new Map<string, LexemeSearchResult>();
      mergeSearchResult(map2, {
        enclitic: null,
        identifiers: lowerCandidate.identifiers,
        lexeme: lowerCandidate.lexeme,
        score: lowerCandidate.score,
        source: lowerCandidate.source,
      });
      mergeSearchResult(map2, {
        enclitic: null,
        identifiers: higherCandidate.identifiers,
        lexeme: higherCandidate.lexeme,
        score: higherCandidate.score,
        source: higherCandidate.source,
      });

      expect(map2.get("lex-1")?.enclitic).toBeNull();

      const map3 = new Map<string, LexemeSearchResult>();
      mergeSearchResult(map3, {
        enclitic: null,
        identifiers: lowerCandidate.identifiers,
        lexeme: lowerCandidate.lexeme,
        score: lowerCandidate.score,
        source: lowerCandidate.source,
      });
      mergeSearchResult(map3, {
        enclitic: "ne",
        identifiers: higherCandidate.identifiers,
        lexeme: higherCandidate.lexeme,
        score: higherCandidate.score,
        source: higherCandidate.source,
      });

      expect(map3.get("lex-1")?.enclitic).toBe("ne");
    });

    it("preserves higher score when lower score candidate is merged with enclitic", () => {
      expect.hasAssertions();

      const map = new Map<string, LexemeSearchResult>();
      const lexeme = new Lexeme();
      lexeme.id = "lex-1";

      const higherCandidate: LexemeSearchResult = {
        enclitic: null,
        identifiers: ["exact match"],
        lexeme,
        score: SCORE_LEMMA_EXACT,
        source: SearchMatchSource.LEMMA_EXACT,
      };
      const lowerCandidate: LexemeSearchResult = {
        enclitic: "ne",
        identifiers: ["prefix match"],
        lexeme,
        score: SCORE_PREFIX,
        source: SearchMatchSource.PREFIX,
      };

      mergeSearchResult(map, higherCandidate);
      mergeSearchResult(map, lowerCandidate);

      const merged = map.get("lex-1");

      expect(merged?.score).toBe(SCORE_LEMMA_EXACT);
      expect(merged?.enclitic).toBe("ne");
      expect(merged?.identifiers).toContain("exact match");
      expect(merged?.identifiers).toContain("prefix match");

      // Lower candidate with no enclitic merged into existing with enclitic
      mergeSearchResult(map, {
        enclitic: null,
        identifiers: lowerCandidate.identifiers,
        lexeme: lowerCandidate.lexeme,
        score: lowerCandidate.score,
        source: lowerCandidate.source,
      });

      expect(map.get("lex-1")?.enclitic).toBe("ne");

      // Lower candidate with enclitic merged into existing that already has enclitic
      mergeSearchResult(map, {
        enclitic: "ve",
        identifiers: lowerCandidate.identifiers,
        lexeme: lowerCandidate.lexeme,
        score: lowerCandidate.score,
        source: lowerCandidate.source,
      });

      expect(map.get("lex-1")?.enclitic).toBe("ne");
    });
  });
});
