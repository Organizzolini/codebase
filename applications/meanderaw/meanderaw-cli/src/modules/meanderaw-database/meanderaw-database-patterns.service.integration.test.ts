import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  type DatabaseTestingModule,
  startDatabaseTestingModule,
} from "@codebase/database/testing";

import { meanderRecord } from "../../../testing/meanders";

import { Meander } from "./entities/meander.entity";
import { MeanderawDatabaseModule } from "./meanderaw-database.module";
import { MeanderawDatabaseService } from "./meanderaw-database.service";
import { Migration1791160950069 } from "./migrations/1791160950069-migration";
import { Migration1791414023001 } from "./migrations/1791414023001-migration";

// 🧪 Tests

/**
 * Drives `MeanderawDatabaseService`'s pattern queries — how many rows each
 * pattern characteristic holds for, and those rows a batch at a time —
 * against a real Postgres database `startDatabaseTestingModule` boots,
 * beside `meanderaw-database.service.integration.test.ts`, which covers the
 * rest of the service. They live apart so neither file outgrows the line cap.
 */
describe(MeanderawDatabaseService, () => {
  let database: DatabaseTestingModule;
  let service: MeanderawDatabaseService;

  beforeAll(async () => {
    database = await startDatabaseTestingModule({
      database: MeanderawDatabaseModule,
      entities: [Meander],
      migrations: [Migration1791160950069, Migration1791414023001],
      project: "meanderaw",
    });

    service = await database.module.resolve(MeanderawDatabaseService);
  });

  afterAll(async () => {
    await database.close();
  });

  describe("patternShapeCounts", () => {
    it("counts each pattern's rows at each shape, without reading a row", async () => {
      await service.saveAll([
        meanderRecord({
          characteristics: { isWhirl: true },
          code: "count-a",
          columns: 1,
          rows: 40,
        }),
        meanderRecord({
          characteristics: { isWhirl: true },
          code: "count-b",
          columns: 1,
          rows: 40,
        }),
        meanderRecord({
          characteristics: { isWhirl: true },
          code: "count-c",
          columns: 2,
          rows: 40,
        }),
      ]);

      const counts = await service.patternShapeCounts(["isWhirl"]);

      expect(counts.filter(({ rows }) => rows === 40)).toStrictEqual(
        expect.arrayContaining([
          { columns: 1, count: 2, key: "isWhirl", rows: 40 },
          { columns: 2, count: 1, key: "isWhirl", rows: 40 },
        ]),
      );
    });

    it("counts a row holding two patterns under both, and a row holding none under neither", async () => {
      await service.saveAll([
        meanderRecord({
          characteristics: { isArcade: true, isBars: true },
          code: "both-a",
          columns: 3,
          rows: 43,
        }),
        meanderRecord({
          characteristics: { isArcade: true },
          code: "both-b",
          columns: 3,
          rows: 43,
        }),
        meanderRecord({
          characteristics: { crossCount: 1 },
          code: "both-none",
          columns: 3,
          rows: 43,
        }),
      ]);

      const counts = await service.patternShapeCounts(["isArcade", "isBars"]);

      expect(counts.filter(({ rows }) => rows === 43)).toHaveLength(2);
      expect(counts).toStrictEqual(
        expect.arrayContaining([
          { columns: 3, count: 2, key: "isArcade", rows: 43 },
          { columns: 3, count: 1, key: "isBars", rows: 43 },
        ]),
      );
    });

    it("does not count a pattern it was not passed", async () => {
      await service.save(
        meanderRecord({
          characteristics: { isChain: true, isComb: true },
          code: "not-requested",
          columns: 4,
          rows: 44,
        }),
      );

      const counts = await service.patternShapeCounts(["isChain"]);

      expect(counts.filter(({ rows }) => rows === 44)).toStrictEqual([
        { columns: 4, count: 1, key: "isChain", rows: 44 },
      ]);
    });

    it("leaves a pattern holding for no row out of the result", async () => {
      await service.save(
        meanderRecord({
          characteristics: { isFork: true },
          code: "absent-fork",
          columns: 5,
          rows: 45,
        }),
      );

      const counts = await service.patternShapeCounts(["isFork", "isMesh"]);

      expect(counts.some(({ key }) => key === "isMesh")).toBe(false);
      expect(counts.some(({ key }) => key === "isFork")).toBe(true);
    });
  });

  describe("patternRows", () => {
    beforeAll(async () => {
      await service.saveAll([
        meanderRecord({
          characteristics: { isSwirl: true },
          code: "pattern-rows-c",
          columns: 1,
          rows: 41,
        }),
        meanderRecord({
          characteristics: { isSwirl: true },
          code: "pattern-rows-a",
          columns: 2,
          rows: 41,
        }),
        meanderRecord({
          characteristics: { isSwirl: true, isWhirl: true },
          code: "pattern-rows-b",
          columns: 1,
          rows: 41,
        }),
        meanderRecord({
          characteristics: { isSwirl: true },
          code: "pattern-rows-d",
          columns: 1,
          rows: 42,
        }),
        meanderRecord({
          characteristics: { isClasps: true },
          code: "pattern-rows-e",
          columns: 1,
          rows: 41,
        }),
      ]);
    });

    const read = async (
      key: "isClasps" | "isSwirl",
      batchSize?: number,
    ): Promise<string[][]> => {
      const batches: string[][] = [];

      for await (const batch of service.patternRows(key, batchSize)) {
        batches.push(batch.map(({ code }) => code));
      }

      return batches;
    };

    it("reads the rows holding one pattern in batches, ordered by rows, then columns, then code", async () => {
      await expect(read("isSwirl", 2)).resolves.toStrictEqual([
        ["pattern-rows-b", "pattern-rows-c"],
        ["pattern-rows-a", "pattern-rows-d"],
      ]);
    });

    it("resumes after the last row of a full batch, reading no row twice", async () => {
      const batches = await read("isSwirl", 3);
      const codes = batches.flat();

      expect(codes).toStrictEqual([
        "pattern-rows-b",
        "pattern-rows-c",
        "pattern-rows-a",
        "pattern-rows-d",
      ]);
      expect(new Set(codes).size).toBe(codes.length);
    });

    it("yields a final short batch, and nothing for a pattern no row holds", async () => {
      await expect(read("isClasps", 2)).resolves.toStrictEqual([
        ["pattern-rows-e"],
      ]);
      await expect(
        (async () => {
          const batches: unknown[] = [];

          for await (const batch of service.patternRows("isWaterfalls")) {
            batches.push(batch);
          }

          return batches;
        })(),
      ).resolves.toStrictEqual([]);
    });
  });
});
