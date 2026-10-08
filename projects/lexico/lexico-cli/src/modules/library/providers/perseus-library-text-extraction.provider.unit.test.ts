import * as cheerio from "cheerio";
import { describe, expect, it, vi } from "vitest";

import { PerseusLibraryTextExtractionProvider } from "./perseus-library-text-extraction.provider";

import type { PerseusMarkdownFile } from "./perseus-library-text-extraction.provider";
import type { AnyNode } from "domhandler";

describe(PerseusLibraryTextExtractionProvider, () => {
  const perseusLibraryTextExtractionProvider =
    new PerseusLibraryTextExtractionProvider();

  it("should skip text parts for known excluded keywords", () => {
    const shouldSkipTextPart = (
      perseusLibraryTextExtractionProvider as unknown as {
        shouldSkipTextPart: (subtype: string, n: string) => boolean;
      }
    ).shouldSkipTextPart.bind(perseusLibraryTextExtractionProvider);

    expect(shouldSkipTextPart("front", "1")).toBe(true);
    expect(shouldSkipTextPart("section", "index")).toBe(true);
    expect(shouldSkipTextPart("book", "1")).toBe(false);
  });

  it("should build descriptor for supported child text parts", () => {
    const page = cheerio.load(
      `<div type="textpart" subtype="book" n="1"></div>`,
    );
    const child = page("div").first();

    const getTextPartDescriptor = (
      perseusLibraryTextExtractionProvider as unknown as {
        getTextPartDescriptor: (childElement: cheerio.Cheerio<AnyNode>) =>
          | undefined
          | {
              element: cheerio.Cheerio<AnyNode>;
              partName: string;
              partTitle: string;
            };
      }
    ).getTextPartDescriptor.bind(perseusLibraryTextExtractionProvider);

    const descriptor = getTextPartDescriptor(child);

    expect(descriptor).toStrictEqual(
      expect.objectContaining({
        partName: "book-1",
        partTitle: "Book 1",
      }),
    );
  });

  it("should build descriptor with default subtype when attributes are missing", () => {
    const page = cheerio.load(`<div type="textpart"></div>`);
    const child = page("div").first();

    const descriptor = (
      perseusLibraryTextExtractionProvider as unknown as {
        getTextPartDescriptor: (childElement: cheerio.Cheerio<AnyNode>) =>
          | undefined
          | {
              element: cheerio.Cheerio<AnyNode>;
              partName: string;
              partTitle: string;
            };
      }
    ).getTextPartDescriptor(child);

    expect(descriptor).toStrictEqual(
      expect.objectContaining({
        partName: "section",
        partTitle: "Section",
      }),
    );
  });

  it("should return undefined descriptor for skipped child text parts", () => {
    const page = cheerio.load(
      `<div type="textpart" subtype="front" n="1"></div>`,
    );
    const child = page("div").first();

    const descriptor = (
      perseusLibraryTextExtractionProvider as unknown as {
        getTextPartDescriptor: (childElement: cheerio.Cheerio<AnyNode>) =>
          | undefined
          | {
              element: cheerio.Cheerio<AnyNode>;
              partName: string;
              partTitle: string;
            };
      }
    ).getTextPartDescriptor(child);

    expect(descriptor).toBeUndefined();
  });

  it("should collect and normalize paragraphs from p and l elements", () => {
    const page = cheerio.load(`
      <div>
        <p n="1">arma <note>ignored</note> virumque</p>
        <l>cano</l>
      </div>
    `);

    const collectParagraphsFromElements = (
      perseusLibraryTextExtractionProvider as unknown as {
        collectParagraphsFromElements: (
          elements: cheerio.Cheerio<AnyNode>,
          page: cheerio.CheerioAPI,
        ) => string[];
      }
    ).collectParagraphsFromElements.bind(perseusLibraryTextExtractionProvider);

    const paragraphs = collectParagraphsFromElements(page("p, l"), page);

    expect(paragraphs).toStrictEqual(["**1** arma virumque", "cano"]);
  });

  it("should skip empty paragraphs after cleanup", () => {
    const page = cheerio.load(`
      <div>
        <p><note>ignored</note></p>
        <p>arma virumque</p>
      </div>
    `);

    const collectParagraphsFromElements = (
      perseusLibraryTextExtractionProvider as unknown as {
        collectParagraphsFromElements: (
          elements: cheerio.Cheerio<AnyNode>,
          page: cheerio.CheerioAPI,
        ) => string[];
      }
    ).collectParagraphsFromElements.bind(perseusLibraryTextExtractionProvider);

    const paragraphs = collectParagraphsFromElements(page("p"), page);

    expect(paragraphs).toStrictEqual(["arma virumque"]);
  });

  it("should process leaf text part and push markdown file", () => {
    const page = cheerio.load(`<div><p n="2">litora multum</p></div>`);

    const filesToWrite: PerseusMarkdownFile[] = [];

    (
      perseusLibraryTextExtractionProvider as unknown as {
        processLeafTextPart: (args: {
          $: cheerio.CheerioAPI;
          $element: cheerio.Cheerio<AnyNode>;
          currentPath: string[];
          currentTitle: string;
          filesToWrite: PerseusMarkdownFile[];
          rawTitle: string;
        }) => void;
      }
    ).processLeafTextPart({
      $: page,
      $element: page("div").first(),
      currentPath: ["aeneid", "book-1"],
      currentTitle: "Book 1",
      filesToWrite,
      rawTitle: "Aeneid",
    });

    expect(filesToWrite).toStrictEqual([
      {
        content: "**2** litora multum",
        relativePath: "aeneid/book-1.md",
        title: "Book 1",
      },
    ]);
  });

  it("should process leaf text fallback when no p or l nodes exist", () => {
    const page = cheerio.load(`<div>line 10</div>`);

    const filesToWrite: PerseusMarkdownFile[] = [];

    (
      perseusLibraryTextExtractionProvider as unknown as {
        processLeafTextPart: (args: {
          $: cheerio.CheerioAPI;
          $element: cheerio.Cheerio<AnyNode>;
          currentPath: string[];
          currentTitle: string;
          filesToWrite: PerseusMarkdownFile[];
          rawTitle: string;
        }) => void;
      }
    ).processLeafTextPart({
      $: page,
      $element: page("div").first(),
      currentPath: ["aeneid", "book-2"],
      currentTitle: "Book 2",
      filesToWrite,
      rawTitle: "Aeneid",
    });

    expect(filesToWrite).toStrictEqual([
      {
        content: "line 10",
        relativePath: "aeneid/book-2.md",
        title: "Book 2",
      },
    ]);
  });

  it("should process children and include direct paragraph index file", () => {
    const page = cheerio.load(`
      <div>
        <div type="textpart" subtype="book" n="1">
          <p n="1">arma virumque</p>
        </div>
        <p n="0">proemium</p>
      </div>
    `);

    const filesToWrite: PerseusMarkdownFile[] = [];

    perseusLibraryTextExtractionProvider.extractTextNodes({
      $: page,
      $element: page("div").first(),
      currentPath: ["aeneid"],
      currentTitle: "Aeneid",
      filesToWrite,
      rawTitle: "Aeneid",
    });

    expect(
      filesToWrite.some((file) => file.relativePath === "aeneid/book-1.md"),
    ).toBe(true);
    expect(
      filesToWrite.some((file) => file.relativePath === "aeneid/index.md"),
    ).toBe(true);
  });

  it("should use current title for nested index files", () => {
    const page = cheerio.load(`
      <div>
        <div type="textpart" subtype="book" n="1">
          <p n="1">arma virumque</p>
        </div>
        <p n="0">proemium</p>
      </div>
    `);

    const filesToWrite: PerseusMarkdownFile[] = [];

    (
      perseusLibraryTextExtractionProvider as unknown as {
        processTextPartChildren: (args: {
          $: cheerio.CheerioAPI;
          $element: cheerio.Cheerio<AnyNode>;
          children: cheerio.Cheerio<AnyNode>;
          currentPath: string[];
          currentTitle: string;
          filesToWrite: PerseusMarkdownFile[];
          rawTitle: string;
        }) => void;
      }
    ).processTextPartChildren({
      $: page,
      $element: page("div").first(),
      children: page("div").first().children("div[type='textpart']"),
      currentPath: ["aeneid", "book-0"],
      currentTitle: "Book 0",
      filesToWrite,
      rawTitle: "Aeneid",
    });

    expect(filesToWrite).toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({
          relativePath: "aeneid/book-0/index.md",
          title: "Book 0",
        }),
      ]),
    );
  });

  it("should skip child extraction when descriptor is undefined", () => {
    const page = cheerio.load(`
      <div>
        <div type="textpart" subtype="front" n="1"><p>ignored</p></div>
      </div>
    `);

    const extractTextNodesSpy = vi.spyOn(
      perseusLibraryTextExtractionProvider as unknown as {
        extractTextNodes: (args: {
          $: cheerio.CheerioAPI;
          $element: cheerio.Cheerio<AnyNode>;
          currentPath: string[];
          currentTitle: string;
          filesToWrite: PerseusMarkdownFile[];
          rawTitle: string;
        }) => void;
      },
      "extractTextNodes",
    );

    (
      perseusLibraryTextExtractionProvider as unknown as {
        extractChildTextParts: (args: {
          $: cheerio.CheerioAPI;
          children: cheerio.Cheerio<AnyNode>;
          currentPath: string[];
          filesToWrite: PerseusMarkdownFile[];
          rawTitle: string;
        }) => void;
      }
    ).extractChildTextParts({
      $: page,
      children: page("div").first().children("div[type='textpart']"),
      currentPath: ["aeneid"],
      filesToWrite: [],
      rawTitle: "Aeneid",
    });

    expect(extractTextNodesSpy).not.toHaveBeenCalled();
  });

  it("should use raw title when current path has one segment", () => {
    const page = cheerio.load(`<div><p n="2">litora multum</p></div>`);
    const filesToWrite: PerseusMarkdownFile[] = [];

    (
      perseusLibraryTextExtractionProvider as unknown as {
        processLeafTextPart: (args: {
          $: cheerio.CheerioAPI;
          $element: cheerio.Cheerio<AnyNode>;
          currentPath: string[];
          currentTitle: string;
          filesToWrite: PerseusMarkdownFile[];
          rawTitle: string;
        }) => void;
      }
    ).processLeafTextPart({
      $: page,
      $element: page("div").first(),
      currentPath: ["aeneid"],
      currentTitle: "Book 1",
      filesToWrite,
      rawTitle: "Aeneid",
    });

    expect(filesToWrite).toStrictEqual(
      expect.arrayContaining([expect.objectContaining({ title: "Aeneid" })]),
    );
  });

  it("should process child text parts but skip index file for invalid direct paragraphs", () => {
    const page = cheerio.load(`
      <div>
        <div type="textpart" subtype="book" n="1">
          <p n="1">arma virumque</p>
        </div>
        <p>12345</p>
      </div>
    `);

    const filesToWrite: PerseusMarkdownFile[] = [];

    perseusLibraryTextExtractionProvider.extractTextNodes({
      $: page,
      $element: page("div").first(),
      currentPath: ["aeneid"],
      currentTitle: "Aeneid",
      filesToWrite,
      rawTitle: "Aeneid",
    });

    expect(
      filesToWrite.some((file) => file.relativePath === "aeneid/book-1.md"),
    ).toBe(true);
    expect(
      filesToWrite.some((file) => file.relativePath === "aeneid/index.md"),
    ).toBe(false);
  });

  it("should skip writing leaf files with invalid textual content", () => {
    const page = cheerio.load(`<div><p>12345</p></div>`);
    const filesToWrite: PerseusMarkdownFile[] = [];

    perseusLibraryTextExtractionProvider.extractTextNodes({
      $: page,
      $element: page("div").first(),
      currentPath: ["numbers-only"],
      currentTitle: "Numbers",
      filesToWrite,
      rawTitle: "Numbers",
    });

    expect(filesToWrite).toHaveLength(0);
  });
});
