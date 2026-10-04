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

import type { MeanderFamily } from "../classification/classification.types";
import type { MeanderFamilyShapeCount } from "../database/database.types";
import type { Meander } from "../database/entities/Meander.entity";
import type {
  MeanderPageContent,
  MeanderPageSource,
  MeanderRowBatches,
} from "./draw-index.types";

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
 * Every page is produced a batch of rows at a time rather than as one
 * string: at the default edge budget a family holds over a million
 * meanders, and its page outgrows the longest string JavaScript can hold.
 * Counts come first, from one grouped query, so every heading is written
 * before any row is read. The pages are written under the gitignored
 * output directory — see `DrawCommand.sweep`, the only caller.
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

  // 🔑 Public Fields

  // 🔏 Private Methods

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

  /** Reads one page's pieces into the one string a test asserts on. */
  private async collect(content: MeanderPageContent): Promise<string> {
    let page = "";

    for await (const piece of content) {
      page += piece;
    }

    return page;
  }

  /**
   * Orders families the way the index lists them: by their declared sort
   * key, then alphabetically, with `unclassified` last.
   */
  private compareFamilies(left: string, right: string): number {
    return (
      this.familyRank(left) - this.familyRank(right) ||
      left.localeCompare(right)
    );
  }

  /** The opening every page shares, through its own heading. */
  private documentHead(title: string, heading: string): string {
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>${PAGE_STYLES}</style>
</head>
<body>
<h1>${heading}</h1>
`;
  }

  /** Escapes the few characters that would otherwise close a tag or an attribute. */
  private escape(value: string): string {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  /** One family's page, a batch of rows at a time. */
  private async *familyPage(
    family: MeanderFamily,
    counts: readonly MeanderFamilyShapeCount[],
    rows: MeanderRowBatches,
  ): AsyncGenerator<string> {
    const label = this.escape(this.label(family));
    const total = counts.reduce((sum, { count }) => sum + count, 0);

    yield this.documentHead(
      `Meanderaw - ${label}`,
      `<a href="../index.html">Meanderaw</a> / ${label}`,
    );
    yield* family === "unclassified"
      ? this.unclassifiedSection(counts, total, rows)
      : this.namedSection(label, total, rows);
    yield "\n</body>\n</html>\n";
  }

  /** Where a family sits in the index: its declared sort key, unknown families after every known one, and `unclassified` last. */
  private familyRank(family: string): number {
    return family === "unclassified"
      ? Number.POSITIVE_INFINITY
      : (FAMILY_SORT_KEYS[family] ?? Number.MAX_SAFE_INTEGER);
  }

  /** Rounds and trims one band coordinate the same way every drawn coordinate is. */
  private format(value: number): string {
    return this.geometryService.formatCoordinate(value);
  }

  /** Groups items under the key each one names, in the order keys first appear. */
  private group<Item, Key>(
    items: readonly Item[],
    key: (item: Item) => Key,
  ): Map<Key, Item[]> {
    const groups = new Map<Key, Item[]>();

    for (const item of items) {
      const members = groups.get(key(item)) ?? [];

      members.push(item);
      groups.set(key(item), members);
    }

    return groups;
  }

  /** A family's rows already in memory, in the order its page lists them. */
  private heldRows(
    meanders: readonly Meander[],
    family: MeanderFamily,
  ): (readonly Meander[])[] {
    const rows = meanders
      .filter((meander) => meander.family === family)
      .toSorted(
        (left, right) =>
          left.rows - right.rows ||
          left.columns - right.columns ||
          left.code.localeCompare(right.code),
      );

    return [rows];
  }

  /** The index page: every family, linked, with how many meanders it holds. */
  private indexPage(
    families: readonly { label: string; total: number }[],
  ): string {
    const total = families.reduce((sum, family) => sum + family.total, 0);
    const contents = families
      .map(
        ({ label, total: count }) =>
          `<li><a href="families/${label}.html">${label}</a> <span>${count}</span></li>`,
      )
      .join("\n");

    return `${this.documentHead("Meanderaw Index", "Meanderaw")}<p class="count">${total} meanders across ${families.length} families.</p>
<nav><ul>
${contents}
</ul></nav>
</body>
</html>
`;
  }

  /** The heading and slug a family group is shown and linked under. */
  private label(family: string): string {
    return family === "unclassified" ? UNCLASSIFIED_FAMILY_LABEL : family;
  }

  /** A named family's one section: its count, then every figure in one grid. */
  private async *namedSection(
    label: string,
    total: number,
    rows: MeanderRowBatches,
  ): AsyncGenerator<string> {
    let separator = "";

    yield `${this.sectionHead(label, label, total)}<div class="grid">\n`;

    for await (const batch of rows) {
      yield (
        separator +
          batch.map((meander) => this.renderFigure(meander)).join("\n")
      );
      separator = "\n";
    }

    yield "\n</div>\n</section>";
  }

  /** Every page `source`'s rows make, each produced lazily as it is read. */
  private pages(source: MeanderPageSource): Record<string, MeanderPageContent> {
    const byFamily = this.group(source.counts, ({ family }) => family);
    const families = [...byFamily.keys()]
      .toSorted((left, right) => this.compareFamilies(left, right))
      .map((family) => ({
        counts: byFamily.get(family) ?? [],
        family,
        label: this.label(family),
      }));
    const summaries = families.map(({ counts, label }) => ({
      label: this.escape(label),
      total: counts.reduce((sum, { count }) => sum + count, 0),
    }));
    const pages: Record<string, MeanderPageContent> = {
      "index.html": [this.indexPage(summaries)],
    };

    for (const { counts, family, label } of families) {
      pages[`families/${label}.html`] = this.familyPage(
        family,
        counts,
        source.rows(family),
      );
    }

    return pages;
  }

  /**
   * Lays one row's tile out along a band of `BAND_REPEAT_COUNT` repeats.
   *
   * The tile is defined once and placed `BAND_REPEAT_COUNT` times rather than
   * copied: the page carries every row in the corpus, so six copies of every
   * row's markup would multiply an already large document by six for a
   * drawing each copy is identical in. It is defined under its Code rather
   * than its row's `id`: the Code is as unique, and unlike a uuidv7 it is
   * the same on every regeneration, so the committed pages only change when
   * a drawing does.
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
    const tile = this.escape(`meander-${meander.code}`);
    const parsed = this.codeService.parse(
      meander.code,
      meander.rows,
      meander.columns,
    );
    const svg = this.drawingService.render(parsed).trim();
    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><g id="${tile}">${svg}</g></defs>${this.renderRepeats(tile, step)}</svg>`;
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

  /** A section's heading and count, up to the content it counts. */
  private sectionHead(id: string, heading: string, count: number): string {
    return `<section id="${id}">
<h2>${heading}</h2>
<p class="count">${count} meander${count === 1 ? "" : "s"}</p>
`;
  }

  /** One shape's grid within the unclassified section, opened as its first row arrives. */
  private shapeHead(
    previous: string | undefined,
    shape: string,
    counts: ReadonlyMap<string, number>,
  ): string {
    const close = previous === undefined ? "" : "\n</div>\n</section>\n";

    return `${close}${this.sectionHead(`shape-${shape}`, shape, counts.get(shape) ?? 0)}<div class="grid">\n`;
  }

  /**
   * The unclassified section: one grid per shape, each with its own count,
   * since a family of no shared structure reads best a shape at a time.
   * Rows arrive ordered by shape, so each shape's grid opens as its first
   * row arrives and closes as the next shape's does.
   */
  private async *unclassifiedSection(
    counts: readonly MeanderFamilyShapeCount[],
    total: number,
    rows: MeanderRowBatches,
  ): AsyncGenerator<string> {
    const shapeCounts = new Map(
      counts.map(({ columns, count, rows: band }) => [
        `${band}×${columns}`,
        count,
      ]),
    );
    let shape: string | undefined;

    yield this.sectionHead("unclassified", "unclassified", total);

    for await (const batch of rows) {
      const pieces: string[] = [];

      for (const meander of batch) {
        const next = `${meander.rows}×${meander.columns}`;

        pieces.push(
          next === shape
            ? `\n${this.renderFigure(meander)}`
            : this.shapeHead(shape, next, shapeCounts) +
                this.renderFigure(meander),
        );
        shape = next;
      }

      yield pieces.join("");
    }

    yield shape === undefined
      ? "</section>"
      : "\n</div>\n</section>\n</section>";
  }

  // 🌎 Public Methods

  /**
   * Every page the database's rows make, keyed by its path under the output
   * directory. Each page is an async iterable of HTML pieces, read from the
   * database a batch of rows at a time only as the page is written, so no
   * page — however many rows its family holds — is ever one string.
   */
  async build(): Promise<Record<string, MeanderPageContent>> {
    const counts = await this.databaseService.familyShapeCounts();

    return this.pages({
      counts,
      rows: (family) => this.databaseService.familyRows(family),
    });
  }

  /**
   * The same pages from rows already in memory, each read into one string —
   * the seam a test renders a handful of meanders through.
   */
  async render(meanders: readonly Meander[]): Promise<Record<string, string>> {
    const counts = new Map<string, MeanderFamilyShapeCount>();

    for (const { columns, family, rows } of meanders) {
      const key = `${family}|${rows}|${columns}`;

      counts.set(key, {
        columns,
        count: (counts.get(key)?.count ?? 0) + 1,
        family,
        rows,
      });
    }

    const pages = this.pages({
      counts: [...counts.values()],
      rows: (family) => this.heldRows(meanders, family),
    });
    const rendered: Record<string, string> = {};

    for (const [path, content] of Object.entries(pages)) {
      rendered[path] = await this.collect(content);
    }

    return rendered;
  }
}
