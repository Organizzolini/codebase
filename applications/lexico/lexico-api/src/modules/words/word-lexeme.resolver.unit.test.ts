/* cspell:words amo */

import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { Word } from "@codebase/lexico-entities";

import { WordLexemeType } from "./word-lexeme.entities";
import { WordLexemeResolver } from "./word-lexeme.resolver";
import { WordLinkLoader } from "./word-link.loader";
import { WordType } from "./word.entities";

import type { WordsService } from "./words.service";

describe(WordLexemeResolver, () => {
  let resolver: WordLexemeResolver;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        WordLexemeResolver,
        { provide: WordLinkLoader, useValue: createMock<WordLinkLoader>() },
      ],
    }).compile();

    resolver = await module.resolve(WordLexemeResolver);
  });

  it("is defined", () => {
    expect(resolver).toBeDefined();
  });

  it("resolves a word-lexeme link's word through the loader", async () => {
    expect.hasAssertions();

    const word = Object.assign(new Word(), { data: "amo", id: "word-1" });
    const loader = new WordLinkLoader(createMock<WordsService>());
    vi.spyOn(loader.byWordLexemeId, "load").mockResolvedValue(word);
    const wordLexemeResolver = new WordLexemeResolver(loader);

    const resolved = await wordLexemeResolver.word(
      Object.assign(new WordLexemeType(), { id: "word-lexeme-1" }),
    );

    expect(resolved).toBeInstanceOf(WordType);
    expect(resolved).toMatchObject({ data: "amo", id: "word-1" });
    expect(loader.byWordLexemeId.load).toHaveBeenCalledWith("word-lexeme-1");
  });
});
