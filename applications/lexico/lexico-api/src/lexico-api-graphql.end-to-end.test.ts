/* cspell:words Aeneid arma cano puella puellam vergil virumque */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";

import {
  Author,
  Lexeme,
  Line,
  NominalForm,
  NounInflection,
  PrincipalPart,
  Pronunciation,
  Text,
  Token,
  Translation,
  Word,
  WordForm,
  WordLexeme,
} from "@codebase/lexico-entities";
import { LoggerModule } from "@codebase/logging";

import { DATABASE_TIMEOUT_MILLISECONDS } from "../testing/database";
import {
  type LexicoGraphqlApplication,
  startLexicoGraphqlApplication,
} from "../testing/graphql-application";

import { LexemesModule } from "./modules/lexemes/lexemes.module";
import { LiteratureModule } from "./modules/literature/literature.module";
import { SearchModule } from "./modules/search/search.module";
import { WordsModule } from "./modules/words/words.module";

import type { RepositoryOf } from "../testing/word-lookups";

/** The fields of one type, as an introspection query returns them. */
const introspectedTypeSchema = z.object({
  fields: z.array(z.object({ name: z.string() })),
});

/** The id and audit columns every soft-deletable type exposes. */
const AUDIT_FIELDS = [
  "createdAt",
  "createdBy",
  "deletedAt",
  "deletedBy",
  "id",
  "updatedAt",
  "updatedBy",
] as const;

/** The rows the suite seeds, by what each query looks them up with. */
interface Seeded {
  readonly lexeme: Lexeme;
}

/**
 * Seeds one noun with every relation a lexeme exposes, the inflected word
 * that links back to it, and a line of literature whose token is that word.
 */
async function seed(repository: RepositoryOf): Promise<Seeded> {
  const lexeme = new Lexeme();
  lexeme.lemma = "puella";
  lexeme.partOfSpeech = "noun";
  const form = new NominalForm();
  form.case = "accusative";
  form.number = "singular";
  lexeme.forms = [form];
  const inflection = new NounInflection();
  inflection.declension = "first";
  inflection.gender = "feminine";
  lexeme.inflection = inflection;
  const principalPart = new PrincipalPart();
  principalPart.name = "nominative";
  principalPart.text = ["puella"];
  lexeme.principalParts = [principalPart];
  const pronunciation = new Pronunciation();
  pronunciation.variant = "classical";
  pronunciation.phonemic = "/ˈpu.el.la/";
  lexeme.pronunciations = [pronunciation];
  lexeme.translations = [new Translation("girl", lexeme)];
  const savedLexeme = await repository(Lexeme).save(lexeme);

  const word = new Word();
  word.data = "puellam";
  const savedWord = await repository(Word).save(word);
  const wordForm = new WordForm();
  wordForm.form = form;
  wordForm.word = savedWord;
  await repository(WordForm).save(wordForm);
  const wordLexeme = new WordLexeme();
  wordLexeme.lexeme = savedLexeme;
  wordLexeme.word = savedWord;
  await repository(WordLexeme).save(wordLexeme);

  await seedLiterature(repository, savedWord);

  return { lexeme: savedLexeme };
}

/** Seeds an author, a work with one book, and one line whose token is `word`. */
async function seedLiterature(
  repository: RepositoryOf,
  word: Word,
): Promise<void> {
  const author = new Author();
  author.name = "Vergil";
  author.slug = "vergil";
  author.metadata = { era: "augustan" };
  const savedAuthor = await repository(Author).save(author);

  const work = new Text();
  work.author = savedAuthor;
  work.slug = "vergil/aeneid";
  work.title = "Aeneid";
  work.type = "text";
  work.metadata = { books: 12 };
  const savedWork = await repository(Text).save(work);

  const book = new Text();
  book.author = savedAuthor;
  book.parentText = savedWork;
  book.slug = "vergil/aeneid/1";
  book.title = "Book I";
  book.type = "book";
  const savedBook = await repository(Text).save(book);

  const line = new Line();
  line.author = savedAuthor;
  line.text = savedBook;
  line.data = "arma virumque cano puellam";
  line.index = 0;
  line.label = "1";
  const savedLine = await repository(Line).save(line);

  const token = new Token();
  token.author = savedAuthor;
  token.line = savedLine;
  token.text = savedBook;
  token.data = "puellam";
  token.index = 0;
  token.isPunctuation = false;
  token.word = word;
  await repository(Token).save(token);
}

