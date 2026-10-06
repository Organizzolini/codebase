import { ConfigModule } from "@nestjs/config";
import { getRepositoryToken, TypeOrmModule } from "@nestjs/typeorm";
import { DataSource, type Repository } from "typeorm";

import { postgresDataSourceOptions } from "@codebase/database";

import { environmentSchema } from "../src/constants";
import { CharacteristicsModule } from "../src/modules/characteristics/characteristics.module";
import { ClassificationModule } from "../src/modules/classification/classification.module";
import { CodeModule } from "../src/modules/code/code.module";
import { CorpusService } from "../src/modules/corpus/corpus.service";
import { DrawEnumerationService } from "../src/modules/draw/draw-enumeration.service";
import { DrawIndexService } from "../src/modules/draw/draw-index.service";
import { DrawPoolService } from "../src/modules/draw/draw-pool.service";
import { DrawRecordService } from "../src/modules/draw/draw-record.service";
import { DrawWorkerService } from "../src/modules/draw/draw-worker.service";
import { DrawCommand } from "../src/modules/draw/draw.command";
import { DrawingModule } from "../src/modules/drawing/drawing.module";
import { EnumerationModule } from "../src/modules/enumeration/enumeration.module";
import { EnumerationService } from "../src/modules/enumeration/enumeration.service";
import { GeometryModule } from "../src/modules/geometry/geometry.module";
import { Meander } from "../src/modules/meanderaw-database/entities/meander.entity";
import { MeanderawDatabaseService } from "../src/modules/meanderaw-database/meanderaw-database.service";
import { SymmetryModule } from "../src/modules/symmetry/symmetry.module";

import { DRAW_TEST_EDGE_BUDGET, DRAW_TEST_WORKERS } from "./draw-run-budget";

import type { StartedPostgresContainer } from "@codebase/database/testing";
import type {
  INestApplicationContext,
  ModuleMetadata,
  Provider,
} from "@nestjs/common";

/**
 * How long one whole `DrawCommand` draw run may take: tens of thousands of rows
 * decoded, rendered, measured, and indexed. Real work rather than a hang, so
 * it is declared rather than left to the default five seconds.
 */
export const DRAW_RUN_TIMEOUT_MILLISECONDS = 300_000;

/** Everything a draw-run case reads back from one compiled `DrawCommand`. */
export interface DrawRunFixture {
  command: DrawCommand;
  corpus: CorpusService;
  dataSource: DataSource;
  enumeration: EnumerationService;
  repository: Repository<Meander>;
}

/** Reads a compiled draw run module back as the handles its cases assert through. */
export async function drawRunFixture(
  module: INestApplicationContext,
): Promise<DrawRunFixture> {
  const repository = module.get<Repository<Meander>>(
    getRepositoryToken(Meander),
  );

  return {
    command: await module.resolve(DrawCommand),
    corpus: module.get(CorpusService),
    dataSource: module.get(DataSource),
    enumeration: module.get(EnumerationService),
    repository,
  };
}

/**
 * The module `DrawCommand`'s draw run compiles into: the real enumeration,
 * ingestion, and index services over a migrated schema in `container`'s Postgres
 * database, plus whatever `mocks` the caller stands in for `--code` and
 * logging.
 *
 * Shared by the draw-run suites, which are split across files so vitest
 * runs their draw runs in parallel rather than one after another. Each caller
 * starts its own container, compiles this, and mocks `node:fs/promises`
 * itself: `vi.mock` is hoisted only within a test file, and the testing
 * packages are development dependencies this production-scoped folder
 * cannot import.
 */
export function drawRunModuleMetadata(
  container: StartedPostgresContainer,
  mocks: readonly Provider[],
): ModuleMetadata {
  return {
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        validate: (config: Record<string, unknown>) =>
          environmentSchema.parse({
            ...config,
            DRAW_EDGE_BUDGET: DRAW_TEST_EDGE_BUDGET,
            DRAW_WORKERS: DRAW_TEST_WORKERS,
          }),
      }),
      TypeOrmModule.forRoot(
        postgresDataSourceOptions(container.connection, {
          entities: [Meander],
          migrations: [],
        }),
      ),
      TypeOrmModule.forFeature([Meander]),
      GeometryModule,
      CharacteristicsModule,
      ClassificationModule,
      CodeModule,
      EnumerationModule,
      SymmetryModule,
      DrawingModule,
    ],
    providers: [
      DrawCommand,
      DrawEnumerationService,
      DrawIndexService,
      DrawPoolService,
      DrawRecordService,
      DrawWorkerService,
      CorpusService,
      MeanderawDatabaseService,
      ...mocks,
    ],
  };
}
