import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { environmentSchema } from "../../constants";
import { CharacteristicsModule } from "../characteristics/characteristics.module";
import { ClassificationModule } from "../classification/classification.module";
import { CodeModule } from "../code/code.module";
import { DrawingModule } from "../drawing/drawing.module";
import { EnumerationModule } from "../enumeration/enumeration.module";
import { SymmetryModule } from "../symmetry/symmetry.module";

import { DrawRecordService } from "./draw-record.service";
import { DrawWorkerService } from "./draw-worker.service";

/**
 * What one draw run worker thread boots: exactly the services that turn an
 * orbit minimum into a row, and nothing that writes one.
 *
 * A worker thread shares no module graph with the main thread, so it boots
 * its own standalone context from `src/worker.ts`. It holds no database
 * connection and no pool — rows travel back to the main thread, which
 * inserts them — and it validates the same environment schema the main
 * thread does, which a worker inherits a copy of, so both read the same
 * edge budget.
 */
@Module({
  controllers: [],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config: Record<string, unknown>) =>
        environmentSchema.parse(config),
    }),
    CharacteristicsModule,
    ClassificationModule,
    CodeModule,
    DrawingModule,
    EnumerationModule,
    SymmetryModule,
  ],
  providers: [DrawRecordService, DrawWorkerService],
})
export class DrawWorkerModule {}
