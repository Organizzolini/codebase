/* cspell:words amatoria amores carmina FLACCUS Horatius natus nondum nunc omnia oratore Ovidius Poetica poetica Quintus satirae valerius vergil vincit vinum */

import { NestFactory } from "@nestjs/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { Author, Line, Text } from "@codebase/lexico-entities";

import {
  DATABASE_TIMEOUT_MILLISECONDS,
  startLexicoDatabaseTestingModule,
} from "../../../testing/database";
import {
  type LiteratureSearchCorpus,
  seedLiteratureSearchCorpus,
} from "../../../testing/literature-search-corpus";
import {
  expectLiteratureSearchPagination,
  type LiteratureSearchPage,
} from "../../../testing/literature-search-pagination";

import type { DatabaseTestingModule } from "@codebase/database/testing";
import type { INestApplication } from "@nestjs/common";

/** A GraphQL response body: data when execution succeeded, errors when not. */
interface GraphqlResponse<Data> {
  readonly data?: Data | null;
  readonly errors?: readonly { readonly message: string }[];
}

/** The page fields every connection query below selects. */
const PAGE_FIELDS = `
  totalCount
  pageInfo { endCursor hasNextPage hasPreviousPage startCursor }
`;

/** Lists a page's node ids in edge order. */
function ids(page: LiteratureSearchPage): string[] {
  return page.edges.map((edge) => edge.node.id);
}

/**
 * Boots the whole Lexico API, as `main` does, over HTTP against a real
 * `lexico_testing` database seeded with a small corpus, and executes the four
 * literature search queries as a browser would: schema, argument handling,
 * Relay connection formatting, and relation resolution all included.
 */
