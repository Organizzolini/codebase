import { Inject, Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import { LoggerService } from "@codebase/logger";

import { CODE_FORMAT_PATTERN } from "../code/code.constants";
import { CorpusService } from "../corpus/corpus.service";
import { HISTORICAL_CORPUS } from "../corpus/historical-corpus.constants";
import { DatabaseService } from "../database/database.service";

import { DrawCodeService } from "./draw-code.service";
import { DrawEnumerationService } from "./draw-enumeration.service";
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
 * - **`draw`** sweeps everything, in two halves that between them are the
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
 *   pipeline both halves of the sweep use.
 *
 * Nothing checks a sweep against a committed copy: at the default edge
 * budget the database holds millions of rows, and it lives in Postgres
 * rather than in the repository.
 *
 * **The per-family SVG tree is gone for good.** The nine per-family
 * procedural motif services, the `output/<family>/*.svg` tree they wrote,
 * and the `--type`/`--modifier` flags that named one are all retired: a
 * meander is a database row, and a row has no path-length limit for a Code
 * to outgrow. The HTML pages that once listed every row are retired too:
 * at the edge budget's millions of rows a family page outgrew what a string
 * — or a browser — can hold, so the database is the sweep's only output.
 *
 * The hardcoded half runs first, so a hardcoded meander keeps its row: the
 * sweep skips any Code a hardcoded row already holds rather than writing an
 * enumerated duplicate beside it.
 */
@Command({
  description:
    "Draw meanders into the Postgres database MEANDERAW_POSTGRES_DB names: with no flag, sweep every meander the application can draw into it (the whole lattice's unit space, enumerated and classified into a family by each meander's own structure, plus the historical corpus's hardcoded constants beyond the enumeration's budget); with --rows, --columns, and --code, draw that one",
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
   * The existing rows are cleared first, so a sweep regenerates the
   * database in place: every row is insert-only, and sweeping over the rows
   * a previous sweep left would collide with each one.
   */
  private async sweep(): Promise<void> {
    await this.databaseService.clear();

    const hardcoded = await this.corpusService.ingest(HISTORICAL_CORPUS);

    this.logger.log("✨ Ingested the historical corpus", undefined, {
      hardcoded: hardcoded.length,
    });

    const enumerated = await this.drawEnumerationService.sweep();

    this.logger.log("✨ Generated every meander", undefined, {
      enumerated,
      hardcoded: hardcoded.length,
      total: enumerated + hardcoded.length,
    });
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

  /** Parses `--rows` as an integer, used only with `--code`. Optional, since a sweep names no row count. */
  @Option({
    description: "Row count of one --code drawing, controlling grid density",
    flags: "-r, --rows <rows>",
  })
  parseRows(value: string): number {
    return Number.parseInt(value, 10);
  }

  /** Sweeps every meander into the database when no Code is named, or draws the one `--code` names. */
  async run(
    _passedParameters: string[],
    options: DrawCommandOptions,
  ): Promise<void> {
    if (options.code === undefined) {
      await this.sweep();

      return;
    }

    await this.runCodeDrawing(options.code, options.rows, options.columns);
  }
}
