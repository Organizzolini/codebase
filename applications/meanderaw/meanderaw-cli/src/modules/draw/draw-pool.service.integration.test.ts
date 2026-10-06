import { ConfigModule } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { environmentSchema } from "../../constants";
import { CharacteristicsModule } from "../characteristics/characteristics.module";
import { ClassificationModule } from "../classification/classification.module";
import { CodeModule } from "../code/code.module";
import { DrawingModule } from "../drawing/drawing.module";
import { EnumerationModule } from "../enumeration/enumeration.module";
import { SymmetryModule } from "../symmetry/symmetry.module";

import { DrawPoolService } from "./draw-pool.service";
import { DrawRecordService } from "./draw-record.service";
import { DrawWorkerService } from "./draw-worker.service";

import type {
  MeanderRecord,
  MeanderShape,
} from "../meanderaw-database/meanderaw-database.types";

/** Compiles a pool over the real drawing services, with `workers` threads. */
async function compilePool(workers: number): Promise<DrawPoolService> {
  const module = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        ignoreEnvFile: true,
        isGlobal: true,
        validate: () => environmentSchema.parse({ DRAW_WORKERS: workers }),
      }),
      CharacteristicsModule,
      ClassificationModule,
      CodeModule,
      DrawingModule,
      EnumerationModule,
      SymmetryModule,
    ],
    providers: [DrawPoolService, DrawRecordService, DrawWorkerService],
  }).compile();

  return module.resolve(DrawPoolService);
}

/** Reads every row a pool draws for one shape, across every batch it hands back. */
async function rowsOf(
  pool: DrawPoolService,
  shape: MeanderShape,
): Promise<MeanderRecord[]> {
  const rows: MeanderRecord[] = [];

  for await (const batch of pool.batches(shape)) {
    rows.push(...batch);
  }

  return rows;
}

/**
 * Drives the pool through real worker threads, each booting its own
 * `DrawWorkerModule` from `src/worker.ts`, against the same pool drawing
 * in-process. Nothing short of real threads proves the worker entry point
 * boots, receives a batch, and posts back rows the main thread can write.
 */
describe("drawPoolService across worker threads", () => {
  let inProcess: DrawPoolService;
  let threaded: DrawPoolService;

  beforeAll(async () => {
    inProcess = await compilePool(0);
    threaded = await compilePool(2);
  });

  afterAll(async () => {
    await threaded.close();
  });

  it("draws exactly the rows, in exactly the order, a pool with no workers draws", async () => {
    const shape = { columns: 2, rows: 3 };
    const expected = await rowsOf(inProcess, shape);

    expect(expected).toHaveLength(204);
    await expect(rowsOf(threaded, shape)).resolves.toStrictEqual(expected);
  });
});
