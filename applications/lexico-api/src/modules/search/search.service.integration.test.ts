/* cspell:words absque atque bonis bonisve denique diligo FULLTEXT neque puella puellam puellamque quinque vides videsne vocabant voco */

import { createMock } from "@golevelup/ts-vitest";
import { describe, expect, it, vi } from "vitest";

import {
  FiniteVerbForm,
  Lexeme,
  NominalForm,
  Translation,
  Word,
  WordForm,
  WordLexeme,
} from "@codebase/lexico-entities";

import { createRepositoryMock } from "../../../testing/mocks";
import { MacronsService } from "../macrons/macrons.service";

import { SearchMatchSource } from "./search.entities";
import { SearchService } from "./search.service";

import type { LoggerService } from "@codebase/logger";

describe("search service integration suite", () => {
  it("integrates Latin dictionary search across exact lemma, word forms, prefix, and enclitic parsing", async () => {
    expect.hasAssertions();

    const puellaLexeme = new Lexeme();
    puellaLexeme.id = "lex-puella";
    puellaLexeme.lemma = "puella";
    puellaLexeme.partOfSpeech = "noun";
    puellaLexeme.translations = [new Translation("girl", puellaLexeme)];

    const amoLexeme = new Lexeme();
    amoLexeme.id = "lex-amo";
    amoLexeme.lemma = "amo";
    amoLexeme.partOfSpeech = "verb";

    const nominalForm = new NominalForm();
    nominalForm.case = "accusative";
    nominalForm.number = "singular";

    const wordForm = new WordForm();
    wordForm.form = nominalForm;

    const wordLexeme = new WordLexeme();
    wordLexeme.lexeme = puellaLexeme;

    const puellamWord = new Word();
    puellamWord.id = "word-1";
    puellamWord.data = "puellam";
    puellamWord.wordForms = [wordForm];
    puellamWord.wordLexemes = [wordLexeme];

    const mockLexemeRepo = createRepositoryMock<Lexeme>();
    const mockWordRepo = createRepositoryMock<Word>();
    const mockTranslationRepo = createRepositoryMock<Translation>();

    const lexemeQb = mockLexemeRepo.createQueryBuilder();
    vi.spyOn(lexemeQb, "getMany").mockResolvedValue([puellaLexeme]);

    const wordQb = mockWordRepo.createQueryBuilder();
    vi.spyOn(wordQb, "getMany").mockResolvedValue([puellamWord]);

    const service = new SearchService(
      mockLexemeRepo,
      mockWordRepo,
      mockTranslationRepo,
      new MacronsService(),
      createMock<LoggerService>(),
    );

    const result = await service.searchLatin("puellamque");

    expect(result.edges.length).toBeGreaterThan(0);
    expect(result.totalCount).toBe(1);
    expect(result.edges[0]?.node.enclitic).toBe("que");
    expect(result.edges[0]?.node.identifiers).toContain("accusative singular");
    expect(result.edges[0]?.node.lexeme.id).toBe("lex-puella");
    expect(result.pageInfo.startCursor).toBeDefined();
    expect(result.pageInfo.endCursor).toBeDefined();
  });

  it("integrates Relay keyset pagination forward and backward on multi-page search results", async () => {
    expect.hasAssertions();

    const lexemes = Array.from({ length: 5 }, (_, index) => {
      const lexeme = new Lexeme();
      lexeme.id = `lex-${index + 1}`;
      lexeme.lemma = `word${index + 1}`;
      lexeme.partOfSpeech = "noun";
      lexeme.translations = [new Translation(`meaning ${index + 1}`, lexeme)];
      return lexeme;
    });

    const mockLexemeRepo = createRepositoryMock<Lexeme>();
    const mockWordRepo = createRepositoryMock<Word>();
    const mockTranslationRepo = createRepositoryMock<Translation>();

    const lexemeQb = mockLexemeRepo.createQueryBuilder();
    vi.spyOn(lexemeQb, "getMany").mockResolvedValue(lexemes);

    const service = new SearchService(
      mockLexemeRepo,
      mockWordRepo,
      mockTranslationRepo,
      new MacronsService(),
      createMock<LoggerService>(),
    );

    // Forward pagination: Page 1 (first: 2)
    const page1 = await service.searchLatin("word", { first: 2 });

    expect(page1.edges).toHaveLength(2);
    expect(page1.pageInfo.hasNextPage).toBe(true);
    expect(page1.pageInfo.hasPreviousPage).toBe(false);

    // Forward pagination: Page 2 (first: 2, after: page1.endCursor)
    const page2 = await service.searchLatin("word", {
      after: page1.pageInfo.endCursor,
      first: 2,
    });

    expect(page2.edges).toHaveLength(2);
    expect(page2.pageInfo.hasNextPage).toBe(true);
    expect(page2.pageInfo.hasPreviousPage).toBe(true);

    // Forward pagination: Page 3 (first: 2, after: page2.endCursor)
    const page3 = await service.searchLatin("word", {
      after: page2.pageInfo.endCursor,
      first: 2,
    });

    expect(page3.edges).toHaveLength(1);
    expect(page3.pageInfo.hasNextPage).toBe(false);
    expect(page3.pageInfo.hasPreviousPage).toBe(true);

    // Backward pagination: (last: 2, before: page3.startCursor)
    const backwardPage = await service.searchLatin("word", {
      before: page3.pageInfo.startCursor,
      last: 2,
    });

    expect(backwardPage.edges).toHaveLength(2);
    expect(backwardPage.edges[0]?.node.lexeme.id).toBe(
      page2.edges[0]?.node.lexeme.id,
    );
  });

  it("integrates English full-text search with database ranking and lexeme hydration", async () => {
    expect.hasAssertions();

    const lexemeAmo = new Lexeme();
    lexemeAmo.id = "lex-amo";
    lexemeAmo.lemma = "amo";

    const lexemeDiligo = new Lexeme();
    lexemeDiligo.id = "lex-diligo";
    lexemeDiligo.lemma = "diligo";

    lexemeAmo.translations = [
      new Translation("love, to cherish", lexemeAmo),
      new Translation("beloved, dear", lexemeAmo),
    ];
    lexemeDiligo.translations = [new Translation("love", lexemeDiligo)];

    const mockLexemeRepo = createRepositoryMock<Lexeme>();
    const mockWordRepo = createRepositoryMock<Word>();
    const mockTranslationRepo = createRepositoryMock<Translation>();

    const translationQb = mockTranslationRepo.createQueryBuilder();
    vi.spyOn(translationQb, "getRawMany").mockResolvedValue([
      { lexemeId: "lex-diligo", score: "1" },
      { lexemeId: "lex-amo", score: "0.8" },
    ]);

    const lexemeQb = mockLexemeRepo.createQueryBuilder();
    vi.spyOn(lexemeQb, "getMany").mockResolvedValue([lexemeAmo, lexemeDiligo]);

    const service = new SearchService(
      mockLexemeRepo,
      mockWordRepo,
      mockTranslationRepo,
      new MacronsService(),
      createMock<LoggerService>(),
    );

    const result = await service.searchEnglish("love");

    expect(result.edges).toHaveLength(2);
    expect(result.totalCount).toBe(2);
    // Exact match lex-diligo ("love") should rank before prefix match lex-amo ("love, to cherish")
    expect(result.edges[0]?.node.lexeme.id).toBe("lex-diligo");
    expect(result.edges[0]?.node.score).toBe(1);
    expect(result.edges[1]?.node.lexeme.id).toBe("lex-amo");
    expect(result.edges[1]?.node.score).toBe(0.8);
    expect(result.edges[0]?.node.source).toBe(
      SearchMatchSource.TRANSLATION_FULLTEXT,
    );
  });

  it("handles finite verb morphological identifier resolution in search", async () => {
    expect.hasAssertions();

    const lexeme = new Lexeme();
    lexeme.id = "lex-voco";
    lexeme.lemma = "voco";
    lexeme.translations = [new Translation("call", lexeme)];

    const verbForm = new FiniteVerbForm();
    verbForm.person = "third";
    verbForm.number = "plural";
    verbForm.tense = "imperfect";
    verbForm.voice = "active";
    verbForm.mood = "indicative";

    const wordForm = new WordForm();
    wordForm.form = verbForm;

    const wordLexeme = new WordLexeme();
    wordLexeme.lexeme = lexeme;

    const word = new Word();
    word.id = "word-vocabant";
    word.data = "vocabant";
    word.wordForms = [wordForm];
    word.wordLexemes = [wordLexeme];

    const mockLexemeRepo = createRepositoryMock<Lexeme>();
    const mockWordRepo = createRepositoryMock<Word>();
    const mockTranslationRepo = createRepositoryMock<Translation>();

    const wordQb = mockWordRepo.createQueryBuilder();
    vi.spyOn(wordQb, "getMany").mockResolvedValue([word]);

    const service = new SearchService(
      mockLexemeRepo,
      mockWordRepo,
      mockTranslationRepo,
      new MacronsService(),
      createMock<LoggerService>(),
    );

    const result = await service.searchLatin("vocabant");

    expect(result.edges).toHaveLength(1);
    expect(result.edges[0]?.node.identifiers).toContain(
      "third person plural imperfect active indicative",
    );
  });
});
