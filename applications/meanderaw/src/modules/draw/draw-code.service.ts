import { Inject, Injectable } from "@nestjs/common";

import { DatabaseService } from "../database/database.service";

import { DrawRecordService } from "./draw-record.service";

import type { Meander } from "../database/entities/Meander.entity";
import type { CodeDrawingOptions } from "./draw.types";

/**
 * Persists the meander a `--code` drawing names, as one row in the meander
 * database.
 *
 * The row itself is built by `DrawRecordService`, the one place a meander
 * row is built — decoded once, then measured and classified from that same
 * grid — so this mode and the sweep's enumerated half record the
 * same facts about a Code rather than each deriving their own.
 *
 * The row is recorded `isHardcoded: true`, since a Code typed at the command
 * line is authored the same way a corpus constant is, named by a person
 * rather than found by a search.
 */
@Injectable()
export class DrawCodeService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(DrawRecordService)
    private readonly drawRecordService: DrawRecordService,
    @Inject(DatabaseService)
    private readonly databaseService: DatabaseService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Decodes, measures, classifies, and persists the one meander `options` names. */
  async draw(options: CodeDrawingOptions): Promise<Meander> {
    const { code, columns, repeats, rows } = options;

    return this.databaseService.save(
      this.drawRecordService.record(code, { columns, repeats, rows }, true),
    );
  }
}
