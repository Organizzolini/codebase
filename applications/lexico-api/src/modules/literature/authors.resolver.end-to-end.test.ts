import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  type AuthorTextApplication,
  startAuthorTextApplication,
} from "../../../testing/author-text-application";
import { AUTHOR_NAMES_IN_ORDER } from "../../../testing/author-text-catalog";
import { DATABASE_TIMEOUT_MILLISECONDS } from "../../../testing/database";
import {
  type ConnectionPage,
  nodesOf,
  walkBackward,
  walkForward,
} from "../../../testing/relay-connection-walk";

/** An author as the queries below select one. */
interface AuthorNode {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly texts: readonly {
    readonly author: { readonly slug: string };
    readonly parentText: null | { readonly slug: string };
    readonly slug: string;
  }[];
}

/** Looks up one author, with every text they wrote and each text's parent. */
const AUTHOR = `
  query Author($id: ID, $slug: String, $lookup: AuthorLookupInput) {
    author(id: $id, slug: $slug, lookup: $lookup) {
      id
      name
      slug
      texts { slug author { slug } parentText { slug } }
    }
  }
`;

/** Pages through every author. */
const AUTHORS = `
  query Authors($first: Int, $after: String, $last: Int, $before: String) {
    authors(first: $first, after: $after, last: $last, before: $before) {
      edges { cursor node { name slug } }
      pageInfo { endCursor hasNextPage hasPreviousPage startCursor }
      totalCount
    }
  }
`;

/**
 * Executes the `author` and `authors` queries, and `Author.texts` beneath
 * them, over HTTP against the whole Lexico API and a real database.
 */
describe("authors resolver end-to-end suite", () => {
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

  /** Fetches one page of the `authors` connection. */
  async function authorsPage(
    variables: Record<string, unknown>,
  ): Promise<ConnectionPage<{ name: string; slug: string }>> {
    const { authors } = await query<{
      authors: ConnectionPage<{ name: string; slug: string }>;
    }>(AUTHORS, variables);
    return authors;
  }

  beforeAll(async () => {
    application = await startAuthorTextApplication();
  }, DATABASE_TIMEOUT_MILLISECONDS);

  afterAll(async () => {
    await application.stop();
  }, DATABASE_TIMEOUT_MILLISECONDS);

  describe("author", () => {
    it("finds an author by id with every text they wrote", async () => {
      expect.hasAssertions();

      const { author } = await query<{ author: AuthorNode }>(AUTHOR, {
        id: application.catalog.vergil.id,
      });

      expect(author.slug).toBe("vergil");
      expect(author.texts.map((text) => text.slug)).toStrictEqual([
        "vergil/aeneid",
        "vergil/aeneid/1",
        "vergil/aeneid/2",
        "vergil/eclogues",
        "vergil/aeneid/1/proem",
      ]);
      expect(author.texts.every((text) => text.author.slug === "vergil")).toBe(
        true,
      );
    });

    it("resolves each listed text's parent", async () => {
      expect.hasAssertions();

      const { author } = await query<{ author: AuthorNode }>(AUTHOR, {
        slug: "vergil",
      });

      expect(
        Object.fromEntries(
          author.texts.map((text) => [
            text.slug,
            text.parentText?.slug ?? null,
          ]),
        ),
      ).toStrictEqual({
        "vergil/aeneid": null,
        "vergil/aeneid/1": "vergil/aeneid",
        "vergil/aeneid/1/proem": "vergil/aeneid/1",
        "vergil/aeneid/2": "vergil/aeneid",
        "vergil/eclogues": null,
      });
    });

    it("finds an author by slug or through the lookup input", async () => {
      expect.hasAssertions();

      const bySlug = await query<{ author: AuthorNode }>(AUTHOR, {
        slug: "caesar",
      });
      const byLookup = await query<{ author: AuthorNode }>(AUTHOR, {
        lookup: { id: application.catalog.caesar.id },
      });

      expect(bySlug.author.id).toBe(application.catalog.caesar.id);
      expect(byLookup.author.name).toBe("Caesar");
    });

    it("resolves an empty text list for an author who wrote none", async () => {
      expect.hasAssertions();

      const { author } = await query<{ author: AuthorNode }>(AUTHOR, {
        lookup: { slug: "cicero" },
      });

      expect(author.texts).toStrictEqual([]);
    });

    it("returns null without errors when neither an id nor a slug is given", async () => {
      expect.hasAssertions();

      await expect(query(AUTHOR)).resolves.toStrictEqual({ author: null });
      await expect(query(AUTHOR, { lookup: {} })).resolves.toStrictEqual({
        author: null,
      });
    });

    it("returns null for a slug no author has", async () => {
      expect.hasAssertions();
      await expect(query(AUTHOR, { slug: "horace" })).resolves.toStrictEqual({
        author: null,
      });
    });
  });

  describe("authors", () => {
    it("lists every author by name with the total count and page info", async () => {
      expect.hasAssertions();

      const page = await authorsPage({});

      expect(page.edges.map((edge) => edge.node.name)).toStrictEqual([
        ...AUTHOR_NAMES_IN_ORDER,
      ]);
      expect(page.totalCount).toBe(5);
      expect(page.pageInfo).toStrictEqual({
        endCursor: page.edges.at(-1)?.cursor,
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: page.edges[0]?.cursor,
      });
    });

    it("pages forward with first and after through every author once", async () => {
      expect.hasAssertions();

      const pages = await walkForward(async (after) =>
        authorsPage({ after, first: 2 }),
      );

      expect(pages.map((page) => page.edges.length)).toStrictEqual([2, 2, 1]);
      expect(nodesOf(pages).map((author) => author.name)).toStrictEqual([
        ...AUTHOR_NAMES_IN_ORDER,
      ]);
      expect(pages.map((page) => page.pageInfo.hasNextPage)).toStrictEqual([
        true,
        true,
        false,
      ]);
      expect(pages[0]?.pageInfo.hasPreviousPage).toBe(false);
      expect(pages.map((page) => page.totalCount)).toStrictEqual([5, 5, 5]);
    });

    it("pages backward with last and before through every author once", async () => {
      expect.hasAssertions();

      const pages = await walkBackward(async (before) =>
        authorsPage({ before, last: 2 }),
      );

      expect(
        nodesOf(pages.toReversed()).map((author) => author.name),
      ).toStrictEqual([...AUTHOR_NAMES_IN_ORDER]);
      expect(pages.map((page) => page.pageInfo.hasPreviousPage)).toStrictEqual([
        true,
        true,
        false,
      ]);
      expect(pages[0]?.pageInfo.hasNextPage).toBe(false);
    });

    it("rejects a page size that is not an integer", async () => {
      expect.hasAssertions();

      const body = await application.execute(AUTHORS, { first: "two" });

      expect(body.data ?? null).toBeNull();
      expect(body.errors?.[0]?.message).toMatch(/\$first/);
    });
  });
});
