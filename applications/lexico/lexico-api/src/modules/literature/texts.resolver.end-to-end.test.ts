/* cspell:words Carmina */

import { DataSource } from "typeorm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  type AuthorTextApplication,
  startAuthorTextApplication,
} from "../../../testing/author-text-application";
import {
  PROEM_LINE_LABELS,
  TEXT_TITLES_IN_ORDER,
} from "../../../testing/author-text-catalog";
import { DATABASE_TIMEOUT_MILLISECONDS } from "../../../testing/database";
import {
  type ConnectionPage,
  nodesOf,
  walkBackward,
  walkForward,
} from "../../../testing/relay-connection-walk";

/** A line as the `TEXT` query selects one. */
interface LineNode {
  readonly data: string;
  readonly index: number;
  readonly label: string;
}

/** A text's parent, as far up as the `TEXT` query climbs. */
interface ParentNode {
  readonly parentText: null | ParentNode;
  readonly slug: string;
}

/** A text as the `TEXT` query selects one. */
interface TextNode {
  readonly author: { readonly slug: string };
  readonly childTexts: ConnectionPage<{ readonly slug: string }>;
  readonly id: string;
  readonly lines: ConnectionPage<LineNode>;
  readonly parentText: null | ParentNode;
  readonly slug: string;
  readonly title: string;
  readonly type: string;
}

/** A text as the `TEXTS` query selects one. */
interface TextsNode {
  readonly childTexts: ConnectionPage<{ readonly title: string }>;
  readonly lines: { readonly totalCount: number };
  readonly parentText: null | { readonly title: string };
  readonly title: string;
}

/** A connection holding nothing, for a page a query left out. */
function emptyPage<Node>(): ConnectionPage<Node> {
  return {
    edges: [],
    pageInfo: { hasNextPage: false, hasPreviousPage: false },
    totalCount: 0,
  };
}

/** Selects a connection's page information and count. */
const PAGE_FIELDS = `
  pageInfo { endCursor hasNextPage hasPreviousPage startCursor }
  totalCount
`;

/** Looks up one text, climbing three parents and paging its children and lines. */
const TEXT = `
  query Text(
    $id: ID
    $slug: String
    $lookup: TextLookupInput
    $linesFirst: Int
    $linesAfter: String
  ) {
    text(id: $id, slug: $slug, lookup: $lookup) {
      id
      slug
      title
      type
      author { slug }
      parentText { slug parentText { slug parentText { slug } } }
      childTexts { edges { cursor node { slug } } ${PAGE_FIELDS} }
      lines(first: $linesFirst, after: $linesAfter) {
        edges { cursor node { data index label } }
        ${PAGE_FIELDS}
      }
    }
  }
`;

/** Pages through texts, optionally filtered by author or parent text. */
const TEXTS = `
  query Texts(
    $authorId: ID
    $parentTextId: ID
    $first: Int
    $after: String
    $last: Int
    $before: String
  ) {
    texts(
      authorId: $authorId
      parentTextId: $parentTextId
      first: $first
      after: $after
      last: $last
      before: $before
    ) {
      edges {
        cursor
        node {
          title
          parentText { title }
          childTexts { edges { cursor node { title } } ${PAGE_FIELDS} }
          lines(first: 1) { totalCount }
        }
      }
      pageInfo { endCursor hasNextPage hasPreviousPage startCursor }
      totalCount
    }
  }
`;

/**
 * Executes the `text` and `texts` queries, and the `parentText`,
 * `childTexts`, and `lines` fields beneath them, over HTTP against the whole
 * Lexico API and a real database.
 */
