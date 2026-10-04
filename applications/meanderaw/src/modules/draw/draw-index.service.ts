// `nav` is the HTML sectioning element the jump list is wrapped in, not an
// abbreviation of "navigation" this file chose to write.
// cspell:ignore nav

import { Inject, Injectable } from "@nestjs/common";

import { STORED_BOOLEAN_KEYS } from "../characteristics/characteristics.constants";
import { CodeService } from "../code/code.service";
import { DatabaseService } from "../database/database.service";
import { DrawingService } from "../drawing/drawing.service";
import { GeometryService } from "../geometry/geometry.service";

import {
  BAND_REPEAT_COUNT,
  FAMILY_SORT_KEYS,
  PAGE_STYLES,
  UNCLASSIFIED_FAMILY_LABEL,
} from "./draw-index.constants";

import type { Meander } from "../database/entities/Meander.entity";
import type { MeanderIndexGroup } from "./draw-index.types";

/**
 * Renders the one page the whole committed corpus is looked through: every
 * meander the database holds, grouped by family and captioned.
 *
 * It embeds each meander's own SVG directly rather than linking to a file —
 * there is no file left to link to, since a meander is a database row now
 * rather than a path on disk. Embedding it is spec #813's own design rather
 * than a regression from the retired `DrawIndexService`, which linked
 * precisely because every drawing it indexed was a separate committed file
 * this one no longer has.
 *
 * Each row's SVG is one repeat of the meander, and one repeat read alone says
 * very little about the pattern it repeats into, so the page lays that tile
 * out `BAND_REPEAT_COUNT` times along a band rather than showing it once.
 * The stored tile is embedded verbatim in each position — the page states
 * where the repeats sit, and `DrawingService` stays the only thing
 * that decides what one of them draws.
 *
 * The page is written at the root of the output directory, beside the
 * database it was built from — see `DrawCommand.sweep`, the only caller.
 */
