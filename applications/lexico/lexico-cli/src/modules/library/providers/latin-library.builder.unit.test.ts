import * as cheerio from "cheerio";
import { describe, expect, it } from "vitest";

import { Author, Text } from "@codebase/lexico-entities";

import { LatinLibraryBuilder } from "./latin-library.builder";

import type { AnyNode } from "domhandler";

// cspell:ignore alphabeta arma bibliasacra cano litora maro multum narma proemium secundus tertius vergilius virumque

describe(LatinLibraryBuilder, () => {
  const latinLibraryBuilder = new LatinLibraryBuilder();

  it("should build root authors and skip index links", () => {
    expect.hasAssertions();

    const html = `
      <p>
        <table>
          <tr>
            <td><a href="vergil.html">Vergil</a></td>
            <td><a href="index.html">Index</a></td>
          </tr>
        </table>
      </p>
    `;

    const authors = latinLibraryBuilder.buildRootAuthors(html);

    expect(authors).toHaveLength(1);
    expect(authors[0]?.slug).toBe("vergil");
    expect(authors[0]?.metadata).toStrictEqual(
      expect.objectContaining({ sourceUrl: "vergil.html" }),
    );
  });

  it("should build category author and normalize leading slash", () => {
    expect.hasAssertions();

    const page = cheerio.load(
      `<table><tr><td><a href="/bible.html">Biblia Sacra</a></td></tr></table>`,
    );
    const anchorElement = page("a").first().get(0);

    const author = anchorElement
      ? latinLibraryBuilder.buildCategoryAuthor(anchorElement, page)
      : null;

    expect(author?.slug).toBe("biblia-sacra");
    expect(author?.metadata).toStrictEqual(
      expect.objectContaining({ sourceUrl: "bible.html" }),
    );
  });

  it("should skip invalid category author href values", () => {
    expect.hasAssertions();

    const page = cheerio.load(
      `<table><tr><td><a href="index.html">Index</a></td></tr></table>`,
    );
    const anchorElement = page("a").first().get(0);

    const author = anchorElement
      ? latinLibraryBuilder.buildCategoryAuthor(anchorElement, page)
      : null;

    expect(author).toBeNull();
  });

  it("should return null category author when href is missing", () => {
    expect.hasAssertions();

    const page = cheerio.load(`<table><tr><td><a>Vergil</a></td></tr></table>`);
    const anchorElement = page("a").first().get(0);

    const author = anchorElement
      ? latinLibraryBuilder.buildCategoryAuthor(anchorElement, page)
      : null;

    expect(author).toBeNull();
  });

  it("should return null category author for blank nickname", () => {
    expect.hasAssertions();

    const page = cheerio.load(
      `<table><tr><td><a href="vergil.html">   </a></td></tr></table>`,
    );
    const anchorElement = page("a").first().get(0);

    const author = anchorElement
      ? latinLibraryBuilder.buildCategoryAuthor(anchorElement, page)
      : null;

    expect(author).toBeNull();
  });

  it("should parse author metadata including date ranges", () => {
    expect.hasAssertions();

    const page = cheerio.load(`
      <h1 class="pagehead">Publius Vergilius Maro</h1>
      <h2 class="date">70 B.C. - 19 B.C.</h2>
    `);

    const metadata = latinLibraryBuilder.extractAuthorPageMetadata(
      page,
      "vergil",
    );

    expect(metadata).toStrictEqual(
      expect.objectContaining({
        birth_year: -70,
        death_year: -19,
        full_name: "Publius Vergilius Maro",
      }),
    );
  });

  it("should infer start era from end era when start era is omitted", () => {
    expect.hasAssertions();

    const page = cheerio.load(`
      <h1>Publius Vergilius Maro</h1>
      <h2>70 - 19 B.C.</h2>
    `);

    const metadata = latinLibraryBuilder.extractAuthorPageMetadata(
      page,
      "vergil",
    );

    expect(metadata).toStrictEqual(
      expect.objectContaining({
        birth_year: -70,
        death_year: -19,
        full_name: "Publius Vergilius Maro",
      }),
    );
  });

  it("should infer A.D. start era when omitted and end era is A.D.", () => {
    expect.hasAssertions();

    const page = cheerio.load(`
      <h1>Publius Vergilius Maro</h1>
      <h2>70 - 19 A.D.</h2>
    `);

    const metadata = latinLibraryBuilder.extractAuthorPageMetadata(
      page,
      "vergil",
    );

    expect(metadata).toStrictEqual(
      expect.objectContaining({
        birth_year: 70,
        death_year: 19,
        full_name: "Publius Vergilius Maro",
      }),
    );
  });

  it("should default end era to A.D. when omitted", () => {
    expect.hasAssertions();

    const page = cheerio.load(`
      <h1>Publius Vergilius Maro</h1>
      <h2>70 A.D. - 19</h2>
    `);

    const metadata = latinLibraryBuilder.extractAuthorPageMetadata(
      page,
      "vergil",
    );

    expect(metadata).toStrictEqual(
      expect.objectContaining({
        birth_year: 70,
        death_year: 19,
        full_name: "Publius Vergilius Maro",
      }),
    );
  });

  it("should extract paragraph lines with pending labels", () => {
    expect.hasAssertions();

    const extractParagraphLines = (
      latinLibraryBuilder as unknown as {
        extractParagraphLines: (paragraphText: string) => string[];
      }
    ).extractParagraphLines.bind(latinLibraryBuilder);

    const lines = extractParagraphLines(
      "IV\narma virumque cano\nThe Latin Library",
    );

    expect(lines).toStrictEqual(["**IV** arma virumque cano"]);
  });

  it("should build text entity from anchor", () => {
    expect.hasAssertions();

    const page = cheerio.load(`<a href="aeneid.html">aeneid</a>`);
    const anchorElement = page("a").first().get(0);

    if (!anchorElement) {
      throw new Error("Expected anchor element");
    }

    const textEntity = latinLibraryBuilder.buildTextEntityForLink(
      anchorElement,
      page,
      "https://www.thelatinlibrary.com/aeneid.html",
    );

    expect(textEntity.title).toBe("Aeneid");
    expect(textEntity.slug).toBe("aeneid");
    expect(textEntity.metadata).toStrictEqual(
      expect.objectContaining({
        sourceUrl: "https://www.thelatinlibrary.com/aeneid.html",
      }),
    );
  });

  it("should build text entity with empty title when anchor text is blank", () => {
    expect.hasAssertions();

    const page = cheerio.load(`<a href="aeneid.html">   </a>`);
    const anchorElement = page("a").first().get(0);

    if (!anchorElement) {
      throw new Error("Expected anchor element");
    }

    const textEntity = latinLibraryBuilder.buildTextEntityForLink(
      anchorElement,
      page,
      "https://www.thelatinlibrary.com/aeneid.html",
    );

    expect(textEntity.title).toBe("");
    expect(textEntity.slug).toBe("");
  });

  it("should build frontmatter without author metadata when metadata is absent", () => {
    expect.hasAssertions();

    const author = new Author();
    author.slug = "vergil";
    author.metadata = null;

    const work = new Text();
    work.title = "Aeneid";
    work.metadata = { sourceUrl: "aeneid.html" };

    const frontmatter = latinLibraryBuilder.buildWorkFrontmatter(
      work,
      author,
      undefined,
    );

    expect(frontmatter).toStrictEqual(
      expect.objectContaining({
        author: "vergil",
        title: "Aeneid",
        type: "book",
      }),
    );
    expect(frontmatter).not.toHaveProperty("author_metadata");
  });

  it("should build markdown content and include scraper note for tiny pages", () => {
    expect.hasAssertions();

    const author = new Author();
    author.slug = "vergil";
    author.metadata = { sourceUrl: "vergil.html" };

    const work = new Text();
    work.metadata = { sourceUrl: "aeneid.html" };
    work.slug = "vergil/aeneid";
    work.title = "Aeneid";

    const page = cheerio.load(`<p>single paragraph</p>`);

    const markdown = latinLibraryBuilder.buildWorkMarkdownContent({
      $work: page,
      author,
      paragraphs: ["**1** arma virumque cano"],
      work,
      workBook: undefined,
    });

    expect(markdown).toContain("---");
    expect(markdown).toContain("## Aeneid");
    expect(markdown).toContain("Scraper note");
  });

  it("should build markdown content with work book heading and no scraper note", () => {
    expect.hasAssertions();

    const author = new Author();
    author.slug = "vergil";
    author.metadata = { sourceUrl: "vergil.html" };

    const work = new Text();
    work.metadata = { sourceUrl: "aeneid-book-1.html" };
    work.slug = "vergil/liber-primus/aeneid";
    work.title = "Aeneid";

    const page = cheerio.load(`
      <p>paragraph one</p>
      <p>paragraph two</p>
    `);

    const markdown = latinLibraryBuilder.buildWorkMarkdownContent({
      $work: page,
      author,
      paragraphs: ["**1** arma virumque cano", "litora multum"],
      work,
      workBook: "Liber Primus",
    });

    expect(markdown).toContain("# Liber Primus");
    expect(markdown).not.toContain("Scraper note");
  });

  it("should omit full_name metadata for missing pages", () => {
    expect.hasAssertions();

    const page = cheerio.load(`
      <h1 class="pagehead">Pagina amissa</h1>
      <h2 class="date"></h2>
    `);

    const metadata = latinLibraryBuilder.extractAuthorPageMetadata(
      page,
      "vergil",
    );

    expect(metadata).toStrictEqual({});
  });

  it("should find raw book headings from nearby heading and table fallback", () => {
    expect.hasAssertions();

    const directHeadingPage = cheerio.load(`
      <h3>liber primus</h3>
      <div>
        <a href="work.html">work</a>
      </div>
    `);
    const directAnchor = directHeadingPage("a").first().get(0);

    if (!directAnchor) {
      throw new Error("Expected direct anchor");
    }

    const directBook = latinLibraryBuilder.findRawBookHeading(
      directAnchor,
      directHeadingPage,
    );

    const tableFallbackPage = cheerio.load(`
      <h4>liber secundus</h4>
      <table>
        <tr>
          <td>
            <table>
              <tr><td><a href="work2.html">work2</a></td></tr>
            </table>
          </td>
        </tr>
      </table>
    `);
    const tableAnchor = tableFallbackPage("a").first().get(0);

    if (!tableAnchor) {
      throw new Error("Expected table anchor");
    }

    const fallbackBook = latinLibraryBuilder.findRawBookHeading(
      tableAnchor,
      tableFallbackPage,
    );

    expect(directBook).toBe("liber primus");
    expect(fallbackBook).toBe("liber secundus");
  });

  it("should compute text slug with and without book", () => {
    expect.hasAssertions();

    const author = new Author();
    author.slug = "vergil";

    const bookText = new Text();
    bookText.title = "Aeneid";
    bookText.metadata = { book: "Liber Primus" };

    const plainText = new Text();
    plainText.title = "Georgics";

    expect(latinLibraryBuilder.getTextSlug(bookText, author)).toBe(
      "vergil/liber-primus/aeneid",
    );
    expect(latinLibraryBuilder.getTextSlug(plainText, author)).toBe(
      "vergil/georgics",
    );
  });

  it("should classify links for skipping and file eligibility", () => {
    expect.hasAssertions();
    expect(latinLibraryBuilder.isSkippedHref("index.html")).toBe(true);
    expect(latinLibraryBuilder.isSkippedHref("author/work.html")).toBe(false);

    expect(latinLibraryBuilder.isTextFileHref("work.html")).toBe(true);
    expect(latinLibraryBuilder.isTextFileHref("work.shtmL")).toBe(true);
    expect(latinLibraryBuilder.isTextFileHref("work.txt")).toBe(false);
  });

  it("should identify external or self links", () => {
    expect.hasAssertions();

    const authorUrlObject = new URL(
      "https://www.thelatinlibrary.com/vergil.html",
    );

    expect(
      latinLibraryBuilder.isExternalOrSelfLink(
        "https://www.thelatinlibrary.com/vergil.html",
        authorUrlObject,
      ),
    ).toBe(true);

    expect(
      latinLibraryBuilder.isExternalOrSelfLink(
        "https://example.com/vergil.html",
        authorUrlObject,
      ),
    ).toBe(true);

    expect(
      latinLibraryBuilder.isExternalOrSelfLink(
        "https://www.thelatinlibrary.com/aeneid.html",
        authorUrlObject,
      ),
    ).toBe(false);
  });

  it("should parse work paragraphs and format numbered lines", () => {
    expect.hasAssertions();

    const page = cheerio.load(`
      <body>
        <p>1</p>
        <p>arma virumque cano</p>
        <p><b>2</b><br/>litora multum</p>
      </body>
    `);

    const paragraphs = latinLibraryBuilder.parseWorkParagraphs(page);

    expect(paragraphs.length).toBeGreaterThan(0);
    expect(paragraphs.join(" ")).toContain("arma virumque cano");
    expect(paragraphs.join(" ")).toContain("**2** litora multum");
  });

  it("should parse work paragraphs from div.page fallback", () => {
    expect.hasAssertions();

    const page = cheerio.load(`
      <body>
        <div class="page">III<br/>arma virumque</div>
      </body>
    `);

    const paragraphs = latinLibraryBuilder.parseWorkParagraphs(page);

    expect(paragraphs).toStrictEqual(["**III** arma virumque"]);
  });

  it("should parse work paragraphs from body fallback when page div is missing", () => {
    expect.hasAssertions();

    const page = cheerio.load(`
      <body>
        V<br/>litora multum
      </body>
    `);

    const paragraphs = latinLibraryBuilder.parseWorkParagraphs(page);

    expect(paragraphs).toStrictEqual(["**V** litora multum"]);
  });

  it("should skip pagehead and empty paragraphs when parsing work paragraphs", () => {
    expect.hasAssertions();

    const page = cheerio.load(`
      <body>
        <p class="pagehead">Header text</p>
        <p>   </p>
      </body>
    `);

    const paragraphs = latinLibraryBuilder.parseWorkParagraphs(page);

    expect(paragraphs).toStrictEqual([]);
  });

  it("should include non-bold tag text when parsing paragraph html", () => {
    expect.hasAssertions();

    const parseParagraphHtml = (
      latinLibraryBuilder as unknown as {
        parseParagraphHtml: (paragraphHtml: string) => string;
      }
    ).parseParagraphHtml.bind(latinLibraryBuilder);

    const parsed = parseParagraphHtml("alpha<i>beta</i><br/>gamma");

    expect(parsed).toContain("alphabeta");
    expect(parsed).toContain("gamma");
  });

  it("should ignore non-tag and non-text nodes when parsing paragraph html", () => {
    expect.hasAssertions();

    const parseParagraphHtml = (
      latinLibraryBuilder as unknown as {
        parseParagraphHtml: (paragraphHtml: string) => string;
      }
    ).parseParagraphHtml.bind(latinLibraryBuilder);

    const parsed = parseParagraphHtml("alpha<!--note--><i>beta</i>");

    expect(parsed).toBe("alphabeta");
  });

  it("should ignore blank bold segments when parsing paragraph html", () => {
    expect.hasAssertions();

    const parseParagraphHtml = (
      latinLibraryBuilder as unknown as {
        parseParagraphHtml: (paragraphHtml: string) => string;
      }
    ).parseParagraphHtml.bind(latinLibraryBuilder);

    const parsed = parseParagraphHtml("<b>   </b><i>alpha</i>");

    expect(parsed).toBe("alpha");
  });

  it("should find raw book heading after skipping empty previous siblings", () => {
    expect.hasAssertions();

    const page = cheerio.load(`
      <h4>liber tertius</h4>
      <div></div>
      <table>
        <tr>
          <td>
            <table>
              <tr><td><a href="work3.html">work3</a></td></tr>
            </table>
          </td>
        </tr>
      </table>
    `);
    const anchorElement = page("a").first().get(0);

    if (!anchorElement) {
      throw new Error("Expected anchor element");
    }

    const rawBook = latinLibraryBuilder.findRawBookHeading(anchorElement, page);

    expect(rawBook).toBe("liber tertius");
  });

  it("should return empty raw book heading when anchor is not within a table", () => {
    expect.hasAssertions();

    const page = cheerio.load(`
      <div>
        <a href="work.html">work</a>
      </div>
    `);
    const anchorElement = page("a").first().get(0);

    if (!anchorElement) {
      throw new Error("Expected anchor element");
    }

    const rawBook = latinLibraryBuilder.findRawBookHeading(anchorElement, page);

    expect(rawBook).toBe("");
  });

  it("should keep raw book heading empty when table has no previous heading sibling", () => {
    expect.hasAssertions();

    const page = cheerio.load(`
      <table>
        <tr>
          <td>
            <a href="work.html">work</a>
          </td>
        </tr>
      </table>
    `);
    const anchorElement = page("a").first().get(0);

    if (!anchorElement) {
      throw new Error("Expected anchor element");
    }

    const rawBook = latinLibraryBuilder.findRawBookHeading(anchorElement, page);

    expect(rawBook).toBe("");
  });

  it("should skip paragraph extraction when paragraph has many links", () => {
    expect.hasAssertions();

    const page = cheerio.load(`
      <body>
        <p>
          <a href="#">a</a>
          <a href="#">b</a>
          <a href="#">c</a>
          <a href="#">d</a>
        </p>
      </body>
    `);

    const paragraphs = latinLibraryBuilder.parseWorkParagraphs(page);

    expect(paragraphs).toStrictEqual([]);
  });

  it("should return empty date metadata when no date range is present", () => {
    expect.hasAssertions();

    const page = cheerio.load(`
      <h1 class="pagehead">Vergil</h1>
      <h2 class="date">unknown date</h2>
    `);

    const metadata = latinLibraryBuilder.extractAuthorPageMetadata(
      page,
      "vergil",
    );

    expect(metadata).toStrictEqual({});
  });

  it("should skip root author links without href", () => {
    expect.hasAssertions();

    const html = `
      <p>
        <table>
          <tr>
            <td><a>Vergil</a></td>
            <td><a href="ovid.html">Ovid</a></td>
          </tr>
        </table>
      </p>
    `;

    const authors = latinLibraryBuilder.buildRootAuthors(html);

    expect(authors).toHaveLength(1);
    expect(authors[0]?.slug).toBe("ovid");
  });

  it("should keep category author href unchanged when it has no leading slash", () => {
    expect.hasAssertions();

    const page = cheerio.load(
      `<table><tr><td><a href="vergil.html">Vergil</a></td></tr></table>`,
    );
    const anchorElement = page("a").first().get(0);

    const author = anchorElement
      ? latinLibraryBuilder.buildCategoryAuthor(anchorElement, page)
      : null;

    expect(author?.metadata).toStrictEqual(
      expect.objectContaining({ sourceUrl: "vergil.html" }),
    );
  });

  it("should default missing year string to zero in private computeYear", () => {
    expect.hasAssertions();

    const computeYear = (
      latinLibraryBuilder as unknown as {
        computeYear: (
          yearString: string | undefined,
          eraString: string,
        ) => number;
      }
    ).computeYear.bind(latinLibraryBuilder);

    expect(computeYear(undefined, "A.D.")).toBe(0);
  });

  it("should process text nodes in extractLinesFromParagraph when html is null", () => {
    expect.hasAssertions();

    const extractLinesFromParagraph = (
      latinLibraryBuilder as unknown as {
        extractLinesFromParagraph: (
          paragraphElement: AnyNode,
          work: cheerio.CheerioAPI,
        ) => string[];
      }
    ).extractLinesFromParagraph.bind(latinLibraryBuilder);

    const page = cheerio.load("<body>arma virumque cano</body>");
    const textNode = page("body").contents().get(0);

    if (!textNode) {
      throw new Error("Expected text node");
    }

    const lines = extractLinesFromParagraph(textNode, page);

    expect(lines).toStrictEqual([]);
  });
});
