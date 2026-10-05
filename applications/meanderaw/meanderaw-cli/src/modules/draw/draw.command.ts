import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { Inject, Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import { LoggerService } from "@codebase/logger";

import { CODE_FORMAT_PATTERN } from "../code/code.constants";
import { CorpusService } from "../corpus/corpus.service";
import { HISTORICAL_CORPUS } from "../corpus/historical-corpus.constants";
import { DatabaseService } from "../database/database.service";

import { DrawCodeService } from "./draw-code.service";
import { DrawEnumerationService } from "./draw-enumeration.service";
import { DrawIndexService } from "./draw-index.service";
import { IncompleteCodeDrawingError } from "./draw.constants";

import type { DrawCommandOptions } from "./draw.types";

/**
 * Draws meanders into the Postgres database `MEANDERAW_POSTGRES_DB` names.
 * It is the application's only command, and its default, so running it
 * with no arguments at all runs this.
 *
 * Both of its modes write the meander database, and which one runs is
 * decided by whether a Code was named:
 *
 * - **`draw`** draws everything, in two halves that between them are the
 *   whole corpus. {@link DrawEnumerationService} walks the lattice's unit
 *   space — every shape the edge budget admits, every structurally distinct
 *   repeat within each — and writes a row per meander found, its family read
 *   off its own structure rather than off whichever generator drew it. Then
 *   {@link CorpusService} ingests the historical corpus's
 *   hardcoded Code constants, which are exactly the meanders that lie
 *   *beyond* that budget — see `corpus.constants.ts` for how that
 *   boundary is drawn and why it has to be.
 * - **`draw --rows <n> --columns <n> --code <code>`** decodes,
 *   measures, and persists that one meander, through the same generic
 *   pipeline both halves of the draw run use.
 *
 * Nothing checks a draw run against a committed copy: at the default edge
 * budget the database holds millions of rows, and it lives in Postgres
 * rather than in the repository.
 *
 * **The per-family SVG tree is gone for good.** The nine per-family
 * procedural motif services, the `output/<family>/*.svg` tree they wrote,
 * and the `--type`/`--modifier` flags that named one are all retired: a
 * meander is a database row, and a row has no path-length limit for a Code
 * to outgrow. One file write survives the retirement: `output/index.html`
 * and a page per family, rebuilt at the end of every draw run from the
 * database's own rows — see {@link DrawIndexService}. They are gitignored
 * rather than committed: at the default edge budget they are gigabytes of
 * HTML, written a batch of rows at a time.
 *
 * The hardcoded half runs first, so a hardcoded meander keeps its row: the
 * draw run skips any Code a hardcoded row already holds rather than writing an
 * enumerated duplicate beside it.
 */
@Command({
  description:
    "Draw meanders into the Postgres database MEANDERAW_POSTGRES_DB names: with no flag, draw every meander the application can draw into it (the whole lattice's unit space, enumerated and classified into a family by each meander's own structure, plus the historical corpus's hardcoded constants beyond the enumeration's budget); with --rows, --columns, and --code, draw that one",
  name: "draw",
  options: { isDefault: true },
})
@Injectable()
export class DrawCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly logger: LoggerService,
    @Inject(DrawCodeService)
    private readonly drawCodeService: DrawCodeService,
    @Inject(DrawEnumerationService)
    private readonly drawEnumerationService: DrawEnumerationService,
    @Inject(DrawIndexService)
    private readonly drawIndexService: DrawIndexService,
    @Inject(CorpusService)
    private readonly corpusService: CorpusService,
    @Inject(DatabaseService)
    private readonly databaseService: DatabaseService,
  ) {
    super();
    this.logger.setContext(DrawCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Draws every meander the application can draw, as rows in the local
   * database.
   *
   * Two halves, one corpus and one unique index over a meander's
   * lattice address. The hardcoded half is written first and the enumerated
   * half second, so the two are ordered rather than racing: an enumerated
   * meander whose Code a hardcoded row already holds is skipped, so the
   * hardcoded row keeps it and its hand-filed family. Only enumerated
   * meanders are folded by symmetry — a hardcoded mirror or flip of one is
   * a row of its own.
   *
   * The existing rows are cleared first, so a draw run regenerates the
   * database in place: every row is insert-only, and drawing over the rows
   * a previous draw run left would collide with each one.
   */
  private async drawAll(): Promise<void> {
    await this.databaseService.clear();

    // `ingest` hands back one row per corpus entry, and entries that share a
    // Code share a row, so the rows are counted by id rather than by entry.
    const ingested = await this.corpusService.ingest(HISTORICAL_CORPUS);
    const hardcoded = new Set(ingested.map(({ id }) => id)).size;

    this.logger.log("✨ Ingested the historical corpus", undefined, {
      hardcoded,
    });

    const enumerated = await this.drawEnumerationService.drawAll();

    this.logger.log("✨ Generated every meander", undefined, {
      enumerated,
      hardcoded,
      total: enumerated + hardcoded,
    });

    await this.writePages();
  }

  /**
   * Decodes, measures, and persists the one meander `--rows`, `--columns`,
   * and `--code` name, refusing the request when `--rows` or `--columns` is
   * missing.
   *
   * Takes the three already-narrowed values rather than the whole options
   * object, so the `rows` and `columns` presence check below is what
   * TypeScript itself trusts, rather than a check the compiler cannot see
   * through a wider type.
   */
  private async runCodeDrawing(
    code: string,
    rows: number | undefined,
    columns: number | undefined,
  ): Promise<void> {
    if (
      !CODE_FORMAT_PATTERN.test(code) &&
      (rows === undefined || columns === undefined)
    ) {
      throw new IncompleteCodeDrawingError();
    }

    const meander = await this.drawCodeService.draw({ code, columns, rows });

    this.logger.log("✨ Generated a meander by code", undefined, {
      id: meander.id,
    });
  }

  /**
   * Writes `output/index.html` and every family's page from the rows both
   * halves committed, each streamed to disk a batch of rows at a time.
   *
   * Last, once both halves have committed — a page built from a partial
   * draw run would tell a reader the corpus stopped short of where it did.
   */
  private async writePages(): Promise<void> {
    const pages = await this.drawIndexService.build();

    for (const [relativePath, content] of Object.entries(pages)) {
      const fullPath = path.join("output", relativePath);

      await mkdir(path.dirname(fullPath), { recursive: true });
      await writeFile(fullPath, content);
    }

    this.logger.log("✨ Rebuilt the index pages");
  }

  // 🌎 Public Methods

  /**
   * Parses `--code`, passed through unchanged: the hexadecimal digits a
   * a meander's own points are read from, one character per interior
   * lattice point. `CodeService.parse` is what refuses a
   * non-hexadecimal character or a length `--rows`/`--columns` disagree
   * with, so nothing is validated here.
   */
  @Option({
    description:
      "Hexadecimal Code a meander's per-point direction bits are decoded from, one character per interior lattice point — draws that one meander and writes it to the database",
    flags: "--code <code>",
  })
  parseCode(value: string): string {
    return value;
  }

  /** Parses `--columns` as an integer, used only with `--code`. */
  @Option({
    description: "Column count of one --code drawing",
    flags: "--columns <columns>",
  })
  parseColumns(value: string): number {
    return Number.parseInt(value, 10);
  }

  /** Parses `--rows` as an integer, used only with `--code`. Optional, since a draw run names no row count. */
  @Option({
    description: "Row count of one --code drawing, controlling grid density",
    flags: "-r, --rows <rows>",
  })
  parseRows(value: string): number {
    return Number.parseInt(value, 10);
  }

  /** Draws every meander into the database when no Code is named, or draws the one `--code` names. */
  async run(
    _passedParameters: string[],
    options: DrawCommandOptions,
  ): Promise<void> {
    if (options.code === undefined) {
      await this.drawAll();

      return;
    }

    await this.runCodeDrawing(options.code, options.rows, options.columns);
  }
}
