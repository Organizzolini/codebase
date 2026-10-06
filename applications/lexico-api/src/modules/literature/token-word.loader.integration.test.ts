/* cspell:words arma virumque cano */

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { Author, Line, Text, Token, Word } from "@codebase/lexico-entities";

import {
  DATABASE_TIMEOUT_MILLISECONDS,
  type LexicoTestDatabase,
  startLexicoTestDatabase,
} from "../../../testing/database";

import { LiteratureService } from "./literature.service";
import { TokenWordLoader } from "./token-word.loader";
import { TokensResolver } from "./tokens.resolver";

import type { Repository } from "typeorm";

/** Each token of the seeded line, with the word it should resolve to. */
const LINE_TOKENS = [
  { data: "arma", isPunctuation: false, word: "arma" },
  { data: "virumque", isPunctuation: false, word: "virumque" },
  { data: "cano", isPunctuation: false, word: "cano" },
  { data: ",", isPunctuation: true, word: null },
] as const;

describe("token word loader integration suite", () => {
  let database: LexicoTestDatabase;
  let service: LiteratureService;
  let tokenRepository: Repository<Token>;
  let line: Line;

  beforeAll(async () => {
    database = await startLexicoTestDatabase([Author, Line, Text, Token, Word]);
    tokenRepository = database.repository(Token);
    service = new LiteratureService(
      database.repository(Author),
      database.repository(Line),
      database.repository(Text),
      tokenRepository,
      database.repository(Word),
    );

    const author = await database
      .repository(Author)
      .save(Object.assign(new Author(), { name: "Vergil", slug: "vergil" }));
    const text = await database.repository(Text).save(
      Object.assign(new Text(), {
        author,
        slug: "aeneid",
        title: "Aeneid",
        type: "poem",
      }),
    );
    line = await database.repository(Line).save(
      Object.assign(new Line(), {
        author,
        data: "arma virumque cano,",
        index: 0,
        label: "1.1",
        text,
      }),
    );

    const words = database.repository(Word);
    await tokenRepository.save(
      await Promise.all(
        LINE_TOKENS.map(async (entry, index) =>
          Object.assign(new Token(), {
            author,
            data: entry.data,
            index,
            isPunctuation: entry.isPunctuation,
            line,
            text,
            word: entry.word
              ? await words.save(
                  Object.assign(new Word(), { data: entry.word }),
                )
              : null,
          }),
        ),
      ),
    );
  }, DATABASE_TIMEOUT_MILLISECONDS);

  afterAll(async () => {
    await database.stop();
  }, DATABASE_TIMEOUT_MILLISECONDS);

  it("resolves every token of a line's words in one query", async () => {
    expect.hasAssertions();

    const tokens = await tokenRepository.find({
      order: { index: "ASC" },
      where: { line: { id: line.id } },
    });
    const find = vi.spyOn(tokenRepository, "find");
    const resolver = new TokensResolver(service, new TokenWordLoader(service));

    const words = await Promise.all(
      tokens.map(async (token) => resolver.resolveTokenWord(token)),
    );

    expect(words.map((word) => word?.data ?? null)).toStrictEqual(
      LINE_TOKENS.map((entry) => entry.word),
    );
    expect(find).toHaveBeenCalledTimes(1);

    find.mockRestore();
  });

  it("reuses the word relation a line's token listing already loaded", async () => {
    expect.hasAssertions();

    const tokens = await service.listTokensForLine(line.id);
    const find = vi.spyOn(tokenRepository, "find");
    const resolver = new TokensResolver(service, new TokenWordLoader(service));

    const words = await Promise.all(
      tokens.map(async (token) => resolver.resolveTokenWord(token)),
    );

    expect(words.map((word) => word?.data ?? null)).toStrictEqual(
      LINE_TOKENS.map((entry) => entry.word),
    );
    expect(find).not.toHaveBeenCalled();

    find.mockRestore();
  });
});