describe("texts resolver end-to-end suite", () => {
  let application: AuthorTextApplication;

  /** Executes an operation expected to succeed and returns its data. */
  async function query<Data>(
    document: string,
    variables?: Record<string, unknown>,
  ): Promise<Data> {
    const body = await application.execute(document, variables);

    expect(body.errors).toBeUndefined();

    if (!body.data) {
      throw new Error("GraphQL returned no data");
    }
    return body.data as Data;
  }

  /** Runs an operation and collects every SQL statement it issued. */
  async function statementsOf<Page>(
    run: () => Promise<Page>,
  ): Promise<{ page: Page; statements: string[] }> {
    const logQuery = vi.spyOn(
      application.server.get(DataSource).logger,
      "logQuery",
    );
    const page = await run();
    const statements = logQuery.mock.calls.map(([statement]) => statement);
    logQuery.mockRestore();
    return { page, statements };
  }

  /** Fetches one page of the `texts` connection. */
  async function textsPage(
    variables: Record<string, unknown>,
  ): Promise<ConnectionPage<TextsNode>> {
    const { texts } = await query<{ texts: ConnectionPage<TextsNode> }>(
      TEXTS,
      variables,
    );
    return texts;
  }

  beforeAll(async () => {
    application = await startAuthorTextApplication();
  }, DATABASE_TIMEOUT_MILLISECONDS);

  afterAll(async () => {
    await application.stop();
  }, DATABASE_TIMEOUT_MILLISECONDS);

  describe("text", () => {
    it("finds a section by slug and climbs to its book and corpus", async () => {
      expect.hasAssertions();

      const { text } = await query<{ text: TextNode }>(TEXT, {
        slug: "vergil/aeneid/1/proem",
      });

      expect(text.id).toBe(application.catalog.proem.id);
      expect(text.author.slug).toBe("vergil");
      expect(text.parentText).toStrictEqual({
        parentText: { parentText: null, slug: "vergil/aeneid" },
        slug: "vergil/aeneid/1",
      });
      expect(text.childTexts).toMatchObject({ edges: [], totalCount: 0 });
    });

    it("lists a section's lines in index order", async () => {
      expect.hasAssertions();

      const { text } = await query<{ text: TextNode }>(TEXT, {
        id: application.catalog.proem.id,
      });

      const lines = nodesOf([text.lines]);

      expect(lines.map((line) => line.label)).toStrictEqual([
        ...PROEM_LINE_LABELS,
      ]);
      expect(lines.map((line) => line.index)).toStrictEqual([0, 1, 2]);
      expect(lines[0]?.data).toMatch(/^Arma virumque cano/);
      expect(text.lines.totalCount).toBe(3);
    });

    it("pages a section's lines forward with first and after", async () => {
      expect.hasAssertions();

      const pages = await walkForward(async (after) => {
        const { text } = await query<{ text: TextNode }>(TEXT, {
          id: application.catalog.proem.id,
          linesAfter: after,
          linesFirst: 2,
        });
        return text.lines;
      });

      expect(pages.map((page) => page.edges.length)).toStrictEqual([2, 1]);
      expect(nodesOf(pages).map((line) => line.index)).toStrictEqual([0, 1, 2]);
      expect(pages[1]?.pageInfo.hasPreviousPage).toBe(true);
    });

    it("finds a corpus through the lookup input with its children and no parent", async () => {
      expect.hasAssertions();

      const { text } = await query<{ text: TextNode }>(TEXT, {
        lookup: { slug: "vergil/aeneid" },
      });

      expect(text.type).toBe("corpus");
      expect(text.parentText).toBeNull();
      expect(
        nodesOf([text.childTexts]).map((child) => child.slug),
      ).toStrictEqual(["vergil/aeneid/1", "vergil/aeneid/2"]);
      expect(text.childTexts.totalCount).toBe(2);
      expect(text.lines).toMatchObject({ edges: [], totalCount: 0 });
    });

    it("returns null without errors when neither an id nor a slug is given", async () => {
      expect.hasAssertions();

      await expect(query(TEXT)).resolves.toStrictEqual({ text: null });
      await expect(query(TEXT, { lookup: {} })).resolves.toStrictEqual({
        text: null,
      });
    });

    it("returns null for a slug no text has", async () => {
      expect.hasAssertions();
      await expect(
        query(TEXT, { slug: "vergil/georgics" }),
      ).resolves.toStrictEqual({ text: null });
    });
  });

  describe("texts", () => {
    it("lists every text by title with each one's children", async () => {
      expect.hasAssertions();

      const page = await textsPage({});

      expect(page.edges.map((edge) => edge.node.title)).toStrictEqual([
        ...TEXT_TITLES_IN_ORDER,
      ]);
      expect(page.totalCount).toBe(7);
      expect(
        nodesOf([page.edges[0]?.node.childTexts ?? emptyPage()]),
      ).toStrictEqual([{ title: "Book I" }, { title: "Book II" }]);
      expect(
        page.edges.map((edge) => [
          edge.node.title,
          edge.node.parentText?.title ?? null,
          edge.node.lines.totalCount,
        ]),
      ).toStrictEqual([
        ["Aeneid", null, 0],
        ["Book I", "Aeneid", 0],
        ["Book II", "Aeneid", 0],
        ["Carmina", null, 0],
        ["De Bello Gallico", null, expect.any(Number)],
        ["Eclogues", null, expect.any(Number)],
        ["Proem", "Book I", 3],
      ]);
    });

    it("filters by author and by parent text", async () => {
      expect.hasAssertions();

      const byAuthor = await textsPage({
        authorId: application.catalog.caesar.id,
      });
      const byParent = await textsPage({
        parentTextId: application.catalog.aeneid.id,
      });
      const byNeither = await textsPage({
        authorId: application.catalog.cicero.id,
      });

      expect(byAuthor.edges.map((edge) => edge.node.title)).toStrictEqual([
        "De Bello Gallico",
      ]);
      expect(byParent.edges.map((edge) => edge.node.title)).toStrictEqual([
        "Book I",
        "Book II",
      ]);
      expect(byNeither).toStrictEqual({
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

    it("pages forward through an author's texts with first and after", async () => {
      expect.hasAssertions();

      const pages = await walkForward(async (after) =>
        textsPage({ after, authorId: application.catalog.vergil.id, first: 2 }),
      );

      expect(pages.map((page) => page.edges.length)).toStrictEqual([2, 2, 1]);
      expect(nodesOf(pages).map((text) => text.title)).toStrictEqual([
        "Aeneid",
        "Book I",
        "Book II",
        "Eclogues",
        "Proem",
      ]);
      expect(pages.map((page) => page.totalCount)).toStrictEqual([5, 5, 5]);
    });

    it("pages backward through every text with last and before", async () => {
      expect.hasAssertions();

      const pages = await walkBackward(async (before) =>
        textsPage({ before, last: 4 }),
      );

      expect(pages.map((page) => page.edges.length)).toStrictEqual([4, 3]);
      expect(
        nodesOf(pages.toReversed()).map((text) => text.title),
      ).toStrictEqual([...TEXT_TITLES_IN_ORDER]);
      expect(pages[0]?.pageInfo.hasNextPage).toBe(false);
      expect(pages.at(-1)?.pageInfo.hasPreviousPage).toBe(false);
    });

    it("costs the same statements for one text as for every text, whatever each one nests", async () => {
      expect.hasAssertions();

      const one = await statementsOf(async () => textsPage({ first: 1 }));
      const every = await statementsOf(async () => textsPage({}));

      expect(every.page.edges).toHaveLength(7);
      expect(every.statements).toHaveLength(one.statements.length);
    });
  });

  describe("searchTexts", () => {
    /** Searches texts by title or slug, climbing to each hit's parent. */
    const SEARCH_TEXTS = `
      query SearchTexts($query: String!, $first: Int) {
        searchTexts(query: $query, first: $first) {
          edges { node { slug parentText { slug author { slug } } } }
          totalCount
        }
      }
    `;

    /** The `searchTexts` page the query above selects. */
    interface SearchTextsPage {
      readonly edges: readonly {
        readonly node: {
          readonly parentText: null | {
            readonly author: { readonly slug: string };
            readonly slug: string;
          };
          readonly slug: string;
        };
      }[];
      readonly totalCount: number;
    }

    it("resolves every hit's parent text, a joined null included, in one statement", async () => {
      expect.hasAssertions();

      const one = await statementsOf(async () =>
        query<{ searchTexts: SearchTextsPage }>(SEARCH_TEXTS, {
          first: 1,
          query: "vergil",
        }),
      );
      const every = await statementsOf(async () =>
        query<{ searchTexts: SearchTextsPage }>(SEARCH_TEXTS, {
          query: "vergil",
        }),
      );

      expect(
        Object.fromEntries(
          every.page.searchTexts.edges.map((edge) => [
            edge.node.slug,
            edge.node.parentText?.slug ?? null,
          ]),
        ),
      ).toStrictEqual({
        "vergil/aeneid": null,
        "vergil/aeneid/1": "vergil/aeneid",
        "vergil/aeneid/1/proem": "vergil/aeneid/1",
        "vergil/aeneid/2": "vergil/aeneid",
        "vergil/eclogues": null,
      });
      expect(
        every.page.searchTexts.edges.flatMap((edge) =>
          edge.node.parentText === null ? [] : [edge.node.parentText.author],
        ),
      ).toStrictEqual([
        { slug: "vergil" },
        { slug: "vergil" },
        { slug: "vergil" },
      ]);
      expect(every.page.searchTexts.totalCount).toBe(5);
      expect(every.statements).toHaveLength(one.statements.length);
    });
  });
});
