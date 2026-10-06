/* cspell:words carmina */

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { Author, Line, Text, Token, Word } from "@codebase/lexico-entities";

import {
  type AuthorTextCatalog,
  PROEM_LINE_LABELS,
  seedAuthorTextCatalog,
  TEXT_TITLES_IN_ORDER,
  UNKNOWN_ENTITY_ID,
} from "../../../testing/author-text-catalog";
import {
  DATABASE_TIMEOUT_MILLISECONDS,
  type LexicoTestDatabase,
  startLexicoTestDatabase,
} from "../../../testing/database";
import {
  nodesOf,
  walkBackward,
  walkForward,
} from "../../../testing/relay-connection-walk";

import { LiteratureService } from "./literature.service";
import { TextsResolver } from "./texts.resolver";

/** The titles of a list of texts, in the order given. */
function titlesOf(texts: readonly Text[]): string[] {
  return texts.map((text) => text.title);
}

/**
 * Resolves texts against a real `lexico_testing` database built by lexico's
 * migrations, so lookups, the filtered `texts` connection, and navigation up
 * and down the text hierarchy run the SQL the API runs.
 */
describe("texts resolver integration suite", () => {
  let catalog: AuthorTextCatalog;
  let database: LexicoTestDatabase;
  let resolver: TextsResolver;

  beforeAll(async () => {
    database = await startLexicoTestDatabase([Author, Line, Text, Token, Word]);
    catalog = await seedAuthorTextCatalog(database);
    resolver = new TextsResolver(
      new LiteratureService(
        database.repository(Author),
        database.repository(Line),
        database.repository(Text),
        database.repository(Token),
        database.repository(Word),
      ),
    );
  }, DATABASE_TIMEOUT_MILLISECONDS);

  afterAll(async () => {
    await database.stop();
  }, DATABASE_TIMEOUT_MILLISECONDS);

  describe("text lookup", () => {
    it("finds a text by id with its author and parent text", async () => {
      expect.hasAssertions();

      const text = await resolver.text({ id: catalog.proem.id });

      expect(text?.slug).toBe("vergil/aeneid/1/proem");
      expect(text?.author.slug).toBe("vergil");

      const parent = text === null ? null : await resolver.parentText(text);

      expect(parent?.id).toBe(catalog.bookOne.id);
    });

    it("prefers the id when both an id and a slug are given", async () => {
      expect.hasAssertions();

      const text = await resolver.text({
        id: catalog.eclogues.id,
        slug: "vergil/aeneid",
      });

      expect(text?.title).toBe("Eclogues");
    });

    it("finds a text by its hierarchical slug", async () => {
      expect.hasAssertions();

      const text = await resolver.text({ slug: "vergil/aeneid/2" });

      expect(text?.id).toBe(catalog.bookTwo.id);
      expect(text?.type).toBe("book");
    });

    it("finds a text through the lookup input by id or by slug", async () => {
      expect.hasAssertions();

      const byId = await resolver.text({ lookup: { id: catalog.eclogues.id } });
      const bySlug = await resolver.text({
        lookup: { slug: "vergil/eclogues" },
      });

      expect(byId?.title).toBe("Eclogues");
      expect(bySlug?.id).toBe(catalog.eclogues.id);
    });

    it("returns null when neither an id nor a slug is given", async () => {
      expect.hasAssertions();

      await expect(resolver.text({})).resolves.toBeNull();
      await expect(resolver.text({ lookup: {} })).resolves.toBeNull();
    });

    it("returns null for an id or slug no text has", async () => {
      expect.hasAssertions();

      await expect(
        resolver.text({ id: UNKNOWN_ENTITY_ID }),
      ).resolves.toBeNull();
      await expect(
        resolver.text({ slug: "vergil/georgics" }),
      ).resolves.toBeNull();
    });
  });

  describe("texts connection", () => {
    it("lists every text by title with the total count", async () => {
      expect.hasAssertions();

      const connection = await resolver.texts({});

      expect(titlesOf(connection.edges.map((edge) => edge.node))).toStrictEqual(
        [...TEXT_TITLES_IN_ORDER],
      );
      expect(connection.totalCount).toBe(TEXT_TITLES_IN_ORDER.length);
      expect(connection.pageInfo.hasNextPage).toBe(false);
      expect(connection.pageInfo.hasPreviousPage).toBe(false);
    });

    it("filters by author across every level of their hierarchy", async () => {
      expect.hasAssertions();

      const vergil = await resolver.texts({ authorId: catalog.vergil.id });
      const caesar = await resolver.texts({ authorId: catalog.caesar.id });

      expect(titlesOf(vergil.edges.map((edge) => edge.node))).toStrictEqual([
        "Aeneid",
        "Book I",
        "Book II",
        "Eclogues",
        "Proem",
      ]);
      expect(vergil.totalCount).toBe(5);
      expect(titlesOf(caesar.edges.map((edge) => edge.node))).toStrictEqual([
        "De Bello Gallico",
      ]);
    });

    it("filters by parent text to its direct children only", async () => {
      expect.hasAssertions();

      const connection = await resolver.texts({
        parentTextId: catalog.aeneid.id,
      });

      expect(titlesOf(connection.edges.map((edge) => edge.node))).toStrictEqual(
        ["Book I", "Book II"],
      );
      expect(connection.totalCount).toBe(2);
    });

    it("applies the author and parent text filters together", async () => {
      expect.hasAssertions();

      const matching = await resolver.texts({
        authorId: catalog.vergil.id,
        parentTextId: catalog.bookOne.id,
      });
      const mismatched = await resolver.texts({
        authorId: catalog.caesar.id,
        parentTextId: catalog.aeneid.id,
      });

      expect(titlesOf(matching.edges.map((edge) => edge.node))).toStrictEqual([
        "Proem",
      ]);
      expect(mismatched.edges).toStrictEqual([]);
      expect(mismatched.totalCount).toBe(0);
    });

    it("returns an empty connection for an author with no texts", async () => {
      expect.hasAssertions();

      const connection = await resolver.texts({ authorId: catalog.cicero.id });

      expect(connection.edges).toStrictEqual([]);
      expect(connection.totalCount).toBe(0);
      expect(connection.pageInfo.hasNextPage).toBe(false);
      expect(connection.pageInfo.hasPreviousPage).toBe(false);
      expect(connection.pageInfo.startCursor ?? null).toBeNull();
      expect(connection.pageInfo.endCursor ?? null).toBeNull();
    });

    it("pages forward through a filtered connection with first and after", async () => {
      expect.hasAssertions();

      const pages = await walkForward(async (after) =>
        resolver.texts({ after, authorId: catalog.vergil.id, first: 2 }),
      );

      expect(pages.map((page) => page.edges.length)).toStrictEqual([2, 2, 1]);
      expect(titlesOf(nodesOf(pages))).toStrictEqual([
        "Aeneid",
        "Book I",
        "Book II",
        "Eclogues",
        "Proem",
      ]);
      expect(pages.map((page) => page.totalCount)).toStrictEqual([5, 5, 5]);
      expect(pages.at(-1)?.pageInfo.hasNextPage).toBe(false);
    });

    it("pages backward through every text with last and before", async () => {
      expect.hasAssertions();

      const pages = await walkBackward(async (before) =>
        resolver.texts({ before, last: 3 }),
      );

      expect(pages.map((page) => page.edges.length)).toStrictEqual([3, 3, 1]);
      expect(titlesOf(nodesOf(pages.toReversed()))).toStrictEqual([
        ...TEXT_TITLES_IN_ORDER,
      ]);
      expect(pages[0]?.pageInfo.hasNextPage).toBe(false);
      expect(pages.at(-1)?.pageInfo.hasPreviousPage).toBe(false);
      expect(pages.map((page) => page.totalCount)).toStrictEqual(
        pages.map(() => TEXT_TITLES_IN_ORDER.length),
      );
    });

    it("bounds a page by both an after and a before cursor", async () => {
      expect.hasAssertions();

      const all = await resolver.texts({});
      const after = all.edges[0]?.cursor ?? null;
      const before = all.edges[4]?.cursor ?? null;

      const connection = await resolver.texts({ after, before });

      expect(titlesOf(connection.edges.map((edge) => edge.node))).toStrictEqual(
        ["Book I", "Book II", "Carmina"],
      );
    });
  });

  describe("hierarchy navigation", () => {
    it("lists a text's direct children by title", async () => {
      expect.hasAssertions();

      expect(titlesOf(await resolver.childTexts(catalog.aeneid))).toStrictEqual(
        ["Book I", "Book II"],
      );
      expect(
        titlesOf(await resolver.childTexts(catalog.bookOne)),
      ).toStrictEqual(["Proem"]);
      await expect(resolver.childTexts(catalog.proem)).resolves.toStrictEqual(
        [],
      );
    });

    it("resolves no parent for a top-level text", async () => {
      expect.hasAssertions();

      const aeneid = await resolver.text({ slug: "vergil/aeneid" });
      const parent =
        aeneid === null ? undefined : await resolver.parentText(aeneid);

      expect(aeneid?.id).toBe(catalog.aeneid.id);
      expect(parent).toBeNull();
    });

    it("climbs from a section to its book and on to the corpus", async () => {
      expect.hasAssertions();

      const proem = await resolver.text({ slug: "vergil/aeneid/1/proem" });
      const book = proem === null ? null : await resolver.parentText(proem);
      const corpus = book === null ? null : await resolver.parentText(book);

      expect(book?.slug).toBe("vergil/aeneid/1");
      expect(corpus?.slug).toBe("vergil/aeneid");
    });

    it("climbs from a child listed under its parent back to that parent", async () => {
      expect.hasAssertions();

      const [child] = await resolver.childTexts(catalog.aeneid);
      const parent =
        child === undefined ? null : await resolver.parentText(child);

      expect(parent?.id).toBe(catalog.aeneid.id);
    });

    it("lists a text's lines in index order whatever order they were saved", async () => {
      expect.hasAssertions();

      const lines = await resolver.linesForText(catalog.proem);

      expect(lines.map((line) => line.label)).toStrictEqual([
        ...PROEM_LINE_LABELS,
      ]);
      expect(lines[0]?.data).toMatch(/^Arma virumque cano/);
      expect(lines.every((line) => line.text.id === catalog.proem.id)).toBe(
        true,
      );
    });

    it("lists no lines for a text whose lines all sit in its children", async () => {
      expect.hasAssertions();
      await expect(
        resolver.linesForText(catalog.aeneid),
      ).resolves.toStrictEqual([]);
    });
  });
});
