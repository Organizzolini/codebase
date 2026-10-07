import { Module } from "@nestjs/common";

import { CharacteristicsModule } from "../characteristics/characteristics.module";
import { CodeModule } from "../code/code.module";
import { CorpusModule } from "../corpus/corpus.module";
import { DatabaseModule } from "../database/database.module";
import { DrawingModule } from "../drawing/drawing.module";
import { EnumerationModule } from "../enumeration/enumeration.module";
import { GeometryModule } from "../geometry/geometry.module";
import { SymmetryModule } from "../symmetry/symmetry.module";

import { DrawCodeService } from "./draw-code.service";
import { DrawEnumerationService } from "./draw-enumeration.service";
import { DrawIndexService } from "./draw-index.service";
import { DrawPoolService } from "./draw-pool.service";
import { DrawRecordService } from "./draw-record.service";
import { DrawWorkerService } from "./draw-worker.service";
import { DrawCommand } from "./draw.command";

/**
 * Registers the `draw` CLI command — the application's only command — the
 * service that enumerates the whole unit space its draw run covers, the service
 * that persists the one meander a `--code` drawing names, the service that
 * rebuilds the static index page from the committed rows, and the one place
 * any of them builds a database row.
 *
 * Every import here serves the one lattice-first pipeline both paths share:
 * `CodeModule` and `DrawingModule` are the generic
 * decoder and renderer every Code is drawn through,
 * `CharacteristicsModule` measures that same Code,
 * `EnumerationModule` walks the space the draw run covers, and
 * `DatabaseModule` is the Postgres database all of it
 * persists to and `DrawIndexService` reads back from, `GeometryModule` is
 * the scaling rule the index pages place each repeat of a tile by, and
 * `SymmetryModule` folds each symmetry class the draw run's worker threads draw
 * to its representative. `CorpusModule`
 * wraps the same decoder, renderer, and Characteristic computation beneath
 * one service `DrawCommand` calls once per draw run with the historical corpus.
 *
 * `DatabaseModule` always connects to the database the `MEANDERAW_POSTGRES_*`
 * variables name — a test exercising `DrawCommand`, `DrawCodeService`,
 * `DrawEnumerationService`, `DrawIndexService`, or `CorpusService` builds
 * its own `TestingModule` against a throwaway Postgres container instead of
 * importing this module.
 */
@Module({
  controllers: [],
  exports: [DrawCommand],
  imports: [
    CorpusModule,
    CharacteristicsModule,
    DatabaseModule,
    CodeModule,
    EnumerationModule,
    DrawingModule,
    SymmetryModule,
    GeometryModule,
  ],
  providers: [
    DrawCodeService,
    DrawCommand,
    DrawEnumerationService,
    DrawIndexService,
    DrawPoolService,
    DrawRecordService,
    DrawWorkerService,
  ],
})
export class DrawModule {}
