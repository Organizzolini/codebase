/* cspell:words puella */

import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { describe, expect, it, vi } from "vitest";

import { LiteratureService } from "./literature.service";
import { TokenWordLoader } from "./token-word.loader";

import type { Token, Word } from "@codebase/lexico-entities";

const amo = { data: "amo", id: "word-1" } as Word;
const puella = { data: "puella", id: "word-2" } as Word;

const TOKENS: readonly Token[] = [
  { data: "amo", id: "token-1", word: amo } as Token,
  { data: "puella", id: "token-2", word: puella } as Token,
  { data: ",", id: "token-3", isPunctuation: true, word: null } as Token,
];

/** Builds a loader whose service answers from TOKENS out of order. */
function createLoader(): {
  findTokensByIds: ReturnType<
    typeof vi.fn<LiteratureService["findTokensByIds"]>
  >;
  loader: TokenWordLoader;
} {
  const findTokensByIds = vi
    .fn<LiteratureService["findTokensByIds"]>()
    .mockImplementation(async (tokenIds) => {
      await Promise.resolve();
      return TOKENS.filter((token) => tokenIds.includes(token.id)).toReversed();
    });
  const loader = new TokenWordLoader(
    createMock<LiteratureService>({ findTokensByIds }),
  );
  return { findTokensByIds, loader };
}

describe(TokenWordLoader, () => {
  it("is provided per request by the Nest container", async () => {
    expect.hasAssertions();

    const module = await Test.createTestingModule({
      providers: [
        TokenWordLoader,
        {
          provide: LiteratureService,
          useValue: createMock<LiteratureService>(),
        },
      ],
    }).compile();

    const first = await module.resolve(TokenWordLoader, { id: 1 });
    const second = await module.resolve(TokenWordLoader, { id: 2 });

    expect(first).toBeInstanceOf(TokenWordLoader);
    expect(first).not.toBe(second);
  });

  it("coalesces every load in one tick into a single token query", async () => {
    expect.hasAssertions();

    const { findTokensByIds, loader } = createLoader();

    const words = await Promise.all(
      ["token-1", "token-2", "token-3", "token-missing"].map(async (tokenId) =>
        loader.byTokenId.load(tokenId),
      ),
    );

    expect(words).toStrictEqual([amo, puella, null, null]);
    expect(findTokensByIds).toHaveBeenCalledTimes(1);
    expect(findTokensByIds).toHaveBeenCalledWith([
      "token-1",
      "token-2",
      "token-3",
      "token-missing",
    ]);
  });

  it("caches a token's word for the rest of the request", async () => {
    expect.hasAssertions();

    const { findTokensByIds, loader } = createLoader();

    await expect(loader.byTokenId.load("token-1")).resolves.toBe(amo);
    await expect(loader.byTokenId.load("token-1")).resolves.toBe(amo);

    expect(findTokensByIds).toHaveBeenCalledTimes(1);
  });
});
