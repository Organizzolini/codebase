import { ConfigModule } from "@nestjs/config";
import { getRepositoryToken, TypeOrmModule } from "@nestjs/typeorm";
import { DataSource, type Repository } from "typeorm";

import { environmentSchema } from "../src/constants";
import { CharacteristicsModule } from "../src/modules/characteristics/characteristics.module";
import { ClassificationModule } from "../src/modules/classification/classification.module";
import { CodeModule } from "../src/modules/code/code.module";
import { CorpusService } from "../src/modules/corpus/corpus.service";
import { DatabaseService } from "../src/modules/database/database.service";
import { Meander } from "../src/modules/database/entities/Meander.entity";
import { DrawEnumerationService } from "../src/modules/draw/draw-enumeration.service";
import { DrawIndexService } from "../src/modules/draw/draw-index.service";
import { DrawRecordService } from "../src/modules/draw/draw-record.service";
import { DrawCommand } from "../src/modules/draw/draw.command";
import { DrawingModule } from "../src/modules/drawing/drawing.module";
import { EnumerationModule } from "../src/modules/enumeration/enumeration.module";
import { EnumerationService } from "../src/modules/enumeration/enumeration.service";
import { GeometryModule } from "../src/modules/geometry/geometry.module";

import type {
  INestApplicationContext,
  ModuleMetadata,
  Provider,
} from "@nestjs/common";

/**
 * How long one whole `DrawCommand` sweep may take: tens of thousands of rows
 * decoded, rendered, measured, and indexed. Real work rather than a hang, so
 * it is declared rather than left to the default five seconds.
 */
export const SWEEP_TIMEOUT_MILLISECONDS = 300_000;

/** Everything a sweep-mode case reads back from one compiled `DrawCommand`. */
export interface SweepFixture {
  command: DrawCommand;
  corpus: CorpusService;
  dataSource: DataSource;
  enumeration: EnumerationService;
  repository: Repository<Meander>;
}

/** Reads a compiled sweep module back as the handles its cases assert through. */
export async function sweepFixture(
  module: INestApplicationContext,
): Promise<SweepFixture> {
  return {
    command: await module.resolve(DrawCommand),
    corpus: module.get(CorpusService),
    dataSource: module.get(DataSource),
    enumeration: module.get(EnumerationService),
    repository: module.get(getRepositoryToken(Meander)),
  };
}

/**
 * The module `DrawCommand`'s sweep compiles into: the real enumeration,
 * ingestion, and index services over a fresh in-memory `better-sqlite3`
 * connection, plus whatever `mocks` the caller stands in for `--code` and
 * logging.
 *
 * Shared by the sweep-mode suites, which are split across files so vitest
 * runs their sweeps in parallel rather than one after another. Each caller
 * compiles it and mocks `node:fs/promises` itself: `vi.mock` is hoisted only
 * within a test file, and the testing packages are development dependencies
 * this production-scoped folder cannot import.
 */
export function sweepModuleMetadata(
  mocks: readonly Provider[],
): ModuleMetadata {
  return {
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        validate: (config: Record<string, unknown>) =>
          environmentSchema.parse(config),
      }),
      TypeOrmModule.forRoot({
        database: ":memory:",
        entities: [Meander],
        logging: false,
        synchronize: true,
        type: "better-sqlite3",
      }),
      TypeOrmModule.forFeature([Meander]),
      GeometryModule,
      CharacteristicsModule,
      ClassificationModule,
      CodeModule,
      EnumerationModule,
      DrawingModule,
    ],
    providers: [
      DrawCommand,
      DrawEnumerationService,
      DrawIndexService,
      DrawRecordService,
      CorpusService,
      DatabaseService,
      ...mocks,
    ],
  };
}