/**
 * Sends requests through the whole GraphQL API — every resolver module, the
 * Apollo driver, and the interface type resolution — against a real
 * `lexico_testing` database built by lexico's migrations.
 */
describe("lexico api graphql end-to-end suite", () => {
  let application: LexicoGraphqlApplication;
  let seeded: Seeded;

  beforeAll(async () => {
    application = await startLexicoGraphqlApplication([
      LoggerModule,
      LexemesModule,
      LiteratureModule,
      SearchModule,
      WordsModule,
    ]);
    seeded = await seed(application.repository);
  }, DATABASE_TIMEOUT_MILLISECONDS);

  afterAll(async () => {
    await application.stop();
  }, DATABASE_TIMEOUT_MILLISECONDS);

  it("returns a lexeme with each relation and resolves its interface types", async () => {
    expect.hasAssertions();

    const response = await application.query(
      `query ($id: ID!) {
        lexeme(id: $id) {
          __typename
          id
          lemma
          partOfSpeech
          disambiguator
          createdAt
          createdBy
          forms { __typename id ... on NominalForm { case number } }
          inflection { __typename id ... on NounInflection { declension gender } }
          principalParts { name text }
          pronunciations { variant phonemic }
          translations { data }
        }
      }`,
      { id: seeded.lexeme.id },
    );

    expect(response.errors).toBeUndefined();
    expect(response.data).toStrictEqual({
      lexeme: {
        __typename: "Lexeme",
        createdAt: expect.any(String),
        createdBy: null,
        disambiguator: 0,
        forms: [
          {
            __typename: "NominalForm",
            case: "accusative",
            id: expect.any(String),
            number: "singular",
          },
        ],
        id: seeded.lexeme.id,
        inflection: {
          __typename: "NounInflection",
          declension: "first",
          gender: "feminine",
          id: expect.any(String),
        },
        lemma: "puella",
        partOfSpeech: "noun",
        principalParts: [{ name: "nominative", text: ["puella"] }],
        pronunciations: [{ phonemic: "/ˈpu.el.la/", variant: "classical" }],
        translations: [{ data: "girl" }],
      },
    });
  });

  it("returns a word with its forms and lexemes", async () => {
    expect.hasAssertions();

    const response = await application.query(`{
      word(data: "puellam") {
        __typename
        data
        wordForms { __typename form { __typename ... on NominalForm { case } } }
        wordLexemes { __typename lexeme { lemma translations { data } } }
      }
    }`);

    expect(response.errors).toBeUndefined();
    expect(response.data).toStrictEqual({
      word: {
        __typename: "Word",
        data: "puellam",
        wordForms: [
          {
            __typename: "WordForm",
            form: { __typename: "NominalForm", case: "accusative" },
          },
        ],
        wordLexemes: [
          {
            __typename: "WordLexeme",
            lexeme: { lemma: "puella", translations: [{ data: "girl" }] },
          },
        ],
      },
    });
  });

  it("returns Latin search results wrapping their lexemes", async () => {
    expect.hasAssertions();

    const response = await application.query(`{
      searchLatin(query: "puellam") {
        totalCount
        edges { node { source identifiers lexeme { __typename lemma } } }
      }
    }`);

    expect(response.errors).toBeUndefined();
    expect(response.data).toStrictEqual({
      searchLatin: {
        edges: [
          {
            node: {
              identifiers: ["accusative singular"],
              lexeme: { __typename: "Lexeme", lemma: "puella" },
              source: "WORD_EXACT",
            },
          },
        ],
        totalCount: 1,
      },
    });
  });

  it("returns an author's texts, lines, and tokens down to the dictionary word", async () => {
    expect.hasAssertions();

    const response = await application.query(`{
      author(slug: "vergil") {
        __typename
        name
        texts { title parentText { title } }
      }
      text(slug: "vergil/aeneid/1") {
        __typename
        title
        author { name }
        parentText { title }
        lines {
          __typename
          label
          data
          text { title }
          tokens { __typename data isPunctuation word { data } }
        }
      }
    }`);

    expect(response.errors).toBeUndefined();
    expect(response.data).toStrictEqual({
      author: {
        __typename: "Author",
        name: "Vergil",
        texts: expect.arrayContaining([
          { parentText: null, title: "Aeneid" },
          { parentText: { title: "Aeneid" }, title: "Book I" },
        ]),
      },
      text: {
        __typename: "Text",
        author: { name: "Vergil" },
        lines: [
          {
            __typename: "Line",
            data: "arma virumque cano puellam",
            label: "1",
            text: { title: "Book I" },
            tokens: [
              {
                __typename: "Token",
                data: "puellam",
                isPunctuation: false,
                word: { data: "puellam" },
              },
            ],
          },
        ],
        parentText: { title: "Aeneid" },
        title: "Book I",
      },
    });
  });

  it("returns literature search results and paginated connections", async () => {
    expect.hasAssertions();

    const response = await application.query(`{
      searchLiterature(query: "vergil") { authors { slug } }
      authors(first: 1) { totalCount edges { node { __typename slug } } }
    }`);

    expect(response.errors).toBeUndefined();
    expect(response.data).toStrictEqual({
      authors: {
        edges: [{ node: { __typename: "Author", slug: "vergil" } }],
        totalCount: 1,
      },
      searchLiterature: { authors: [{ slug: "vergil" }] },
    });
  });

  it("exposes exactly each type's API fields, and no database-only column", async () => {
    expect.hasAssertions();

    const response = await application.query(`{
      author: __type(name: "Author") { fields { name } }
      form: __type(name: "NominalForm") { fields { name } }
      inflection: __type(name: "NounInflection") { fields { name } }
      lexeme: __type(name: "Lexeme") { fields { name } }
      line: __type(name: "Line") { fields { name } }
      text: __type(name: "Text") { fields { name } }
      translation: __type(name: "Translation") { fields { name } }
      wordForm: __type(name: "WordForm") { fields { name } }
    }`);
    const fieldNames = Object.fromEntries(
      Object.entries(response.data ?? {}).map(([type, value]) => [
        type,
        introspectedTypeSchema
          .parse(value)
          .fields.map((field) => field.name)
          .toSorted(),
      ]),
    );

    expect(response.errors).toBeUndefined();
    expect(fieldNames).toStrictEqual({
      author: [...AUDIT_FIELDS, "name", "slug", "texts"].toSorted(),
      form: ["case", "id", "number"],
      inflection: ["declension", "gender", "id"],
      lexeme: [
        ...AUDIT_FIELDS,
        "disambiguator",
        "etymology",
        "forms",
        "inflection",
        "lemma",
        "partOfSpeech",
        "principalParts",
        "pronunciations",
        "translations",
      ].toSorted(),
      line: [
        ...AUDIT_FIELDS,
        "author",
        "data",
        "index",
        "label",
        "text",
        "tokens",
      ].toSorted(),
      text: [
        ...AUDIT_FIELDS,
        "author",
        "childTexts",
        "lines",
        "parentText",
        "slug",
        "title",
        "type",
      ].toSorted(),
      translation: [...AUDIT_FIELDS, "data"].toSorted(),
      wordForm: [...AUDIT_FIELDS, "form", "word"].toSorted(),
    });
  });
});
