/* cspell:words arma cano carmina fato iactatus italiam laviniaque profugus terris troiae venit virumque */

import { Author, Line, Text } from "@codebase/lexico-entities";

import type { LexicoTestDatabase } from "./database";

/** An id no seeded author, text, or line has. */
export const UNKNOWN_ENTITY_ID = "00000000-0000-7000-8000-000000000000";

/** Every author's name, in the order the `authors` connection lists them. */
export const AUTHOR_NAMES_IN_ORDER = [
  "Caesar",
  "Catullus",
  "Cicero",
  "Ovid",
  "Vergil",
] as const;

/** Every text's title, in the order the `texts` connection lists them. */
export const TEXT_TITLES_IN_ORDER = [
  "Aeneid",
  "Book I",
  "Book II",
  "Carmina",
  "De Bello Gallico",
  "Eclogues",
  "Proem",
] as const;

/** The labels of the proem's lines, in index order. */
export const PROEM_LINE_LABELS = ["1", "2", "3"] as const;

/** The seeded rows a suite navigates, addressed by what they represent. */
export interface AuthorTextCatalog {
  readonly aeneid: Text;
  readonly bookOne: Text;
  readonly bookTwo: Text;
  readonly caesar: Author;
  readonly cicero: Author;
  readonly eclogues: Text;
  readonly proem: Text;
  readonly vergil: Author;
}

/** What one text needs besides its author. */
interface TextSeed {
  readonly parentText?: Text;
  readonly slug: string;
  readonly title: string;
  readonly type: string;
}

/**
 * Seeds a small library whose hierarchy reaches three levels deep — Vergil's
 * Aeneid holds two books, the first of which holds a proem with three lines —
 * beside authors with flat bibliographies and two with none. Lines are
 * saved out of index order, and every name and title sorts uniquely, so the
 * order a query returns is the order the query imposed.
 */
export async function seedAuthorTextCatalog(
  database: LexicoTestDatabase,
): Promise<AuthorTextCatalog> {
  const authors = database.repository(Author);
  const texts = database.repository(Text);

  /** Saves one author, slugged by their lowercased name. */
  async function seedAuthor(name: string): Promise<Author> {
    return authors.save(authors.create({ name, slug: name.toLowerCase() }));
  }

  const vergil = await seedAuthor("Vergil");
  const caesar = await seedAuthor("Caesar");
  const catullus = await seedAuthor("Catullus");
  const cicero = await seedAuthor("Cicero");
  await seedAuthor("Ovid");

  /** Saves one text under an author. */
  async function seedText(author: Author, seed: TextSeed): Promise<Text> {
    return texts.save(texts.create({ ...seed, author }));
  }

  const aeneid = await seedText(vergil, {
    slug: "vergil/aeneid",
    title: "Aeneid",
    type: "corpus",
  });
  const bookOne = await seedText(vergil, {
    parentText: aeneid,
    slug: "vergil/aeneid/1",
    title: "Book I",
    type: "book",
  });
  const bookTwo = await seedText(vergil, {
    parentText: aeneid,
    slug: "vergil/aeneid/2",
    title: "Book II",
    type: "book",
  });
  const proem = await seedText(vergil, {
    parentText: bookOne,
    slug: "vergil/aeneid/1/proem",
    title: "Proem",
    type: "section",
  });
  const eclogues = await seedText(vergil, {
    slug: "vergil/eclogues",
    title: "Eclogues",
    type: "text",
  });
  await seedText(catullus, {
    slug: "catullus/carmina",
    title: "Carmina",
    type: "text",
  });
  await seedText(caesar, {
    slug: "caesar/de-bello-gallico",
    title: "De Bello Gallico",
    type: "text",
  });

  const lines = database.repository(Line);
  for (const [index, data] of [
    [2, "Italiam fato profugus Laviniaque venit"],
    [0, "Arma virumque cano, Troiae qui primus ab oris"],
    [1, "litora, multum ille et terris iactatus et alto"],
  ] as const) {
    await lines.save(
      lines.create({
        author: vergil,
        data,
        index,
        label: String(index + 1),
        text: proem,
      }),
    );
  }

  return {
    aeneid,
    bookOne,
    bookTwo,
    caesar,
    cicero,
    eclogues,
    proem,
    vergil,
  };
}
