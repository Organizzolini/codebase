import { Module } from "@nestjs/common";

import { CharacteristicsModule } from "../characteristics/characteristics.module";
import { ClassificationModule } from "../classification/classification.module";
import { CodeModule } from "../code/code.module";
import { CorpusModule } from "../corpus/corpus.module";
import { DatabaseModule } from "../database/database.module";
import { DrawingModule } from "../drawing/drawing.module";
import { EnumerationModule } from "../enumeration/enumeration.module";
import { SymmetryModule } from "../symmetry/symmetry.module";

import { DrawCodeService } from "./draw-code.service";
import { DrawEnumerationService } from "./draw-enumeration.service";
import { DrawPoolService } from "./draw-pool.service";
import { DrawRecordService } from "./draw-record.service";
import { DrawWorkerService } from "./draw-worker.service";
import { DrawCommand } from "./draw.command";

/**
 * Registers the `draw` CLI command — the application's only command — the
 * service that enumerates the whole unit space its sweep covers, the service
 * that persists the one meander a `--code` drawing names, the service that
 * rebuilds the static index page from the committed rows, and the one place
 * any of them builds a database row.
 *
 * Every import here serves the one lattice-first pipeline both paths share:
 * `CodeModule` and `DrawingModule` are the generic
 * decoder and renderer every family's Code is drawn through,
 * `CharacteristicsModule` measures that same Code,
 * `EnumerationModule` walks the space the sweep covers, and
 * `DatabaseModule` is the Postgres database all of it
 * persists to, and `SymmetryModule` folds each symmetry class the sweep's
 * worker threads draw to its representative. `CorpusModule`
 * wraps the same decoder, renderer, and Characteristic computation beneath
 * one service `DrawCommand` calls once per sweep with the historical corpus,
 * trusting its family/subFamily rather than classifying them.
 *
 * `DatabaseModule` always connects to the database the `MEANDERAW_POSTGRES_*`
 * variables name — a test exercising `DrawCommand`, `DrawCodeService`,
 * `DrawEnumerationService`, or `CorpusService` builds
 * its own `TestingModule` against a throwaway Postgres container instead of
 * importing this module.
 */
@Module({
  controllers: [],
  exports: [DrawCommand],
  imports: [
    CorpusModule,
    CharacteristicsModule,
    ClassificationModule,
    DatabaseModule,
    CodeModule,
    EnumerationModule,
    DrawingModule,
    SymmetryModule,
  ],
  providers: [
    DrawCodeService,
    DrawCommand,
    DrawEnumerationService,
    DrawPoolService,
    DrawRecordService,
    DrawWorkerService,
  ],
})
export class DrawModule {}
