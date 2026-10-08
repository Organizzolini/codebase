import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { meanderRecord } from "../../../testing/meanders";
import { PATTERN_CHARACTERISTIC_KEYS } from "../characteristics/characteristics.constants";
import { CodeService } from "../code/code.service";
import { DrawingService } from "../drawing/drawing.service";
import { GeometryService } from "../geometry/geometry.service";
import { MeanderawDatabaseService } from "../meanderaw-database/meanderaw-database.service";

import { DrawIndexService } from "./draw-index.service";

import type { Meander } from "../meanderaw-database/entities/meander.entity";
import type { MeanderPageContent } from "./draw-index.types";

/**
 * Covers `DrawIndexService.render` in isolation, against a small, hand-built
 * set of rows rather than a real database round trip — the pure half of
 * spec #813's Testing Decisions for this seam, and `build` against a mocked
 * database, for how a page is produced a batch of rows at a time.
 * `draw-index.service.integration.test.ts` covers `build` against a real one.
 */
describe(DrawIndexService, () => {
  let databaseService: MeanderawDatabaseService;
  let service: DrawIndexService;

  /** Every field a fixture row does not care about, defaulted so a case only spells out what it means to test. */
  const meander = (
    overrides: Partial<Meander> & Pick<Meander, "code">,
  ): Meander => ({
    ...meanderRecord({ code: overrides.code, lattice: "3c9a" }),
    createdAt: new Date(0),
    id: "01a107d6-cff8-7238-8684-a2a863bc6928",
    updatedAt: new Date(0),
    ...overrides,
  });

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DrawIndexService,
        GeometryService,
        {
          provide: MeanderawDatabaseService,
          useValue: createMock<MeanderawDatabaseService>(),
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
    databaseService = await module.resolve(MeanderawDatabaseService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("render", () => {
    it("handles an empty corpus", async () => {
      const pages = await service.render([]);

      expect(pages["index.html"]).toContain("0 patterns.");
      expect(Object.keys(pages)).toStrictEqual(["index.html"]);
    });

    it("embeds every meander's own SVG rather than linking to a file", async () => {
      const pages = await service.render([
        meander({ characteristics: { isSnake: true }, code: "a" }),
      ]);
      const page = pages["patterns/isSnake.html"] ?? "";

      expect(page).toContain('<path d="M1 1"/>');
      expect(page).not.toContain("<img");
    });

    it("captions each figure with its lattice address", async () => {
      const pages = await service.render([
        meander({
          characteristics: { isSnake: true },
          code: "abc",
          columns: 2,
          rows: 3,
        }),
      ]);
      const page = pages["patterns/isSnake.html"] ?? "";

      expect(page).toContain("<figcaption>3×2 · abc (isSnake)</figcaption>");
    });

    it("appends every true boolean to the caption, in key-list order with isReducible last, and no number", async () => {
      const pages = await service.render([
        meander({
          characteristics: { crossCount: 3, isDots: true, isReducible: true },
          code: "abc",
          columns: 1,
          rows: 3,
        }),
      ]);
      const page = pages["patterns/isDots.html"] ?? "";

      expect(page).toContain(
        "<figcaption>3×1 · abc (isDots, isReducible)</figcaption>",
      );
    });

    it("links each pattern that holds from the index, with its count, in pattern-key order", async () => {
      const pages = await service.render([
        meander({ characteristics: { isWhirl: true }, code: "a" }),
        meander({ characteristics: { isArcade: true }, code: "b" }),
        meander({ characteristics: { isArcade: true }, code: "c" }),
      ]);
      const indexPage = pages["index.html"] ?? "";

      expect(indexPage).toContain(
        '<li><a href="patterns/isArcade.html">isArcade</a> <span>2</span></li>',
      );
      expect(indexPage).toContain(
        '<li><a href="patterns/isWhirl.html">isWhirl</a> <span>1</span></li>',
      );
      expect(indexPage).toContain("2 patterns.");
      expect(indexPage.indexOf("isArcade.html")).toBeLessThan(
        indexPage.indexOf("isWhirl.html"),
      );
    });

    it("writes no page and no index entry for a pattern that holds for no meander", async () => {
      const pages = await service.render([
        meander({ characteristics: { isWhirl: true }, code: "a" }),
      ]);

      expect(pages["patterns/isSnake.html"]).toBeUndefined();
      expect(pages["index.html"]).not.toContain("isSnake");
    });

    it("lists a meander holding two patterns on both pages", async () => {
      const pages = await service.render([
        meander({
          characteristics: { isDots: true, isWhirl: true },
          code: "both",
          columns: 3,
          rows: 4,
        }),
      ]);

      expect(pages["patterns/isDots.html"]).toContain("4×3 · both");
      expect(pages["patterns/isWhirl.html"]).toContain("4×3 · both");
    });

    it("lists a meander holding no pattern on no page", async () => {
      const pages = await service.render([
        meander({
          characteristics: { isReducible: true },
          code: "holds-nothing",
        }),
        meander({ code: "empty" }),
        meander({ characteristics: { isWhirl: true }, code: "some" }),
      ]);

      expect(Object.keys(pages).toSorted()).toStrictEqual([
        "index.html",
        "patterns/isWhirl.html",
      ]);
      expect(Object.values(pages).join("")).not.toContain("holds-nothing");
      expect(pages["index.html"]).toContain("1 patterns.");
    });

    it("orders rows within a pattern by rows, then columns, then code", async () => {
      const characteristics = { isSnake: true } as const;
      const pages = await service.render([
        meander({ characteristics, code: "z", columns: 5, rows: 3 }),
        meander({ characteristics, code: "b", columns: 2, rows: 4 }),
        meander({ characteristics, code: "a", columns: 1, rows: 4 }),
        meander({ characteristics, code: "b", columns: 1, rows: 4 }), // Same rows and columns, different code
      ]);
      const page = pages["patterns/isSnake.html"] ?? "";

      const shallow = page.indexOf("3×5 · z");
      const narrowA = page.indexOf("4×1 · a");
      const narrowB = page.indexOf("4×1 · b");
      const wide = page.indexOf("4×2 · b");

      expect(shallow).toBeLessThan(narrowA);
      expect(narrowA).toBeLessThan(narrowB);
      expect(narrowB).toBeLessThan(wide);
    });

    it("groups a pattern's page by shape, each with its own count", async () => {
      const characteristics = { isSnake: true } as const;
      const pages = await service.render([
        meander({ characteristics, code: "a", columns: 2, rows: 2 }),
        meander({ characteristics, code: "b", columns: 1, rows: 3 }),
        meander({ characteristics, code: "c", columns: 1, rows: 2 }),
        meander({ characteristics, code: "d", columns: 1, rows: 2 }),
      ]);
      const page = pages["patterns/isSnake.html"] ?? "";

      expect(page).toContain('<p class="count">4 meanders</p>');
      expect(page).toContain(
        '<section id="shape-2×1">\n<h2>2×1</h2>\n<p class="count">2 meanders</p>',
      );
      expect(page).toContain(
        '<section id="shape-2×2">\n<h2>2×2</h2>\n<p class="count">1 meander</p>',
      );
      expect(page.indexOf("shape-2×1")).toBeLessThan(page.indexOf("shape-2×2"));
      expect(page.indexOf("shape-2×2")).toBeLessThan(page.indexOf("shape-3×1"));
    });

    it("counts meanders in a pattern page's own heading", async () => {
      const pages = await service.render([
        meander({ characteristics: { isSnake: true }, code: "a" }),
        meander({ characteristics: { isSnake: true }, code: "b" }),
        meander({ characteristics: { isBoxes: true }, code: "c" }),
      ]);

      expect(pages["patterns/isSnake.html"]).toContain(
        '<section id="isSnake">\n<h2>isSnake</h2>\n<p class="count">2 meanders</p>',
      );
      expect(pages["patterns/isBoxes.html"]).toContain(
        '<section id="isBoxes">\n<h2>isBoxes</h2>\n<p class="count">1 meander</p>',
      );
    });

    it("escapes a lattice address that would otherwise close a tag or an attribute", async () => {
      const pages = await service.render([
        meander({
          characteristics: { isSnake: true },
          code: '<script>&"',
        }),
      ]);

      expect(pages["patterns/isSnake.html"]).toContain(
        "&lt;script&gt;&amp;&quot;",
      );
      expect(pages["patterns/isSnake.html"]).not.toContain("<script>");
    });

    it("defines each meander's own tile once, under its Code, and places it six times along a band", async () => {
      const pages = await service.render([
        meander({
          characteristics: { isSnake: true },
          code: "a",
          columns: 3,
          rows: 4,
        }),
      ]);
      const page = pages["patterns/isSnake.html"] ?? "";

      expect(page.split('<path d="M1 1"/>')).toHaveLength(2);
      expect(page).toContain('<defs><g id="meander-a">');
      expect(page.split('<use href="#meander-a"')).toHaveLength(7);
    });

    it("steps each repeat one tile width (its columns) further along the band, so the tiles meet rather than overlap or gap", async () => {
      const pages = await service.render([
        meander({
          characteristics: { isSnake: true },
          code: "a",
          columns: 3,
          rows: 3,
        }),
      ]);
      const page = pages["patterns/isSnake.html"] ?? "";

      expect(page).toContain('<use href="#meander-a" x="0"/>');
      expect(page).toContain('<use href="#meander-a" x="45"/>');
      expect(page).toContain('<use href="#meander-a" x="225"/>');
      expect(page).not.toContain('<use href="#meander-a" x="270"/>');
    });

    it("sizes the band to hold every repeat at the tile's own height", async () => {
      const pages = await service.render([
        meander({
          characteristics: { isSnake: true },
          code: "a",
          columns: 3,
          rows: 3,
        }),
      ]);
      const page = pages["patterns/isSnake.html"] ?? "";

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

    /** The pattern every build case reads rows for. */
    const key = "isWhirl";
    const characteristics = { isWhirl: true } as const;

    it("asks for the counts of every pattern, then reads rows through patternRows(key)", async () => {
      vi.mocked(databaseService.patternShapeCounts).mockResolvedValue([
        { columns: 1, count: 1, key, rows: 2 },
      ]);
      vi.mocked(databaseService.patternRows).mockImplementation(
        async function* patternRows() {
          yield await Promise.resolve([
            meander({ characteristics, code: "a", columns: 1, rows: 2 }),
          ]);
        },
      );

      const pages = await read(await service.build());

      expect(databaseService.patternShapeCounts).toHaveBeenCalledWith(
        PATTERN_CHARACTERISTIC_KEYS,
      );
      expect(databaseService.patternRows).toHaveBeenCalledWith(key);
      expect(Object.keys(pages).toSorted()).toStrictEqual([
        "index.html",
        "patterns/isWhirl.html",
      ]);
      expect(pages["index.html"]).toContain(
        '<a href="patterns/isWhirl.html">isWhirl</a> <span>1</span>',
      );
    });

    it("writes every count from the grouped query, before reading a row, and every row across the batches it arrives in", async () => {
      vi.mocked(databaseService.patternShapeCounts).mockResolvedValue([
        { columns: 1, count: 2, key, rows: 2 },
        { columns: 1, count: 1, key, rows: 3 },
      ]);
      vi.mocked(databaseService.patternRows).mockImplementation(
        // Each batch arrives the way a database read does: after an await.
        async function* patternRows() {
          yield await Promise.resolve([
            meander({ characteristics, code: "a", columns: 1, rows: 2 }),
          ]);
          yield await Promise.resolve([
            meander({ characteristics, code: "b", columns: 1, rows: 2 }),
            meander({ characteristics, code: "c", columns: 1, rows: 3 }),
          ]);
        },
      );

      const pages = await read(await service.build());
      const page = pages["patterns/isWhirl.html"] ?? "";

      expect(pages["index.html"]).toContain("<span>3</span>");
      expect(page).toContain('<p class="count">3 meanders</p>');
      expect(page).toContain(
        '<section id="shape-2×1">\n<h2>2×1</h2>\n<p class="count">2 meanders</p>',
      );
      expect(page.split('<use href="#meander-').length - 1).toBe(18);
      expect(page.indexOf("meander-b")).toBeLessThan(
        page.indexOf('<section id="shape-3×1">'),
      );
    });

    it("counts a shape the grouped query missed as zero rather than failing the page", async () => {
      vi.mocked(databaseService.patternShapeCounts).mockResolvedValue([
        { columns: 1, count: 1, key, rows: 2 },
      ]);
      vi.mocked(databaseService.patternRows).mockImplementation(
        async function* patternRows() {
          yield await Promise.resolve([
            meander({ characteristics, code: "a", columns: 1, rows: 3 }),
          ]);
        },
      );

      const pages = await read(await service.build());

      expect(pages["patterns/isWhirl.html"]).toContain(
        '<section id="shape-3×1">\n<h2>3×1</h2>\n<p class="count">0 meanders</p>',
      );
    });

    it("closes a pattern's page even when none of its rows arrive", async () => {
      vi.mocked(databaseService.patternShapeCounts).mockResolvedValue([
        { columns: 1, count: 1, key, rows: 2 },
      ]);
      vi.mocked(databaseService.patternRows).mockImplementation(
        async function* patternRows() {
          yield await Promise.resolve([]);
        },
      );

      const pages = await read(await service.build());
      const page = pages["patterns/isWhirl.html"] ?? "";

      expect(page).not.toContain('<section id="shape-');
      expect(page).not.toContain("</div>");
      expect(page).toMatch(/<\/section>\n<\/body>\n<\/html>\n$/u);
    });
  });
});
