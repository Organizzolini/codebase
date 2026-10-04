import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { meanderRecord } from "../../../testing/meanders";
import { CodeService } from "../code/code.service";
import { DatabaseService } from "../database/database.service";
import { DrawingService } from "../drawing/drawing.service";
import { GeometryService } from "../geometry/geometry.service";

import { DrawIndexService } from "./draw-index.service";

import type { MeanderFamily } from "../classification/classification.types";
import type { Meander } from "../database/entities/Meander.entity";

/**
 * Covers `DrawIndexService.render` in isolation, against a small, hand-built
 * set of rows rather than a real database round trip — the pure half of
 * spec #813's Testing Decisions for this seam. `draw-index.service.integration.test.ts`
 * covers `build`, which adds nothing over `render` beyond the query itself.
 */
describe(DrawIndexService, () => {
  let service: DrawIndexService;

  /** Every field a fixture row does not care about, defaulted so a case only spells out what it means to test. */
  const meander = (
    overrides: Partial<Meander> & Pick<Meander, "code" | "id">,
  ): Meander => ({
    ...meanderRecord({ code: overrides.code, lattice: "3c9a" }),
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
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("render", () => {
    it("handles an empty corpus", () => {
      const pages = service.render([]);

      expect(pages["index.html"]).toContain("0 meanders across 0 families.");
    });

    it("embeds every meander's own SVG rather than linking to a file", () => {
      const pages = service.render([
        meander({ code: "a", family: "snake", id: 1 }),
      ]);
      const page = pages["families/snake.html"] ?? "";

      expect(page).toContain('<path d="M1 1"/>');
      expect(page).not.toContain("<img");
    });

    it("captions each figure with its lattice address", () => {
      const pages = service.render([
        meander({
          code: "abc",
          columns: 2,
          family: "snake",
          id: 1,
          rows: 3,
        }),
      ]);
      const page = pages["families/snake.html"] ?? "";

      expect(page).toContain("<figcaption>3×2 · abc</figcaption>");
    });

    it("appends every true boolean to the caption, in key-list order with isReducible last, and no number", () => {
      const pages = service.render([
        meander({
          characteristics: { crossCount: 3, isDots: true, isReducible: true },
          code: "abc",
          columns: 1,
          family: "boxes",
          id: 1,
          rows: 3,
        }),
      ]);
      const page = pages["families/boxes.html"] ?? "";

      expect(page).toContain(
        "<figcaption>3×1 · abc (isDots, isReducible)</figcaption>",
      );
    });

    it("lays the families out according to their declared sort key", () => {
      const pages = service.render([
        meander({ code: "a", family: "parallel", id: 1 }),
        meander({ code: "b", family: "boxes", id: 2 }),
        meander({ code: "c", family: "snake", id: 3 }),
      ]);

      const indexPage = pages["index.html"] ?? "";

      expect(indexPage.indexOf("boxes.html")).toBeLessThan(
        indexPage.indexOf("parallel.html"),
      );
      expect(indexPage.indexOf("parallel.html")).toBeLessThan(
        indexPage.indexOf("snake.html"),
      );
    });

    it("groups a null-family row into a dedicated unclassified section, sorted after every named family", () => {
      const pages = service.render([
        meander({ code: "a", family: "unclassified", id: 1 }),
        meander({ code: "b", family: "snake", id: 2 }),
      ]);

      expect(pages["families/unclassified.html"]).toContain(
        '<section id="unclassified">',
      );

      const indexPage = pages["index.html"] ?? "";

      expect(indexPage.indexOf("snake.html")).toBeLessThan(
        indexPage.indexOf("unclassified.html"),
      );
    });

    it("orders rows within a family by rows, then columns, then code", () => {
      const pages = service.render([
        meander({ code: "z", columns: 5, family: "snake", id: 1, rows: 3 }),
        meander({ code: "b", columns: 2, family: "snake", id: 2, rows: 4 }),
        meander({ code: "a", columns: 1, family: "snake", id: 3, rows: 4 }),
        meander({ code: "b", columns: 1, family: "snake", id: 4, rows: 4 }), // Same rows and columns, different code
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

    it("sorts multiple null families effectively", () => {
      const pages = service.render([
        meander({
          code: "a",
          columns: 2,
          family: "unclassified",
          id: 1,
          rows: 2,
        }),
        meander({
          code: "b",
          columns: 1,
          family: "unclassified",
          id: 2,
          rows: 3,
        }),
        meander({
          code: "c",
          columns: 1,
          family: "unclassified",
          id: 3,
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

    it("sorts null/null combinations", () => {
      const pages = service.render([
        meander({
          code: "a",
          columns: 2,
          family: "unclassified",
          id: 1,
          rows: 2,
        }),
        meander({
          code: "b",
          columns: 2,
          family: "unclassified",
          id: 2,
          rows: 2,
        }),
      ]);

      expect(pages["families/unclassified.html"]).toContain("2 meanders");
    });

    it("sorts unrecognized families alphabetically when missing from FAMILY_SORT_KEYS", () => {
      const pages = service.render([
        meander({ code: "a", family: "zeta" as MeanderFamily, id: 1 }),
        meander({ code: "b", family: "alpha" as MeanderFamily, id: 2 }),
        meander({ code: "c", family: "zeta" as MeanderFamily, id: 3 }),
        meander({ code: "d", family: "unclassified", id: 4 }),
      ]);

      const indexPage = pages["index.html"] ?? "";

      // Neither is in FAMILY_SORT_KEYS, so alpha comes before zeta
      // and null comes after everything. Also multiple of same unrecognized family rank correctly.
      expect(indexPage.indexOf("alpha.html")).toBeLessThan(
        indexPage.indexOf("zeta.html"),
      );
    });

    it("counts meanders in a section's own heading and in the page summary", () => {
      const pages = service.render([
        meander({ code: "a", family: "snake", id: 1 }),
        meander({ code: "b", family: "snake", id: 2 }),
        meander({ code: "c", family: "boxes", id: 3 }),
      ]);

      expect(pages["families/snake.html"]).toContain("2 meanders");
      expect(pages["families/boxes.html"]).toContain("1 meander<");
      expect(pages["index.html"]).toContain("3 meanders across 2 families.");
    });

    it("links each family section from a jump list", () => {
      const pages = service.render([
        meander({ code: "a", family: "snake", id: 1 }),
      ]);

      expect(pages["index.html"]).toContain(
        '<a href="families/snake.html">snake</a>',
      );
    });

    it("escapes a lattice address that would otherwise close a tag or an attribute", () => {
      const pages = service.render([
        meander({ code: '<script>&"', family: "snake", id: 1 }),
      ]);

      expect(pages["families/snake.html"]).toContain(
        "&lt;script&gt;&amp;&quot;",
      );
      expect(pages["families/snake.html"]).not.toContain("<script>");
    });

    it("defines each meander's own tile once and places it six times along a band", () => {
      const pages = service.render([
        meander({
          code: "a",
          columns: 3,
          family: "snake",
          id: 7,
          rows: 4,
        }),
      ]);
      const page = pages["families/snake.html"] ?? "";

      expect(page.split('<path d="M1 1"/>')).toHaveLength(2);
      expect(page).toContain('<defs><g id="meander-7">');
      expect(page.split('<use href="#meander-7"')).toHaveLength(7);
    });

    it("steps each repeat one tile width (its columns) further along the band, so the tiles meet rather than overlap or gap", () => {
      const pages = service.render([
        meander({
          code: "a",
          columns: 3,
          family: "snake",
          id: 1,
          rows: 3,
        }),
      ]);
      const page = pages["families/snake.html"] ?? "";

      expect(page).toContain('<use href="#meander-1" x="0"/>');
      expect(page).toContain('<use href="#meander-1" x="45"/>');
      expect(page).toContain('<use href="#meander-1" x="225"/>');
      expect(page).not.toContain('<use href="#meander-1" x="270"/>');
    });

    it("sizes the band to hold every repeat at the tile's own height", () => {
      const pages = service.render([
        meander({
          code: "a",
          columns: 3,
          family: "snake",
          id: 1,
          rows: 3,
        }),
      ]);
      const page = pages["families/snake.html"] ?? "";

      expect(page).toContain(
        '<svg width="277.5" height="67.5" viewBox="0 0 277.5 67.5" fill="none"',
      );
    });
  });
});
