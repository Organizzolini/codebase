import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { Author, Line, Text, Token, Word } from "@codebase/lexico-entities";

import {
  AUTHOR_NAMES_IN_ORDER,
  type AuthorTextCatalog,
  seedAuthorTextCatalog,
  UNKNOWN_ENTITY_ID,
} from "../../../testing/author-text-catalog";
import {
  DATABASE_TIMEOUT_MILLISECONDS,
  startLexicoDatabaseTestingModule,
} from "../../../testing/database";
import { createLiteratureServices } from "../../../testing/literature-services";
import {
  nodesOf,
  walkBackward,
  walkForward,
} from "../../../testing/relay-connection-walk";

import { AuthorsResolver } from "./authors.resolver";
import { toAuthorType } from "./literature.utilities";

import type { DatabaseTestingModule } from "@codebase/database/testing";

/**
 * Resolves authors against a real `lexico_testing` database built by lexico's
 * migrations, so lookups, the `authors` connection, and `Author.texts` run the
 * SQL the API runs.
 */
describe("authors resolver integration suite", () => {
  let catalog: AuthorTextCatalog;
  let database: DatabaseTestingModule;
  let resolver: AuthorsResolver;

  beforeAll(async () => {
    database = await startLexicoDatabaseTestingModule([
      Author,
      Line,
      Text,
      Token,
      Word,
    ]);
    catalog = await seedAuthorTextCatalog(database);
    const { createLoader, service } = createLiteratureServices(database);
    resolver = new AuthorsResolver(service, createLoader());
  }, DATABASE_TIMEOUT_MILLISECONDS);

  afterAll(async () => {
    await database.close();
  }, DATABASE_TIMEOUT_MILLISECONDS);

  describe("author lookup", () => {
    it("finds an author by id", async () => {
      expect.hasAssertions();

      const author = await resolver.author({ id: catalog.vergil.id });

      expect(author?.slug).toBe("vergil");
    });

    it("finds an author by slug", async () => {
      expect.hasAssertions();

      const author = await resolver.author({ slug: "caesar" });

      expect(author?.id).toBe(catalog.caesar.id);
    });

    it("finds an author through the lookup input by id or by slug", async () => {
      expect.hasAssertions();

      const byId = await resolver.author({ lookup: { id: catalog.cicero.id } });
      const bySlug = await resolver.author({ lookup: { slug: "cicero" } });

      expect(byId?.name).toBe("Cicero");
      expect(bySlug?.id).toBe(catalog.cicero.id);
    });

    it("prefers the id when both an id and a slug are given", async () => {
      expect.hasAssertions();

      const author = await resolver.author({
        id: catalog.vergil.id,
        slug: "caesar",
      });

      expect(author?.name).toBe("Vergil");
    });

    it("returns null when neither an id nor a slug is given", async () => {
      expect.hasAssertions();

      await expect(resolver.author({})).resolves.toBeNull();
      await expect(resolver.author({ lookup: {} })).resolves.toBeNull();
    });

    it("returns null for an id or slug no author has", async () => {
      expect.hasAssertions();

      await expect(
        resolver.author({ id: UNKNOWN_ENTITY_ID }),
      ).resolves.toBeNull();
      await expect(resolver.author({ slug: "horace" })).resolves.toBeNull();
    });
  });

  describe("authors connection", () => {
    it("lists every author by name with the total count", async () => {
      expect.hasAssertions();

      const connection = await resolver.authors({});

      expect(connection.edges.map((edge) => edge.node.name)).toStrictEqual([
        ...AUTHOR_NAMES_IN_ORDER,
      ]);
      expect(connection.totalCount).toBe(AUTHOR_NAMES_IN_ORDER.length);
      expect(connection.pageInfo).toMatchObject({
        endCursor: connection.edges.at(-1)?.cursor,
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: connection.edges[0]?.cursor,
      });
    });

    it("pages forward with first and after through every author once", async () => {
      expect.hasAssertions();

      const pages = await walkForward(async (after) =>
        resolver.authors({ after, first: 2 }),
      );

      expect(pages.map((page) => page.edges.length)).toStrictEqual([2, 2, 1]);
      expect(nodesOf(pages).map((author) => author.name)).toStrictEqual([
        ...AUTHOR_NAMES_IN_ORDER,
      ]);
      expect(pages[0]?.pageInfo.hasPreviousPage).toBe(false);
      expect(pages.map((page) => page.pageInfo.hasNextPage)).toStrictEqual([
        true,
        true,
        false,
      ]);
      expect(pages.map((page) => page.totalCount)).toStrictEqual(
        pages.map(() => AUTHOR_NAMES_IN_ORDER.length),
      );
    });

    it("pages backward with last and before through every author once", async () => {
      expect.hasAssertions();

      const pages = await walkBackward(async (before) =>
        resolver.authors({ before, last: 2 }),
      );

      expect(pages.map((page) => page.edges.length)).toStrictEqual([2, 2, 1]);
      expect(
        nodesOf(pages.toReversed()).map((author) => author.name),
      ).toStrictEqual([...AUTHOR_NAMES_IN_ORDER]);
      expect(pages[0]?.pageInfo.hasNextPage).toBe(false);
      expect(pages.map((page) => page.pageInfo.hasPreviousPage)).toStrictEqual([
        true,
        true,
        false,
      ]);
      expect(pages.map((page) => page.totalCount)).toStrictEqual(
        pages.map(() => AUTHOR_NAMES_IN_ORDER.length),
      );
    });

    it("returns an empty page with null cursors for first zero", async () => {
      expect.hasAssertions();

      const connection = await resolver.authors({ first: 0 });

      expect(connection.edges).toStrictEqual([]);
      expect(connection.totalCount).toBe(5);
      expect(connection.pageInfo.hasNextPage).toBe(true);
      expect(connection.pageInfo.startCursor ?? null).toBeNull();
      expect(connection.pageInfo.endCursor ?? null).toBeNull();
    });
  });

  describe("author texts", () => {
    it("lists every text an author wrote, nested ones included, by title", async () => {
      expect.hasAssertions();

      const connection = await resolver.resolveAuthorTexts(
        toAuthorType(catalog.vergil),
        {},
      );
      const texts = connection.edges.map((edge) => edge.node);

      expect(connection.totalCount).toBe(5);
      expect(texts.map((text) => text.title)).toStrictEqual([
        "Aeneid",
        "Book I",
        "Book II",
        "Eclogues",
        "Proem",
      ]);
      expect(texts.every((text) => text.author.id === catalog.vergil.id)).toBe(
        true,
      );
    });

    it("pages an author's texts with first and after", async () => {
      expect.hasAssertions();

      const pages = await walkForward(async (after) =>
        resolver.resolveAuthorTexts(toAuthorType(catalog.vergil), {
          after,
          first: 2,
        }),
      );

      expect(pages.map((page) => page.edges.length)).toStrictEqual([2, 2, 1]);
      expect(nodesOf(pages).map((text) => text.title)).toStrictEqual([
        "Aeneid",
        "Book I",
        "Book II",
        "Eclogues",
        "Proem",
      ]);
    });

    it("lists no texts for an author who has none", async () => {
      expect.hasAssertions();
      await expect(
        resolver.resolveAuthorTexts(toAuthorType(catalog.cicero), {}),
      ).resolves.toMatchObject({ edges: [], totalCount: 0 });
    });
  });
});
