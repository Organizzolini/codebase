import { afterAll, beforeAll, describe, expect, it } from "vitest";

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

/** A text's parent, as far up as the `TEXT` query climbs. */
interface ParentNode {
  readonly parentText: null | ParentNode;
  readonly slug: string;
}

/** A text as the `TEXT` query selects one. */
interface TextNode {
  readonly author: { readonly slug: string };
  readonly childTexts: readonly { readonly slug: string }[];
  readonly id: string;
  readonly lines: readonly {
    readonly data: string;
    readonly index: number;
    readonly label: string;
  }[];
  readonly parentText: null | ParentNode;
  readonly slug: string;
  readonly title: string;
  readonly type: string;
}

/** A text as the `TEXTS` query selects one. */
interface TextsNode {
  readonly childTexts: readonly { readonly title: string }[];
  readonly title: string;
}

/** Looks up one text, climbing three parents and listing its children and lines. */
const TEXT = `
  query Text($id: ID, $slug: String, $lookup: TextLookupInput) {
    text(id: $id, slug: $slug, lookup: $lookup) {
      id
      slug
      title
      type
      author { slug }
      parentText { slug parentText { slug parentText { slug } } }
      childTexts { slug }
      lines { data index label }
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
      edges { cursor node { title childTexts { title } } }
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
      expect(text.childTexts).toStrictEqual([]);
    });

    it("lists a section's lines in index order", async () => {
      expect.hasAssertions();

      const { text } = await query<{ text: TextNode }>(TEXT, {
        id: application.catalog.proem.id,
      });

      expect(text.lines.map((line) => line.label)).toStrictEqual([
        ...PROEM_LINE_LABELS,
      ]);
      expect(text.lines.map((line) => line.index)).toStrictEqual([0, 1, 2]);
      expect(text.lines[0]?.data).toMatch(/^Arma virumque cano/);
    });

    it("finds a corpus through the lookup input with its children and no parent", async () => {
      expect.hasAssertions();

      const { text } = await query<{ text: TextNode }>(TEXT, {
        lookup: { slug: "vergil/aeneid" },
      });

      expect(text.type).toBe("corpus");
      expect(text.parentText).toBeNull();
      expect(text.childTexts.map((child) => child.slug)).toStrictEqual([
        "vergil/aeneid/1",
        "vergil/aeneid/2",
      ]);
      expect(text.lines).toStrictEqual([]);
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
      expect(page.edges[0]?.node.childTexts).toStrictEqual([
        { title: "Book I" },
        { title: "Book II" },
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
  });
});
