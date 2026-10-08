/* cspell:words multa arma virumque cano Troiae primus oris Italiam fato profugus Laviniaque venit litora multum ille terris iactatus alto superum saevae memorem Iunonis iram quoque bello passus conderet urbem Georgica quid faciat laetas segetes */

import { Author, Line, Text, Token, Word } from "@codebase/lexico-entities";

import type { DataSource } from "typeorm";

/** The opening of the Aeneid, one entry per line, in reading order. */
export const PASSAGE_LINES = [
  "arma virumque cano, Troiae qui primus ab oris",
  "Italiam fato profugus Laviniaque venit",
  "litora, multum ille et terris iactatus et alto",
  "vi superum, saevae memorem Iunonis ob iram;",
  "multa quoque et bello passus, dum conderet urbem",
] as const;

/** A line of another text, which no Aeneid query may return. */
const OTHER_TEXT_LINE = "quid faciat laetas segetes";

/** Line indices in the order they are inserted, deliberately not sorted. */
const INSERTION_ORDER = [3, 0, 4, 1, 2] as const;

/** One token as a reader would see it, with the word it should resolve to. */
export interface PassageToken {
  readonly data: string;
  readonly isPunctuation: boolean;
  readonly word: null | string;
}

/** The seeded passage: its text, its lines by index, and the other text. */
export interface ReadingPassage {
  readonly lines: readonly Line[];
  readonly otherText: Text;
  readonly text: Text;
}

/**
 * Splits a line into word, whitespace, and punctuation tokens. Whitespace and
 * punctuation are both markers: flagged as punctuation, with no word.
 */
export function tokenizePassageLine(line: string): PassageToken[] {
  return (line.match(/[^\s,;]+|\s+|[,;]/gu) ?? []).map((data) => {
    const isPunctuation = /^[\s,;]+$/u.test(data);
    return { data, isPunctuation, word: isPunctuation ? null : data };
  });
}

/** Every token of the passage, in reading order. */
export const PASSAGE_TOKENS = PASSAGE_LINES.map((line) =>
  tokenizePassageLine(line),
);

/** The seeded line at an index, failing loudly rather than going vacuous. */
export function passageLineAt(passage: ReadingPassage, index: number): Line {
  const line = passage.lines[index];
  if (!line) {
    throw new Error(`The reading passage has no line ${String(index)}`);
  }
  return line;
}

/** The expected tokens of a passage line, failing loudly when there is none. */
export function passageTokensAt(index: number): PassageToken[] {
  const tokens = PASSAGE_TOKENS[index];
  if (!tokens) {
    throw new Error(`The reading passage has no line ${String(index)}`);
  }
  return tokens;
}

/**
 * Seeds the Aeneid's opening lines, out of index order, with every token
 * linked to its dictionary word, beside a second text by the same author.
 */
export async function seedReadingPassage(
  dataSource: DataSource,
): Promise<ReadingPassage> {
  const author = await dataSource
    .getRepository(Author)
    .save(Object.assign(new Author(), { name: "Vergil", slug: "vergil" }));
  const [text, otherText] = await dataSource.getRepository(Text).save([
    Object.assign(new Text(), {
      author,
      slug: "aeneid",
      title: "Aeneid",
      type: "poem",
    }),
    Object.assign(new Text(), {
      author,
      slug: "georgics",
      title: "Georgica",
      type: "poem",
    }),
  ]);
  if (!text || !otherText) {
    throw new Error("Seeding the passage's texts saved nothing");
  }

  const words = await seedWords(dataSource);
  const lines: Line[] = [];
  for (const index of INSERTION_ORDER) {
    lines[index] = await seedLine(dataSource, words, {
      author,
      data: PASSAGE_LINES[index],
      index,
      text,
    });
  }
  await seedLine(dataSource, words, {
    author,
    data: OTHER_TEXT_LINE,
    index: 0,
    text: otherText,
  });

  return { lines, otherText, text };
}

/** Saves one line and its tokens, each linked to its word. */
async function seedLine(
  dataSource: DataSource,
  words: ReadonlyMap<string, Word>,
  line: { author: Author; data: string; index: number; text: Text },
): Promise<Line> {
  const saved = await dataSource
    .getRepository(Line)
    .save(Object.assign(new Line(), { ...line, label: `1.${line.index + 1}` }));
  // 🔀 Saved last token first, so only an ORDER BY can put them in reading order.
  await dataSource.getRepository(Token).save(
    tokenizePassageLine(line.data)
      .map((token, index) =>
        Object.assign(new Token(), {
          author: line.author,
          data: token.data,
          index,
          isPunctuation: token.isPunctuation,
          line: saved,
          text: line.text,
          word: token.word === null ? null : words.get(token.word),
        }),
      )
      .toReversed(),
  );
  return saved;
}

/** Saves one dictionary word for every distinct word token. */
async function seedWords(
  dataSource: DataSource,
): Promise<ReadonlyMap<string, Word>> {
  const distinct = new Set(
    [...PASSAGE_LINES, OTHER_TEXT_LINE]
      .flatMap((line) => tokenizePassageLine(line))
      .flatMap((token) => (token.word === null ? [] : [token.word])),
  );
  const saved = await dataSource
    .getRepository(Word)
    .save([...distinct].map((data) => Object.assign(new Word(), { data })));
  return new Map(saved.map((word) => [word.data, word]));
}
