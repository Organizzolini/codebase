import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { meanderRecord } from "../../../testing/meanders";
import { CodeService } from "../code/code.service";
import { DatabaseService } from "../database/database.service";
import { DrawingService } from "../drawing/drawing.service";
import { GeometryService } from "../geometry/geometry.service";

import { DrawIndexService } from "./draw-index.service";

import type { MeanderFamily } from "../classification/classification.types";
import type { Meander } from "../database/entities/Meander.entity";
import type { MeanderPageContent } from "./draw-index.types";

/**
 * Covers `DrawIndexService.render` in isolation, against a small, hand-built
 * set of rows rather than a real database round trip — the pure half of
 * spec #813's Testing Decisions for this seam, and `build` against a mocked
 * database, for how a page is produced a batch of rows at a time.
 * `draw-index.service.integration.test.ts` covers `build` against a real one.
 */
describe(DrawIndexService, () => {
  let databaseService: DatabaseService;
  let service: DrawIndexService;

  /** Every field a fixture row does not care about, defaulted so a case only spells out what it means to test. */
  const meander = (
    overrides: Partial<Meander> & Pick<Meander, "code">,
  ): Meander => ({
    ...meanderRecord({ code: overrides.code, lattice: "3c9a" }),
    id: "01a107d6-cff8-7238-8684-a2a863bc6928",
    ...overrides,
  });

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DrawIndexService,
        GeometryService,
        {
          provide: DatabaseService,
          useValue: createMock<DatabaseService>(),
        },
        {
          provide: CodeService,
          useValue: {
            parse: (c: string) => ({
              columns: 3,
              digits: c,
              rows: 4,
            }),
          },
        },
        {
          provide: DrawingService,
          useValue: { render: () => '<path d="M1 1"/>' },
        },
      ],
    }).compile();

    service = await module.resolve(DrawIndexService);
    databaseService = await module.resolve(DatabaseService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("render", () => {
    it("handles an empty corpus", async () => {
      const pages = await service.render([]);

      expect(pages["index.html"]).toContain("0 meanders across 0 families.");
    });

    it("embeds every meander's own SVG rather than linking to a file", async () => {
      const pages = await service.render([
        meander({ code: "a", family: "snake" }),
      ]);
      const page = pages["families/snake.html"] ?? "";

      expect(page).toContain('<path d="M1 1"/>');
      expect(page).not.toContain("<img");
    });

    it("captions each figure with its lattice address", async () => {
      const pages = await service.render([
        meander({
          code: "abc",
          columns: 2,
          family: "snake",
          rows: 3,
        }),
      ]);
      const page = pages["families/snake.html"] ?? "";

      expect(page).toContain("<figcaption>3×2 · abc</figcaption>");
    });

    it("appends every true boolean to the caption, in key-list order with isReducible last, and no number", async () => {
      const pages = await service.render([
        meander({
          characteristics: { crossCount: 3, isDots: true, isReducible: true },
          code: "abc",
          columns: 1,
          family: "boxes",
          rows: 3,
        }),
      ]);
      const page = pages["families/boxes.html"] ?? "";

      expect(page).toContain(
        "<figcaption>3×1 · abc (isDots, isReducible)</figcaption>",
      );
    });

    it("lays the families out according to their declared sort key", async () => {
      const pages = await service.render([
        meander({ code: "a", family: "parallel" }),
        meander({ code: "b", family: "boxes" }),
        meander({ code: "c", family: "snake" }),
      ]);

      const indexPage = pages["index.html"] ?? "";

      expect(indexPage.indexOf("boxes.html")).toBeLessThan(
        indexPage.indexOf("parallel.html"),
      );
      expect(indexPage.indexOf("parallel.html")).toBeLessThan(
        indexPage.indexOf("snake.html"),
      );
    });

    it("groups a null-family row into a dedicated unclassified section, sorted after every named family", async () => {
      const pages = await service.render([
        meander({ code: "a", family: "unclassified" }),
        meander({ code: "b", family: "snake" }),
      ]);

      expect(pages["families/unclassified.html"]).toContain(
        '<section id="unclassified">',
      );

      const indexPage = pages["index.html"] ?? "";

      expect(indexPage.indexOf("snake.html")).toBeLessThan(
        indexPage.indexOf("unclassified.html"),
      );
    });

    it("orders rows within a family by rows, then columns, then code", async () => {
      const pages = await service.render([
        meander({ code: "z", columns: 5, family: "snake", rows: 3 }),
        meander({ code: "b", columns: 2, family: "snake", rows: 4 }),
        meander({ code: "a", columns: 1, family: "snake", rows: 4 }),
        meander({ code: "b", columns: 1, family: "snake", rows: 4 }), // Same rows and columns, different code
      ]);
      const page = pages["families/snake.html"] ?? "";

      const shallow = page.indexOf("3×5 · z");
      const narrowA = page.indexOf("4×1 · a");
      const narrowB = page.indexOf("4×1 · b");
      const wide = page.indexOf("4×2 · b");

      expect(shallow).toBeLessThan(narrowA);
      expect(narrowA).toBeLessThan(narrowB);
      expect(narrowB).toBeLessThan(wide);
    });

    it("sorts multiple null families effectively", async () => {
      const pages = await service.render([
        meander({
          code: "a",
          columns: 2,
          family: "unclassified",
          rows: 2,
        }),
        meander({
          code: "b",
          columns: 1,
          family: "unclassified",
          rows: 3,
        }),
        meander({
          code: "c",
          columns: 1,
          family: "unclassified",
          rows: 2,
        }),
      ]);

      expect(pages["families/unclassified.html"]).toContain("3 meanders");

      const unclassified = pages["families/unclassified.html"] ?? "";

      const shallowNarrow = unclassified.indexOf("2×1");
      const shallowWide = unclassified.indexOf("2×2");
      const deepNarrow = unclassified.indexOf("3×1");

      expect(shallowNarrow).toBeLessThan(shallowWide);
      expect(shallowWide).toBeLessThan(deepNarrow);
    });

    it("sorts null/null combinations", async () => {
      const pages = await service.render([
        meander({
          code: "a",
          columns: 2,
          family: "unclassified",
          rows: 2,
        }),
        meander({
          code: "b",
          columns: 2,
          family: "unclassified",
          rows: 2,
        }),
      ]);

      expect(pages["families/unclassified.html"]).toContain("2 meanders");
    });

    it("sorts unrecognized families alphabetically when missing from FAMILY_SORT_KEYS", async () => {
      const pages = await service.render([
        meander({ code: "a", family: "zeta" as MeanderFamily }),
        meander({ code: "b", family: "alpha" as MeanderFamily }),
        meander({ code: "c", family: "zeta" as MeanderFamily }),
        meander({ code: "d", family: "unclassified" }),
      ]);

      const indexPage = pages["index.html"] ?? "";

      // Neither is in FAMILY_SORT_KEYS, so alpha comes before zeta
      // and null comes after everything. Also multiple of same unrecognized family rank correctly.
      expect(indexPage.indexOf("alpha.html")).toBeLessThan(
        indexPage.indexOf("zeta.html"),
      );
    });

    it("counts meanders in a section's own heading and in the page summary", async () => {
      const pages = await service.render([
        meander({ code: "a", family: "snake" }),
        meander({ code: "b", family: "snake" }),
        meander({ code: "c", family: "boxes" }),
      ]);

      expect(pages["families/snake.html"]).toContain("2 meanders");
      expect(pages["families/boxes.html"]).toContain("1 meander<");
      expect(pages["index.html"]).toContain("3 meanders across 2 families.");
    });

    it("links each family section from a jump list", async () => {
      const pages = await service.render([
        meander({ code: "a", family: "snake" }),
      ]);

      expect(pages["index.html"]).toContain(
        '<a href="families/snake.html">snake</a>',
      );
    });

    it("escapes a lattice address that would otherwise close a tag or an attribute", async () => {
      const pages = await service.render([
        meander({ code: '<script>&"', family: "snake" }),
      ]);

      expect(pages["families/snake.html"]).toContain(
        "&lt;script&gt;&amp;&quot;",
      );
      expect(pages["families/snake.html"]).not.toContain("<script>");
    });

    it("defines each meander's own tile once, under its Code, and places it six times along a band", async () => {
      const pages = await service.render([
        meander({
          code: "a",
          columns: 3,
          family: "snake",
          rows: 4,
        }),
      ]);
      const page = pages["families/snake.html"] ?? "";

      expect(page.split('<path d="M1 1"/>')).toHaveLength(2);
      expect(page).toContain('<defs><g id="meander-a">');
      expect(page.split('<use href="#meander-a"')).toHaveLength(7);
    });

    it("steps each repeat one tile width (its columns) further along the band, so the tiles meet rather than overlap or gap", async () => {
      const pages = await service.render([
        meander({
          code: "a",
          columns: 3,
          family: "snake",
          rows: 3,
        }),
      ]);
      const page = pages["families/snake.html"] ?? "";

      expect(page).toContain('<use href="#meander-a" x="0"/>');
      expect(page).toContain('<use href="#meander-a" x="45"/>');
      expect(page).toContain('<use href="#meander-a" x="225"/>');
      expect(page).not.toContain('<use href="#meander-a" x="270"/>');
    });

    it("sizes the band to hold every repeat at the tile's own height", async () => {
      const pages = await service.render([
        meander({
          code: "a",
          columns: 3,
          family: "snake",
          rows: 3,
        }),
      ]);
      const page = pages["families/snake.html"] ?? "";

      expect(page).toContain(
        '<svg width="277.5" height="67.5" viewBox="0 0 277.5 67.5" fill="none"',
      );
    });
  });

  describe("build", () => {
    /** Reads every page `build` produces into the string it would write. */
    const read = async (
      pages: Record<string, MeanderPageContent>,
    ): Promise<Record<string, string>> => {
      const read: Record<string, string> = {};

      for (const [path, content] of Object.entries(pages)) {
        read[path] = "";

        for await (const piece of content) {
          read[path] += piece;
        }
      }

      return read;
    };

    it("writes every count from the grouped query, before reading a row, and every row across the batches it arrives in", async () => {
      vi.mocked(databaseService.familyShapeCounts).mockResolvedValue([
        { columns: 1, count: 2, family: "unclassified", rows: 2 },
        { columns: 1, count: 1, family: "unclassified", rows: 3 },
      ]);
      vi.mocked(databaseService.familyRows).mockImplementation(
        // Each batch arrives the way a database read does: after an await.
        async function* familyRows() {
          yield await Promise.resolve([
            meander({ code: "a", columns: 1, family: "unclassified", rows: 2 }),
          ]);
          yield await Promise.resolve([
            meander({ code: "b", columns: 1, family: "unclassified", rows: 2 }),
            meander({ code: "c", columns: 1, family: "unclassified", rows: 3 }),
          ]);
        },
      );

      const pages = await read(await service.build());
      const page = pages["families/unclassified.html"] ?? "";

      expect(pages["index.html"]).toContain("3 meanders across 1 families.");
      expect(page).toContain('<p class="count">3 meanders</p>');
      expect(page).toContain(
        '<section id="shape-2×1">\n<h2>2×1</h2>\n<p class="count">2 meanders</p>',
      );
      expect(page.split('<use href="#meander-').length - 1).toBe(18);
      expect(page.indexOf("meander-b")).toBeLessThan(
        page.indexOf('<section id="shape-3×1">'),
      );
    });
  });
});
