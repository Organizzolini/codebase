/* cspell:words amo */

import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { Word } from "@codebase/lexico-entities";

import { WordFormType } from "./word-form.entities";
import { WordFormResolver } from "./word-form.resolver";
import { WordLinkLoader } from "./word-link.loader";
import { WordType } from "./word.entities";

import type { WordsService } from "./words.service";

describe(WordFormResolver, () => {
  let resolver: WordFormResolver;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        WordFormResolver,
        { provide: WordLinkLoader, useValue: createMock<WordLinkLoader>() },
      ],
    }).compile();

    resolver = await module.resolve(WordFormResolver);
  });

  it("is defined", () => {
    expect(resolver).toBeDefined();
  });

  it("resolves a word-form link's word through the loader", async () => {
    expect.hasAssertions();

    const word = Object.assign(new Word(), { data: "amo", id: "word-1" });
    const loader = new WordLinkLoader(createMock<WordsService>());
    vi.spyOn(loader.byWordFormId, "load").mockResolvedValue(word);
    const wordFormResolver = new WordFormResolver(loader);

    const resolved = await wordFormResolver.word(
      Object.assign(new WordFormType(), { id: "word-form-1" }),
    );

    expect(resolved).toBeInstanceOf(WordType);
    expect(resolved).toMatchObject({ data: "amo", id: "word-1" });
    expect(loader.byWordFormId.load).toHaveBeenCalledWith("word-form-1");
  });
});