describe("literature search end-to-end suite", () => {
  let application: INestApplication;
  let corpus: LiteratureSearchCorpus;
  let database: DatabaseTestingModule;
  let endpoint: string;

  /** POSTs one GraphQL operation to the running API and returns its body. */
  async function execute<Data>(
    query: string,
    variables: Record<string, unknown> = {},
  ): Promise<GraphqlResponse<Data>> {
    const response = await fetch(endpoint, {
      body: JSON.stringify({ query, variables }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    // 🧾 The schema, not this test, decides the shape; each test asserts it.
    return (await response.json()) as GraphqlResponse<Data>;
  }

  /** Executes an operation expected to succeed and returns its data. */
  async function query<Data>(
    operation: string,
    variables: Record<string, unknown> = {},
  ): Promise<Data> {
    const body = await execute<Data>(operation, variables);

    expect(body.errors).toBeUndefined();

    if (!body.data) throw new Error("GraphQL returned no data");
    return body.data;
  }

  beforeAll(async () => {
    database = await startLexicoDatabaseTestingModule([Author, Line, Text]);
    corpus = await seedLiteratureSearchCorpus(database);

    // ⏳ ConfigModule reads the environment when the module is imported, so
    // the root module is imported only once the database's login is stubbed.
    const { LexicoApiModule } = await import("../../lexico-api.module");
    application = await NestFactory.create(LexicoApiModule, { logger: false });
    await application.listen(0, "127.0.0.1");
    endpoint = `${await application.getUrl()}/graphql`;
  }, DATABASE_TIMEOUT_MILLISECONDS);

  afterAll(async () => {
    await application.close();
    await database.close();
  }, DATABASE_TIMEOUT_MILLISECONDS);

  describe("searchAuthors", () => {
    const SEARCH_AUTHORS = `
      query SearchAuthors($query: String!, $first: Int, $after: String, $last: Int, $before: String) {
        searchAuthors(query: $query, first: $first, after: $after, last: $last, before: $before) {
          edges {
            cursor
            node { id name slug texts { edges { node { id } } totalCount } }
          }
          ${PAGE_FIELDS}
        }
      }
    `;

    /** The `searchAuthors` connection, with each author's texts resolved. */
    interface SearchAuthorsData {
      readonly searchAuthors: LiteratureSearchPage & {
        readonly edges: readonly {
          readonly cursor: string;
          readonly node: {
            readonly id: string;
            readonly name: string;
            readonly slug: string;
            readonly texts: {
              readonly edges: readonly {
                readonly node: { readonly id: string };
              }[];
              readonly totalCount: number;
            };
          };
        }[];
      };
    }

    it("returns authors matched by name or slug, with their texts resolved", async () => {
      expect.hasAssertions();

      const { searchAuthors } = await query<SearchAuthorsData>(SEARCH_AUTHORS, {
        query: "horace",
      });

      expect(searchAuthors.totalCount).toBe(1);
      expect(searchAuthors.edges[0]?.node).toStrictEqual({
        id: corpus.author("horace").id,
        name: "Quintus Horatius Flaccus",
        slug: "horace",
        texts: {
          edges: [
            { node: { id: corpus.text("horace/ars-poetica").id } },
            { node: { id: corpus.text("horace/carmina").id } },
            { node: { id: corpus.text("horace/satirae").id } },
          ],
          totalCount: 3,
        },
      });
    });

    it("returns an empty connection when nothing matches", async () => {
      expect.hasAssertions();

      const { searchAuthors } = await query<SearchAuthorsData>(SEARCH_AUTHORS, {
        query: "vergil",
      });

      expect(searchAuthors).toStrictEqual({
        edges: [],
        pageInfo: {
          endCursor: null,
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: null,
        },
        totalCount: 0,
      });
    });

    it("pages through matches under the Relay invariants", async () => {
      expect.hasAssertions();

      const matched = await expectLiteratureSearchPagination(
        async (pagination) => {
          const data = await query<SearchAuthorsData>(SEARCH_AUTHORS, {
            ...pagination,
            query: "FLACCUS",
          });
          return data.searchAuthors;
        },
        1,
      );

      expect(matched).toStrictEqual([
        corpus.author("valerius-flaccus").id,
        corpus.author("horace").id,
      ]);
    });

    it("rejects a search without a query", async () => {
      expect.hasAssertions();

      const body = await execute(`{ searchAuthors { totalCount } }`);

      expect(body.data).toBeUndefined();
      expect(body.errors?.[0]?.message).toContain('"query"');
    });
  });

  describe("searchTexts", () => {
    const SEARCH_TEXTS = `
      query SearchTexts($query: String!, $authorId: ID, $first: Int, $after: String, $last: Int, $before: String) {
        searchTexts(query: $query, authorId: $authorId, first: $first, after: $after, last: $last, before: $before) {
          edges { cursor node { id title author { id } } }
          ${PAGE_FIELDS}
        }
      }
    `;

    /** The `searchTexts` connection, with each text's author. */
    interface SearchTextsData {
      readonly searchTexts: LiteratureSearchPage & {
        readonly edges: readonly {
          readonly cursor: string;
          readonly node: {
            readonly author: { readonly id: string };
            readonly id: string;
            readonly title: string;
          };
        }[];
      };
    }

    it("returns texts matched by title or slug, filtered to an author", async () => {
      expect.hasAssertions();

      const everyAuthor = await query<SearchTextsData>(SEARCH_TEXTS, {
        query: "ars",
      });
      const horace = await query<SearchTextsData>(SEARCH_TEXTS, {
        authorId: corpus.author("horace").id,
        query: "ars",
      });

      expect(ids(everyAuthor.searchTexts)).toStrictEqual([
        corpus.text("ovid/ars-amatoria").id,
        corpus.text("horace/ars-poetica").id,
      ]);
      expect(horace.searchTexts.edges.map((edge) => edge.node)).toStrictEqual([
        {
          author: { id: corpus.author("horace").id },
          id: corpus.text("horace/ars-poetica").id,
          title: "Ars Poetica",
        },
      ]);
    });

    it("pages through one author's matches under the Relay invariants", async () => {
      expect.hasAssertions();

      const matched = await expectLiteratureSearchPagination(
        async (pagination) => {
          const data = await query<SearchTextsData>(SEARCH_TEXTS, {
            ...pagination,
            authorId: corpus.author("ovid").id,
            query: "o",
          });
          return data.searchTexts;
        },
        2,
      );

      expect(matched).toStrictEqual([
        corpus.text("ovid/amores").id,
        corpus.text("ovid/ars-amatoria").id,
        corpus.text("ovid/metamorphoses").id,
      ]);
    });
  });

  describe("searchLines", () => {
    const SEARCH_LINES = `
      query SearchLines($query: String!, $textId: ID, $first: Int, $after: String, $last: Int, $before: String) {
        searchLines(query: $query, textId: $textId, first: $first, after: $after, last: $last, before: $before) {
          edges { cursor node { id data index text { id } } }
          ${PAGE_FIELDS}
        }
      }
    `;

    /** The `searchLines` connection, with each line's text. */
    interface SearchLinesData {
      readonly searchLines: LiteratureSearchPage & {
        readonly edges: readonly {
          readonly cursor: string;
          readonly node: {
            readonly data: string;
            readonly id: string;
            readonly index: number;
            readonly text: { readonly id: string };
          };
        }[];
      };
    }

    it("returns lines matched within one text, in index order", async () => {
      expect.hasAssertions();

      const carmina = corpus.text("horace/carmina");
      const { searchLines } = await query<SearchLinesData>(SEARCH_LINES, {
        query: "amor",
        textId: carmina.id,
      });

      expect(searchLines.edges.map((edge) => edge.node)).toStrictEqual([
        {
          data: "nunc amor et vinum",
          id: expect.any(String),
          index: 1,
          text: { id: carmina.id },
        },
        {
          data: "AMOR vincit omnia",
          id: expect.any(String),
          index: 2,
          text: { id: carmina.id },
        },
      ]);
    });

    it("returns an empty connection for a text without a match", async () => {
      expect.hasAssertions();

      const { searchLines } = await query<SearchLinesData>(SEARCH_LINES, {
        query: "amor",
        textId: corpus.text("cicero/oratore").id,
      });

      expect(searchLines.edges).toStrictEqual([]);
      expect(searchLines.totalCount).toBe(0);
    });

    it("pages through library-wide matches under the Relay invariants", async () => {
      expect.hasAssertions();

      const matched = await expectLiteratureSearchPagination(
        async (pagination) => {
          const data = await query<SearchLinesData>(SEARCH_LINES, {
            ...pagination,
            query: "amor",
          });
          return data.searchLines;
        },
        2,
      );

      expect(matched).toHaveLength(3);
    });
  });

  describe("searchLiterature", () => {
    const SEARCH_LITERATURE = `
      query SearchLiterature($query: String!, $authorId: ID) {
        searchLiterature(query: $query, authorId: $authorId) {
          authors { id }
          lines { data }
          texts { id }
        }
      }
    `;

    /** The aggregated `searchLiterature` result. */
    interface SearchLiteratureData {
      readonly searchLiterature: {
        readonly authors: readonly { readonly id: string }[];
        readonly lines: readonly { readonly data: string }[];
        readonly texts: readonly { readonly id: string }[];
      };
    }

    it("combines author, text, and line matches for one query", async () => {
      expect.hasAssertions();

      const { searchLiterature } = await query<SearchLiteratureData>(
        SEARCH_LITERATURE,
        {
          query: "ovid",
        },
      );

      expect(searchLiterature).toStrictEqual({
        authors: [{ id: corpus.author("ovid").id }],
        lines: [{ data: "Ovidius nondum natus erat" }],
        texts: [
          { id: corpus.text("ovid/amores").id },
          { id: corpus.text("ovid/ars-amatoria").id },
          { id: corpus.text("ovid/metamorphoses").id },
        ],
      });
    });

    it("narrows only the texts to the given author", async () => {
      expect.hasAssertions();

      const { searchLiterature } = await query<SearchLiteratureData>(
        SEARCH_LITERATURE,
        {
          authorId: corpus.author("cicero").id,
          query: "ovid",
        },
      );

      expect(searchLiterature.authors).toHaveLength(1);
      expect(searchLiterature.texts).toStrictEqual([]);
      expect(searchLiterature.lines).toHaveLength(1);
    });

    it("returns empty lists for a blank query", async () => {
      expect.hasAssertions();

      const { searchLiterature } = await query<SearchLiteratureData>(
        SEARCH_LITERATURE,
        {
          query: "   ",
        },
      );

      expect(searchLiterature).toStrictEqual({
        authors: [],
        lines: [],
        texts: [],
      });
    });
  });
});
