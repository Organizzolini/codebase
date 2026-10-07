// `nav` is the HTML sectioning element the jump list is wrapped in, not an
// abbreviation of "navigation" this file chose to write.
// cspell:ignore nav

import { Inject, Injectable } from "@nestjs/common";

import {
  PATTERN_CHARACTERISTIC_KEYS,
  STORED_BOOLEAN_KEYS,
} from "../characteristics/characteristics.constants";
import { CodeService } from "../code/code.service";
import { DatabaseService } from "../database/database.service";
import { DrawingService } from "../drawing/drawing.service";
import { GeometryService } from "../geometry/geometry.service";

import { BAND_REPEAT_COUNT, PAGE_STYLES } from "./draw-index.constants";

import type { PatternCharacteristicKey } from "../characteristics/characteristics.types";
import type { MeanderPatternShapeCount } from "../database/database.types";
import type { Meander } from "../database/entities/Meander.entity";
import type {
  MeanderPageContent,
  MeanderPageSource,
  MeanderRowBatches,
} from "./draw-index.types";

/**
 * Renders the pages the corpus is looked through: one per pattern
 * characteristic, listing every meander that pattern holds for, shape by
 * shape and captioned, and an index linking them. A meander appears on
 * every page whose pattern holds for it, and on none when none does.
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
 * string: at the default edge budget a pattern can hold over a million
 * meanders, and its page outgrows the longest string JavaScript can hold.
 * Counts come first, from one grouped query, so every heading is written
 * before any row is read. The pages are written under the gitignored
 * output directory — see `DrawCommand.drawAll`, the only caller.
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

  /** One meander's own caption: its lattice address, and every boolean Characteristic that holds for it. */
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

  /** A pattern's rows already in memory, in the order its page lists them. */
  private heldRows(
    meanders: readonly Meander[],
    key: PatternCharacteristicKey,
  ): (readonly Meander[])[] {
    const rows = meanders
      .filter((meander) => meander.characteristics[key] === true)
      .toSorted(
        (left, right) =>
          left.rows - right.rows ||
          left.columns - right.columns ||
          left.code.localeCompare(right.code),
      );

    return [rows];
  }

  /** The index page: every pattern that holds for some meander, linked, with how many it holds for. */
  private indexPage(
    patterns: readonly { key: string; total: number }[],
  ): string {
    const contents = patterns
      .map(
        ({ key, total }) =>
          `<li><a href="patterns/${key}.html">${key}</a> <span>${total}</span></li>`,
      )
      .join("\n");

    return `${this.documentHead("Meanderaw Index", "Meanderaw")}<p class="count">${patterns.length} patterns. A meander is listed under every pattern that holds for it.</p>
<nav><ul>
${contents}
</ul></nav>
</body>
</html>
`;
  }

  /** Every page `source`'s rows make, each produced lazily as it is read. */
  private pages(source: MeanderPageSource): Record<string, MeanderPageContent> {
    const byKey = this.group(source.counts, ({ key }) => key);
    const patterns = PATTERN_CHARACTERISTIC_KEYS.flatMap((key) => {
      const counts = byKey.get(key);

      return counts === undefined ? [] : [{ counts, key }];
    });
    const pages: Record<string, MeanderPageContent> = {
      "index.html": [
        this.indexPage(
          patterns.map(({ counts, key }) => ({
            key,
            total: counts.reduce((sum, { count }) => sum + count, 0),
          })),
        ),
      ],
    };

    for (const { counts, key } of patterns) {
      pages[`patterns/${key}.html`] = this.patternPage(
        key,
        counts,
        source.rows(key),
      );
    }

    return pages;
  }

  /** One pattern's page: every meander it holds for, one grid per shape, a batch of rows at a time. */
  private async *patternPage(
    key: PatternCharacteristicKey,
    counts: readonly MeanderPatternShapeCount[],
    rows: MeanderRowBatches,
  ): AsyncGenerator<string> {
    yield this.documentHead(
      `Meanderaw - ${key}`,
      `<a href="../index.html">Meanderaw</a> / ${key}`,
    );
    yield* this.shapeSections(key, counts, rows);
    yield "\n</body>\n</html>\n";
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

  /** One shape's grid within a pattern's section, opened as its first row arrives. */
  private shapeHead(
    previous: string | undefined,
    shape: string,
    counts: ReadonlyMap<string, number>,
  ): string {
    const close = previous === undefined ? "" : "\n</div>\n</section>\n";

    return `${close}${this.sectionHead(`shape-${shape}`, shape, counts.get(shape) ?? 0)}<div class="grid">\n`;
  }

  /**
   * A pattern's one section: one grid per shape, each with its own count.
   * Rows arrive ordered by shape, so each shape's grid opens as its first
   * row arrives and closes as the next shape's does.
   */
  private async *shapeSections(
    key: PatternCharacteristicKey,
    counts: readonly MeanderPatternShapeCount[],
    rows: MeanderRowBatches,
  ): AsyncGenerator<string> {
    const total = counts.reduce((sum, { count }) => sum + count, 0);
    const shapeCounts = new Map(
      counts.map(({ columns, count, rows: band }) => [
        `${band}×${columns}`,
        count,
      ]),
    );
    let shape: string | undefined;

    yield this.sectionHead(key, key, total);

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
   * page — however many rows its pattern holds for — is ever one string.
   */
  async build(): Promise<Record<string, MeanderPageContent>> {
    const counts = await this.databaseService.patternShapeCounts(
      PATTERN_CHARACTERISTIC_KEYS,
    );

    return this.pages({
      counts,
      rows: (key) => this.databaseService.patternRows(key),
    });
  }

  /**
   * The same pages from rows already in memory, each read into one string —
   * the seam a test renders a handful of meanders through.
   */
  async render(meanders: readonly Meander[]): Promise<Record<string, string>> {
    const counts = new Map<string, MeanderPatternShapeCount>();

    for (const { characteristics, columns, rows } of meanders) {
      for (const key of PATTERN_CHARACTERISTIC_KEYS) {
        if (characteristics[key] === true) {
          const shape = `${key}|${rows}|${columns}`;

          counts.set(shape, {
            columns,
            count: (counts.get(shape)?.count ?? 0) + 1,
            key,
            rows,
          });
        }
      }
    }

    const pages = this.pages({
      counts: [...counts.values()],
      rows: (key) => this.heldRows(meanders, key),
    });
    const rendered: Record<string, string> = {};

    for (const [path, content] of Object.entries(pages)) {
      rendered[path] = await this.collect(content);
    }

    return rendered;
  }
}
