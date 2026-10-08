/* cspell:words adspirate Amatoria Amores Argonautica argonautica atavis auctor carmina coeptis Cogitanti dicere edite fert Flaccus formas fueramus Horatius illas illi libelli Maecenas meis memoria Metamorphoses mihi mundi mutastis mutatas Naso Nasonis natus nondum nunc omnia Oratore origine Ovidius Peneia Phoebi Poetica praetulit primaque Publius quinque Quintus regibus repetenti saepenumero Satirae sumus Tullius Valerius valerius vetera vincit vinum */

import { Author, Line, Text } from "@codebase/lexico-entities";

import type { DatabaseTestingModule } from "@codebase/database/testing";

const AUTHOR_SLUGS = ["cicero", "horace", "ovid", "valerius-flaccus"] as const;

/** Author slugs seeded by the literature search corpus. */
export type LiteratureSearchAuthorSlug = (typeof AUTHOR_SLUGS)[number];

/** The saved rows of the corpus, looked up by slug, so tests can name expectations. */
export interface LiteratureSearchCorpus {
  readonly author: (slug: LiteratureSearchAuthorSlug) => Author;
  readonly lines: readonly Line[];
  readonly text: (slug: LiteratureSearchTextSlug) => Text;
}

/** Text slugs seeded by the literature search corpus. */
export type LiteratureSearchTextSlug =
  | "cicero/oratore"
  | "horace/ars-poetica"
  | "horace/carmina"
  | "horace/satirae"
  | "ovid/amores"
  | "ovid/ars-amatoria"
  | "ovid/metamorphoses"
  | "valerius-flaccus/argonautica";

/** One text to seed, with its author and its lines in index order. */
interface SeededText {
  readonly author: LiteratureSearchAuthorSlug;
  readonly lines: readonly string[];
  readonly title: string;
}

const AUTHOR_NAMES: Readonly<Record<LiteratureSearchAuthorSlug, string>> = {
  cicero: "Marcus Tullius Cicero",
  horace: "Quintus Horatius Flaccus",
  ovid: "Publius Ovidius Naso",
  "valerius-flaccus": "Gaius Valerius Flaccus",
};

const TEXTS: ReadonlyMap<LiteratureSearchTextSlug, SeededText> = new Map([
  [
    "cicero/oratore",
    {
      author: "cicero",
      lines: [
        "Cogitanti mihi saepenumero et memoria vetera repetenti",
        "Ovidius nondum natus erat",
      ],
      title: "De Oratore",
    },
  ],
  ["horace/ars-poetica", { author: "horace", lines: [], title: "Ars Poetica" }],
  [
    "horace/carmina",
    {
      author: "horace",
      lines: [
        "Maecenas atavis edite regibus",
        "nunc amor et vinum",
        "AMOR vincit omnia",
      ],
      title: "Carmina",
    },
  ],
  ["horace/satirae", { author: "horace", lines: [], title: "Satirae" }],
  [
    "ovid/amores",
    {
      author: "ovid",
      lines: [
        "qui modo Nasonis fueramus quinque libelli",
        "tres sumus hoc illi praetulit auctor opus",
      ],
      title: "Amores",
    },
  ],
  ["ovid/ars-amatoria", { author: "ovid", lines: [], title: "Ars Amatoria" }],
  [
    "ovid/metamorphoses",
    {
      author: "ovid",
      lines: [
        "In nova fert animus mutatas dicere formas",
        "corpora di coeptis nam vos mutastis et illas",
        "adspirate meis primaque ab origine mundi",
        "primus amor Phoebi Daphne Peneia",
      ],
      title: "Metamorphoses",
    },
  ],
  [
    "valerius-flaccus/argonautica",
    { author: "valerius-flaccus", lines: [], title: "Argonautica" },
  ],
]);

/**
 * Seeds four authors, eight texts, and their lines: names, slugs, titles, and
 * line contents chosen so each search matches by exactly one column, matches
 * across authors, or matches nothing, as each test needs.
 */
export async function seedLiteratureSearchCorpus(
  database: DatabaseTestingModule,
): Promise<LiteratureSearchCorpus> {
  const authors = new Map<LiteratureSearchAuthorSlug, Author>();
  for (const slug of AUTHOR_SLUGS) {
    const author = new Author();
    author.name = AUTHOR_NAMES[slug];
    author.slug = slug;
    authors.set(slug, await database.repository(Author).save(author));
  }

  const texts = new Map<LiteratureSearchTextSlug, Text>();
  const lines: Line[] = [];
  for (const [slug, seed] of TEXTS) {
    const author = seeded(authors, seed.author);
    const text = new Text();
    text.author = author;
    text.slug = slug;
    text.title = seed.title;
    const savedText = await database.repository(Text).save(text);
    texts.set(slug, savedText);

    for (const [index, data] of seed.lines.entries()) {
      const line = new Line();
      line.author = author;
      line.data = data;
      line.index = index;
      line.label = String(index + 1);
      line.text = savedText;
      lines.push(await database.repository(Line).save(line));
    }
  }

  return {
    author: (slug) => seeded(authors, slug),
    lines,
    text: (slug) => seeded(texts, slug),
  };
}

/** Reads a seeded row, failing loudly rather than handing a test `undefined`. */
function seeded<Slug extends string, Row>(
  rows: ReadonlyMap<Slug, Row>,
  slug: Slug,
): Row {
  const row = rows.get(slug);
  if (row === undefined) throw new Error(`Unseeded slug ${slug}`);
  return row;
}