@Injectable()
export class DrawIndexService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(CodeService)
    private readonly codeService: CodeService,
    @Inject(DatabaseService)
    private readonly databaseService: DatabaseService,
    @Inject(DrawingService)
    private readonly drawingService: DrawingService,
    @Inject(GeometryService)
    private readonly geometryService: GeometryService,
  ) {}

  // 🔐 Private Fields

  /** Orders rows within a family the way a reader reads them: shallower repeats before deeper ones, narrower before wider, and numeric-aware within `code` itself. */

  /**
   * Where each family sits on the page, read off the order `SUPPORTED_TYPES`
   * declares them in. A null family — the unclassified section — ranks one
   * past the last of them, so it sorts after every named family rather than
   * by the alphabetical accident of its own label.
   */
  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Throws unless `svg` looks like a complete, well-formed inline SVG document. */
  /** One meander's own caption: its lattice address, and its subFamily where it earned one. */
  private caption(meander: Meander): string {
    const { characteristics, code, columns, rows } = meander;
    const address = `${rows}×${columns} · ${code}`;
    const holding = STORED_BOOLEAN_KEYS.filter(
      (key) => characteristics[key] === true,
    );

    return this.escape(
      holding.length === 0 ? address : `${address} (${holding.join(", ")})`,
    );
  }

  /** Escapes the few characters that would otherwise close a tag or an attribute. */
  private escape(value: string): string {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  /** Ranks a family by its declared order, so `null` — the unclassified section — sorts after every named one. */

  /** Rounds and trims one band coordinate the same way every drawn coordinate is. */
  private format(value: number): string {
    return this.geometryService.formatCoordinate(value);
  }

  /** Collects the rows into their family groups, the groups in family order and the rows within each in reading order. */
  private groupByFamily(meanders: readonly Meander[]): MeanderIndexGroup[] {
    const groups = new Map<null | string, Meander[]>();
    for (const meander of meanders) {
      const family = meander.family === "unclassified" ? null : meander.family;
      const members = groups.get(family) ?? [];
      members.push(meander);
      groups.set(family, members);
    }
    return [...groups.entries()]
      .toSorted(([a], [b]) => {
        if (a === null && b === null) return 0;
        if (a === null) return 1;
        if (b === null) return -1;
        const rankA = FAMILY_SORT_KEYS[a] ?? Number.MAX_SAFE_INTEGER;
        const rankB = FAMILY_SORT_KEYS[b] ?? Number.MAX_SAFE_INTEGER;
        if (rankA !== rankB) return rankA - rankB;
        return a.localeCompare(b);
      })
      .map(([family, group]) => ({
        family,
        meanders: group.toSorted(
          (left, right) =>
            left.rows - right.rows ||
            left.columns - right.columns ||
            left.code.localeCompare(right.code),
        ),
      }));
  }

  /** The heading and slug a family group is shown and linked under. */
  private label(family: null | string): string {
    return family ?? UNCLASSIFIED_FAMILY_LABEL;
  }

  /**
   * Lays one row's tile out along a band of `BAND_REPEAT_COUNT` repeats.
   *
   * The tile is defined once and placed `BAND_REPEAT_COUNT` times rather than
   * copied: the page carries every row in the corpus, so six copies of every
   * row's markup would multiply an already large document by six for a
   * drawing each copy is identical in.
   *
   * Each placement steps one tile width (`columns`) further along, which is
   * the distance that makes consecutive tiles meet: a tile's own drawing runs
   * from `offset` to `offset + columns * unit`, so a step of `columns * unit` lands the next
   * tile's first lattice column exactly on the last one's right edge. The
   * half-stroke gutters either side of that edge overlap, and both tiles ink
   * the same square cap there, so the seam paints over itself.
   */
  private renderBand(meander: Meander): string {
    const geometry = this.geometryService.compute(meander.rows);
    const step = meander.columns * geometry.unit;
    const height = this.format(geometry.height + geometry.strokeWidth);
    const width = this.format(
      (BAND_REPEAT_COUNT - 1) * step +
        meander.columns * geometry.unit +
        geometry.strokeWidth,
    );
    const tile = `meander-${meander.id}`;
    const parsed = this.codeService.parse(
      meander.code,
      meander.rows,
      meander.columns,
    );
    const svg = this.drawingService.render(parsed).trim();
    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><g id="${tile}">${svg}</g></defs>${this.renderRepeats(tile, step)}</svg>`;
  }

  /** Renders the jump list, so a family thousands of rows down the page is one click away. */
  private renderContents(groups: readonly MeanderIndexGroup[]): string {
    return groups
      .map(({ family, meanders }) => {
        const label = this.escape(this.label(family));

        return `<li><a href="families/${label}.html">${label}</a> <span>${meanders.length}</span></li>`;
      })
      .join("\n");
  }

  /** Renders one meander's own figure: the band its tile repeats into, and its caption. */
  private renderFigure(meander: Meander): string {
    return `<figure><div class="art">${this.renderBand(meander)}</div><figcaption>${this.caption(meander)}</figcaption></figure>`;
  }

  /** The placements themselves: the one defined tile, referenced once per repeat, each a further step along. */
  private renderRepeats(tile: string, step: number): string {
    return Array.from(
      { length: BAND_REPEAT_COUNT },
      (_repeat, index) =>
        `<use href="#${tile}" x="${this.format(index * step)}"/>`,
    ).join("");
  }

  /** Renders one family's own section: its heading, and every meander in it at its own size. */
  private renderSection({ family, meanders }: MeanderIndexGroup): string {
    const label = this.escape(this.label(family));

    if (family === null) {
      return this.renderUnclassifiedSection(meanders);
    }

    const figures = meanders
      .map((meander) => this.renderFigure(meander))
      .join("\n");

    return `<section id="${label}">
<h2>${label}</h2>
<p class="count">${meanders.length} meander${meanders.length === 1 ? "" : "s"}</p>
<div class="grid">
${figures}
</div>
</section>`;
  }

  /** Renders the unclassified section, grouped by shape and ordered by motif pattern. */
  private renderUnclassifiedSection(meanders: readonly Meander[]): string {
    const byShape = new Map<string, Meander[]>();
    for (const meander of meanders) {
      const shape = `${meander.rows}×${meander.columns}`;
      const list = byShape.get(shape) ?? [];
      list.push(meander);
      byShape.set(shape, list);
    }

    const sortedShapes = [...byShape.entries()].toSorted((a, b) => {
      const partsA = a[0].split("×");
      const rA = Number(partsA[0]);
      const cA = Number(partsA[1]);

      const partsB = b[0].split("×");
      const rB = Number(partsB[0]);
      const cB = Number(partsB[1]);

      if (rA !== rB) return rA - rB;
      return cA - cB;
    });

    const sections = sortedShapes
      .map(([shape, group]) => {
        const sorted = group.toSorted((a, b) => a.code.localeCompare(b.code));
        const figures = sorted
          .map((meander) => this.renderFigure(meander))
          .join("\n");

        return `<section id="shape-${shape}">
<h2>${shape}</h2>
<p class="count">${sorted.length} meander${sorted.length === 1 ? "" : "s"}</p>
<div class="grid">
${figures}
</div>
</section>`;
      })
      .join("\n");

    return `<section id="unclassified">
<h2>unclassified</h2>
<p class="count">${meanders.length} meander${meanders.length === 1 ? "" : "s"}</p>
${sections}
</section>`;
  }

  // 🌎 Public Methods

  /** Reads every committed meander and renders the pages they make, together. */
  async build(): Promise<Record<string, string>> {
    return this.render(await this.databaseService.findAll());
  }

  /**
   * Builds the index page and family pages as HTML documents from an already-loaded
   * set of rows.
   */
  render(meanders: readonly Meander[]): Record<string, string> {
    const groups = this.groupByFamily(meanders);
    const pages: Record<string, string> = {
      "index.html": `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Meanderaw Index</title>
<style>${PAGE_STYLES}</style>
</head>
<body>
<h1>Meanderaw</h1>
<p class="count">${meanders.length} meanders across ${groups.length} families.</p>
<nav><ul>
${this.renderContents(groups)}
</ul></nav>
</body>
</html>
`,
    };

    for (const group of groups) {
      const label = this.label(group.family);
      const filename = `families/${label}.html`;

      pages[filename] = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Meanderaw - ${this.escape(label)}</title>
<style>${PAGE_STYLES}</style>
</head>
<body>
<h1><a href="../index.html">Meanderaw</a> / ${this.escape(label)}</h1>
${this.renderSection(group)}
</body>
</html>
`;
    }

    return pages;
  }
}
