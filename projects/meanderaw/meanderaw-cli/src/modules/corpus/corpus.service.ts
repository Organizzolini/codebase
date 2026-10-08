import { Inject, Injectable } from "@nestjs/common";

import { CharacteristicsService } from "../characteristics/characteristics.service";
import { CodeService } from "../code/code.service";
import { DRAW_MINIMUM_ROWS } from "../enumeration/enumeration.constants";
import { TileEnumerationService } from "../enumeration/tile-enumeration.service";
import { MeanderawDatabaseService } from "../meanderaw-database/meanderaw-database.service";

import {
  DuplicateCorpusCodeError,
  HISTORICAL_CORPUS_EDGE_BUDGET,
} from "./corpus.constants";

import type { Meander } from "../meanderaw-database/entities/meander.entity";
import type { CorpusEntry } from "./corpus.types";

/**
 * Ingests the historical corpus into the meander database, through
 * the same generic reader and Characteristic computation
 * `DrawCodeService` draws a `--code` meander through — so an Enumerated row
 * and a Hardcoded row are produced by the exact same pipeline, and only ever
 * differ in where their Code came from.
 *
 * **Which entries it ingests is computed, not listed.** The corpus was
 * extracted against a sixteen-edge budget, and an entry within it was
 * reproduced by `EnumerationService` rather than preserved, so only the
 * entries beyond it are ingested — and that reach is two bounds rather than
 * one. `HISTORICAL_CORPUS_EDGE_BUDGET` is the edge boundary, fixed at the
 * budget the corpus was drawn against rather than following the draw run's
 * own; and `DRAW_MINIMUM_ROWS` is the floor the draw run starts at, because a
 * single-row band's interior is a single row with no southward edge anywhere
 * in it. An entry is kept when either bound puts it outside, which is what
 * lets `parallel`'s five single-row entries stay in the corpus while sitting
 * comfortably inside the budget. A raised draw run budget moves nothing here:
 * every preserved entry stays a hardcoded row, and the draw run skips the
 * Codes they hold rather than folding them.
 *
 * **Nothing about a Hardcoded entry is carried over but its Code.** Its
 * Characteristics are measured exactly as an Enumerated row's are, so a
 * pattern holds for a hardcoded meander for the same reason it holds for
 * any other.
 *
 * The stored Characteristics are `DrawRecordService`'s: every one of
 * `CharacteristicsService.compute` that is nonzero or true, in the one
 * `characteristics` map, with `isReducible` when the filed Code is wider
 * than its unit.
 *
 * A Code that collides with one already committed — an Enumerated row, or
 * another entry ingested earlier in the same draw run — fails loudly through
 * {@link DuplicateCorpusCodeError} rather than silently overwriting, since
 * `MeanderawDatabaseService.save` relies on the `code` column's own unique constraint
 * rather than checking beforehand.
 */
@Injectable()
export class CorpusService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(CharacteristicsService)
    private readonly characteristicsService: CharacteristicsService,
    @Inject(MeanderawDatabaseService)
    private readonly databaseService: MeanderawDatabaseService,
    @Inject(CodeService)
    private readonly codeService: CodeService,
    @Inject(TileEnumerationService)
    private readonly tileEnumerationService: TileEnumerationService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Reads, measures, and persists one entry. */
  private async ingestOne(entry: CorpusEntry): Promise<Meander> {
    const { code, columns, rows } = entry;
    const parsed = this.codeService.parse(code, rows, columns);
    const canonical = this.codeService.canonicalPhase(parsed, (phase) =>
      this.characteristicsService.tileCrossingComponentDeltaCount(phase),
    );

    const characteristics = this.characteristicsService.compute(canonical);
    const isReducible = this.characteristicsService.isReducible(canonical);
    const formatted = this.codeService.format(canonical);

    try {
      const existing = await this.databaseService.findOneByCode(formatted);
      if (existing) {
        return existing;
      }

      return await this.databaseService.save({
        characteristics: this.characteristicsService.stored(
          characteristics,
          isReducible,
        ),
        code: formatted,
        columns,
        isHardcoded: true,
        lattice: canonical.digits,
        repeats: canonical.repeats,
        rows,
        symmetricalCodes: this.codeService.symmetricalCodes(
          canonical,
          (phase) =>
            this.characteristicsService.tileCrossingComponentDeltaCount(phase),
        ),
      });
    } catch (error) {
      throw new DuplicateCorpusCodeError(formatted, error);
    }
  }

  // 🌎 Public Methods

  /**
   * Ingests every entry of `corpus` that {@link isPreserved} keeps, in the
   * corpus's own order, resolving with every row saved.
   *
   * Ingestion is sequential rather than run in parallel across entries: a
   * failure has to name the one entry that caused it, which a `Promise.all`
   * racing every `save` at once cannot promise, since concurrent writes
   * would reach the database in whatever order their connections won.
   */
  async ingest(corpus: readonly CorpusEntry[]): Promise<Meander[]> {
    const beyond = corpus.filter((entry) => this.isPreserved(entry));
    const saved: Meander[] = [];

    for (const entry of beyond) {
      saved.push(await this.ingestOne(entry));
    }

    return saved;
  }

  /**
   * Whether an entry is preserved as a hardcoded row: past the sixteen edges
   * the corpus was extracted against, or shallower than the draw run's row
   * floor. Neither bound reads the draw run's own budget, so raising it never
   * drops an entry.
   */
  isPreserved(entry: CorpusEntry): boolean {
    const { columns, rows } = entry;

    return (
      rows < DRAW_MINIMUM_ROWS ||
      this.tileEnumerationService.edges({ columns, rows }) >
        HISTORICAL_CORPUS_EDGE_BUDGET
    );
  }
}
