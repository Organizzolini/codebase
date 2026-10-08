/* cspell:words amo amas */

import { createMock } from "@golevelup/ts-vitest";
import { describe, expect, it, vi } from "vitest";

import { Word, WordForm, WordLexeme } from "@codebase/lexico-entities";

import { WordLinkLoader } from "./word-link.loader";

import type { WordsService } from "./words.service";

const AMO = Object.assign(new Word(), { data: "amo", id: "word-1" });
const AMAS = Object.assign(new Word(), { data: "amas", id: "word-2" });

describe(WordLinkLoader, () => {
  it("batches word-form lookups into one query, answering in request order", async () => {
    expect.hasAssertions();

    const findWordFormsByIds = vi
      .fn<WordsService["findWordFormsByIds"]>()
      .mockResolvedValue([
        Object.assign(new WordForm(), { id: "word-form-2", word: AMAS }),
        Object.assign(new WordForm(), { id: "word-form-1", word: AMO }),
      ]);
    const loader = new WordLinkLoader(
      createMock<WordsService>({ findWordFormsByIds }),
    );

    const words = await Promise.all([
      loader.byWordFormId.load("word-form-1"),
      loader.byWordFormId.load("word-form-2"),
    ]);

    expect(words).toStrictEqual([AMO, AMAS]);
    expect(findWordFormsByIds).toHaveBeenCalledTimes(1);
    expect(findWordFormsByIds).toHaveBeenCalledWith([
      "word-form-1",
      "word-form-2",
    ]);
  });

  it("batches word-lexeme lookups into one query", async () => {
    expect.hasAssertions();

    const findWordLexemesByIds = vi
      .fn<WordsService["findWordLexemesByIds"]>()
      .mockResolvedValue([
        Object.assign(new WordLexeme(), { id: "word-lexeme-1", word: AMO }),
      ]);
    const loader = new WordLinkLoader(
      createMock<WordsService>({ findWordLexemesByIds }),
    );

    await expect(loader.byWordLexemeId.load("word-lexeme-1")).resolves.toBe(
      AMO,
    );
    expect(findWordLexemesByIds).toHaveBeenCalledWith(["word-lexeme-1"]);
  });

  it("rejects a link that no longer resolves to a word", async () => {
    expect.hasAssertions();

    const loader = new WordLinkLoader(
      createMock<WordsService>({
        findWordFormsByIds: vi
          .fn<WordsService["findWordFormsByIds"]>()
          .mockResolvedValue([]),
      }),
    );

    await expect(loader.byWordFormId.load("word-form-9")).rejects.toThrow(
      "Link word-form-9 has no word",
    );
  });
});
