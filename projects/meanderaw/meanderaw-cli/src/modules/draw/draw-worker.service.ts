import { Inject, Injectable } from "@nestjs/common";

import { CodeService } from "../code/code.service";
import { TileEnumerationService } from "../enumeration/tile-enumeration.service";
import { SymmetryService } from "../symmetry/symmetry.service";

import { DrawRecordService } from "./draw-record.service";

import type {
  MeanderRecord,
  MeanderShape,
} from "../meanderaw-database/meanderaw-database.types";

/**
 * Draws one batch of a shape's orbit minima into the rows the database
 * holds for them — the part of a draw run that costs nearly all of its time,
 * and so the part `DrawPoolService` spreads across worker threads.
 *
 * Each mask is one symmetry class, kept by
 * `TileEnumerationService.orbitMinima` without building the rest of it.
 * This is where the class is finally built: folded to the representative
 * `SymmetryService.canonicalTile` picks, spelled, and recorded, exactly as
 * a draw run drawn on one thread would record it. Nothing here touches the
 * database or the pool, so the same code runs in a worker thread and, when
 * the pool is configured with no workers, in-process.
 */
@Injectable()
export class DrawWorkerService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(CodeService)
    private readonly codeService: CodeService,
    @Inject(DrawRecordService)
    private readonly drawRecordService: DrawRecordService,
    @Inject(SymmetryService)
    private readonly symmetryService: SymmetryService,
    @Inject(TileEnumerationService)
    private readonly tileEnumerationService: TileEnumerationService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Every mask's meander as an enumerated row, in the order the masks were given. */
  records(shape: MeanderShape, masks: readonly number[]): MeanderRecord[] {
    return masks.map((mask) =>
      this.drawRecordService.record(
        this.codeService.spell(
          this.symmetryService.canonicalTile(
            this.tileEnumerationService.tile(shape, mask),
          ),
        ),
        shape,
        false,
      ),
    );
  }
}
