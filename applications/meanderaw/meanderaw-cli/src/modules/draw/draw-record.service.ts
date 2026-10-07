import { Inject, Injectable } from "@nestjs/common";

import { CharacteristicsService } from "../characteristics/characteristics.service";
import { CodeService } from "../code/code.service";

import type { CodeObject } from "../code/code.types";
import type { MeanderRecord } from "../database/database.types";

/**
 * Turns one Code into the row the database holds for it: read once, then
 * measured from that same reading, with nothing re-read in between.
 *
 * It is the one place a meander row is built, and both ways a row comes to
 * exist go through it — the Code a person names at the command line and the
 * Code the draw run finds — so a Characteristic added to the pipeline reaches
 * both at once rather than reaching whichever caller was remembered. The
 * only thing that differs between the two is the `isHardcoded` the caller
 * passes, which is a fact about where the Code came from rather than
 * anything this can read off it.
 *
 * Every Characteristic of `CharacteristicsService.compute` that is nonzero
 * or true is stored in the one `characteristics` map, with `isReducible`
 * when the filed Code is wider than its unit.
 */
@Injectable()
export class DrawRecordService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(CharacteristicsService)
    private readonly characteristicsService: CharacteristicsService,
    @Inject(CodeService)
    private readonly codeService: CodeService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** The row one Code describes at one shape, every field of it derived from that Code alone. */
  record(
    code: string,
    shape: {
      columns?: number | undefined;
      repeats?: number | undefined;
      rows?: number | undefined;
    } = {},
    isHardcoded = true,
  ): MeanderRecord {
    const parsed = this.codeService.parse(code, shape.rows, shape.columns);
    const repeats = shape.repeats ?? parsed.repeats;
    const withRepeats = { ...parsed, repeats };
    const scoreTileCrossing = (phase: CodeObject): number =>
      this.characteristicsService.tileCrossingComponentDeltaCount(phase);
    const canonical = this.codeService.canonicalPhase(
      withRepeats,
      scoreTileCrossing,
    );
    const characteristics = this.characteristicsService.compute(canonical);
    const isReducible = this.characteristicsService.isReducible(canonical);

    return {
      characteristics: this.characteristicsService.stored(
        characteristics,
        isReducible,
      ),
      code: this.codeService.format(canonical),
      columns: canonical.columns,
      isHardcoded,
      lattice: canonical.digits,
      repeats: canonical.repeats,
      rows: canonical.rows,
      symmetricalCodes: this.codeService.symmetricalCodes(
        canonical,
        scoreTileCrossing,
      ),
    };
  }
}
