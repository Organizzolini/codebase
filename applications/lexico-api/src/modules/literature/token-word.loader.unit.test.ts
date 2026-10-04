import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { LiteratureService } from "./literature.service";
import { TokenWordLoader } from "./token-word.loader";

import type { Token, Word } from "@codebase/lexico-entities";

describe(TokenWordLoader, () => {
  let service: TokenWordLoader;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TokenWordLoader,
        {
          provide: LiteratureService,
          useValue: createMock<LiteratureService>(),
        },
      ],
    }).compile();

    service = await module.resolve(TokenWordLoader);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("loads a single token word mapping", async () => {
    expect.hasAssertions();

    const word = { data: "amo", id: "word-1" } as Word;

    const token = { data: "amo", id: "token-1", word } as Token;

    const tokenNoWord = { data: "et", id: "token-2" } as Token;

    const tokenUndefinedWord = {
      data: "null",
      id: "token-3",
      word: undefined,
    } as unknown as Token;

    const mockLiteratureService = createMock<LiteratureService>({
      findTokensByIds: vi
        .fn<LiteratureService["findTokensByIds"]>()
        .mockImplementation(async (ids) => {
          await Promise.resolve();
          const result: Token[] = [];
          if (ids.includes("token-1")) {
            result.push(token);
          }
          if (ids.includes("token-2")) {
            result.push(tokenNoWord);
          }
          if (ids.includes("token-3")) {
            result.push(tokenUndefinedWord);
          }
          return result;
        }),
    });

    const loader = new TokenWordLoader(mockLiteratureService);

    await expect(loader.loadTokenWord("token-1")).resolves.toBe(word);
    await expect(loader.loadTokenWord("token-2")).resolves.toBeNull();
    await expect(loader.loadTokenWord("token-3")).resolves.toBeNull();
    await expect(loader.loadTokenWord("token-missing")).resolves.toBeNull();

    await expect(loader.byTokenId.load("token-1")).resolves.toBe(word);
    await expect(loader.byTokenId.loadMany(["token-1"])).resolves.toStrictEqual(
      [word],
    );
  });

  it("loads token word mappings for a batch of token IDs", async () => {
    expect.hasAssertions();

    const word1 = { data: "amo", id: "word-1" } as Word;

    const token1 = { data: "amo", id: "token-1", word: word1 } as Token;

    const token2 = { data: "et", id: "token-2" } as Token;

    const tokenWithUndefinedWord = {
      id: "token-3",
      word: undefined,
    } as unknown as Token;

    const tokenWithNullWord = {
      id: "token-4",
      word: null,
    } as unknown as Token;

    const mockLiteratureService = createMock<LiteratureService>({
      findTokensByIds: vi
        .fn<LiteratureService["findTokensByIds"]>()
        .mockResolvedValue([
          token1,
          token2,
          tokenWithUndefinedWord,
          tokenWithNullWord,
        ]),
    });

    const loader = new TokenWordLoader(mockLiteratureService);

    await expect(loader.loadTokenWords([])).resolves.toStrictEqual([]);
    await expect(
      loader.loadTokenWords([
        "token-1",
        "token-2",
        "token-3",
        "token-4",
        "token-5",
      ]),
    ).resolves.toStrictEqual([word1, null, null, null, null]);
  });
});
