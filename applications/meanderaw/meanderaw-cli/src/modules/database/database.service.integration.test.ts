import { Test } from "@nestjs/testing";
import { getRepositoryToken, TypeOrmModule } from "@nestjs/typeorm";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { DataSource, Like, type Repository } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  TEST_DATABASE_NAME,
  TEST_POSTGRES_IMAGE,
  TEST_SCHEMA_INITIALIZATION,
  testDataSourceOptions,
} from "../../../testing/database";
import { meanderRecord } from "../../../testing/meanders";
import { CHARACTERISTIC_KEYS } from "../characteristics/characteristics.constants";

import { MEANDER_INSERT_CHUNK_SIZE } from "./database.constants";
import { DatabaseService } from "./database.service";
import { Meander } from "./entities/Meander.entity";

import type { MeanderRecord } from "./database.types";

// 🧪 Tests

/**
 * Drives `DatabaseService` against a real TypeORM connection to a throwaway
 * Postgres container, per spec #813's Testing Decisions: this is the highest
 * seam, and it asserts on persisted rows rather than on a mocked repository.
 *
 * The connection is assembled inline rather than through `DatabaseModule`,
 * which reads the local database's address from configuration — a test
 * needs a fresh, isolated database of its own instead.
 */
describe(DatabaseService, () => {
  let container: StartedPostgreSqlContainer;
  let dataSource: DataSource;
  let repository: Repository<Meander>;
  let service: DatabaseService;

  beforeAll(async () => {
    container = await new PostgreSqlContainer(TEST_POSTGRES_IMAGE)
      .withDatabase(TEST_DATABASE_NAME)
      .withCopyContentToContainer([TEST_SCHEMA_INITIALIZATION])
      .start();

    const module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot(testDataSourceOptions(container)),
        TypeOrmModule.forFeature([Meander]),
      ],
      providers: [DatabaseService],
    }).compile();

    service = await module.resolve(DatabaseService);
    dataSource = module.get(DataSource);
    repository = module.get(getRepositoryToken(Meander));
  });

  afterAll(async () => {
    await dataSource.destroy();
    await container.stop();
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("save", () => {
    it("persists a meander row with every field it was given", async () => {
      const saved = await service.save(
        meanderRecord({
          characteristics: {
            bettiNumber0Count: 1,
            density: 0.5,
            forkCount: 1,
            isSnake: true,
          },
          code: "3c9a",
          columns: 2,
          lattice: "3c9a",
          rows: 3,
        }),
      );

      const row = await repository.findOneByOrFail({ id: saved.id });

      expect(row).toMatchObject({
        ...meanderRecord({
          characteristics: {
            bettiNumber0Count: 1,
            density: 0.5,
            forkCount: 1,
            isSnake: true,
          },
          code: "3c9a",
          columns: 2,
          lattice: "3c9a",
          rows: 3,
        }),
        id: saved.id,
      });
    });

    it("assigns each saved row its own uuidv7 id, ordered by when it was written", async () => {
      const first = await service.save(meanderRecord({ code: "0" }));
      const second = await service.save(meanderRecord({ code: "f" }));

      expect(first.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u,
      );
      expect([second.id, first.id].toSorted()).toStrictEqual([
        first.id,
        second.id,
      ]);
    });

    it("refuses a second row with a code already committed, since code is the meander's whole identity", async () => {
      await service.save(meanderRecord({ code: "duplicate-code" }));

      await expect(
        service.save(meanderRecord({ code: "duplicate-code" })),
      ).rejects.toThrow(/UNIQUE constraint/i);
    });
  });

  describe("characteristics", () => {
    it("stores no Characteristic under a column of its own, only in the one characteristics map", () => {
      const columns = new Set(
        dataSource
          .getMetadata(Meander)
          .columns.map((column) => column.propertyName),
      );

      expect(
        CHARACTERISTIC_KEYS.filter((key) => columns.has(key)),
      ).toStrictEqual([]);
      expect(columns.has("characteristics")).toBe(true);
    });

    it("round-trips a meander's numbers, letter counts, and true booleans through save and a Code lookup", async () => {
      await service.save(
        meanderRecord({
          characteristics: {
            aSoutheastLatinCount: 2,
            crossCount: 1,
            density: 0.25,
            isReducible: true,
            isSnake: true,
            yuSoutheastHangulCount: 1,
          },
          code: "map-round-trip",
          lattice: "map-round-trip",
        }),
      );

      const found = await service.findOneByCode("map-round-trip");

      expect(found?.characteristics).toStrictEqual({
        aSoutheastLatinCount: 2,
        crossCount: 1,
        density: 0.25,
        isReducible: true,
        isSnake: true,
        yuSoutheastHangulCount: 1,
      });
    });

    it("round-trips an empty map as empty", async () => {
      await service.save(
        meanderRecord({ code: "map-empty", lattice: "map-empty" }),
      );

      const found = await service.findOneByCode("map-empty");

      expect(found?.characteristics).toStrictEqual({});
    });

    it("round-trips maps written in chunks, every row keeping its own", async () => {
      const records = Array.from(
        { length: MEANDER_INSERT_CHUNK_SIZE + 1 },
        (_row, index) =>
          meanderRecord({
            characteristics: { oSoutheastLatinCount: index + 1 },
            code: `map-chunk-${index}`,
            lattice: `map-chunk-${index}`,
          }),
      );

      await service.saveAll(records);
      const rows = await repository.findBy({ code: Like("map-chunk-%") });

      expect(
        rows.every(
          (row) =>
            row.characteristics.oSoutheastLatinCount ===
            Number(row.lattice.split("-")[2]) + 1,
        ),
      ).toBe(true);
      expect(rows).toHaveLength(records.length);
    });

    it("is queryable by one numeric Characteristic, per spec #813's acceptance criteria, which a missing key never matches", async () => {
      await service.save(
        meanderRecord({
          characteristics: { northForkCount: 1 },
          code: "map-query-hit",
          lattice: "map-query-hit",
        }),
      );
      await service.save(
        meanderRecord({
          characteristics: { bettiNumber0Count: 2 },
          code: "map-query-miss",
          lattice: "map-query-miss",
        }),
      );

      const hits = await repository
        .createQueryBuilder("meander")
        .where("(meander.characteristics ->> :key)::numeric > 0", {
          key: "northForkCount",
        })
        .getMany();

      expect(hits.map((row) => row.code)).toStrictEqual(["map-query-hit"]);
    });

    it("reads a missing key as zero only through COALESCE", async () => {
      await service.save(
        meanderRecord({
          characteristics: { isDots: true },
          code: "map-coalesce",
          lattice: "map-coalesce",
        }),
      );

      const bare = await repository
        .createQueryBuilder("meander")
        .where("meander.code = :code", { code: "map-coalesce" })
        .andWhere("(meander.characteristics ->> :key)::numeric = 0", {
          key: "crossCount",
        })
        .getMany();
      const coalesced = await repository
        .createQueryBuilder("meander")
        .where("meander.code = :code", { code: "map-coalesce" })
        .andWhere(
          "COALESCE((meander.characteristics ->> :key)::numeric, 0) = 0",
          { key: "crossCount" },
        )
        .getMany();

      expect(bare).toStrictEqual([]);
      expect(coalesced.map((row) => row.code)).toStrictEqual(["map-coalesce"]);
    });
  });

  describe("codes", () => {
    it("reads the Codes one shape's rows hold, and no other shape's", async () => {
      await service.saveAll([
        meanderRecord({ code: "codes-a", columns: 7, lattice: "a", rows: 9 }),
        meanderRecord({ code: "codes-b", columns: 7, lattice: "b", rows: 9 }),
        meanderRecord({ code: "codes-c", columns: 6, lattice: "c", rows: 9 }),
      ]);

      await expect(
        service.codes({ columns: 7, rows: 9 }),
      ).resolves.toStrictEqual(new Set(["codes-a", "codes-b"]));
    });
  });

  describe("saveAll", () => {
    it("writes more rows than one chunk holds, every column bound, without exceeding the driver's variable limit", async () => {
      const records = Array.from(
        { length: MEANDER_INSERT_CHUNK_SIZE * 2 + 1 },
        (_row, index) =>
          meanderRecord({ code: `save-all-${index}`, lattice: `${index}` }),
      );

      await expect(service.saveAll(records)).resolves.toBe(records.length);
      await expect(
        repository.countBy({ code: Like("save-all-%") }),
      ).resolves.toBe(records.length);
    });

    it("stores every column exactly as save would, the JSON map and array columns included", async () => {
      const fields: Partial<MeanderRecord> = {
        characteristics: { aSoutheastLatinCount: 2, crossCount: 1 },
        symmetricalCodes: ["01x02y12", "01x02y21"],
      };

      await service.save(meanderRecord({ ...fields, code: "saved-one" }));
      await service.saveAll([
        meanderRecord({ ...fields, code: "saved-all", lattice: "saved-all" }),
      ]);

      const {
        code: _one,
        id: _oneId,
        ...one
      } = await repository.findOneByOrFail({ code: "saved-one" });
      const {
        code: _all,
        id: _allId,
        lattice: _lattice,
        ...all
      } = await repository.findOneByOrFail({ code: "saved-all" });
      const { lattice: _oneLattice, ...comparable } = one;

      expect(all).toStrictEqual(comparable);
    });

    it("refuses a batch holding a duplicate code and writes none of it", async () => {
      const records = [
        meanderRecord({ code: "batch-first", lattice: "batch-first" }),
        meanderRecord({ code: "batch-second", lattice: "batch-second" }),
        meanderRecord({ code: "batch-first", lattice: "batch-third" }),
      ];

      await expect(service.saveAll(records)).rejects.toThrow(
        /UNIQUE constraint/i,
      );
      await expect(repository.countBy({ code: Like("batch-%") })).resolves.toBe(
        0,
      );
    });
  });

  describe("clear", () => {
    it("deletes every meander row, so a regenerated draw run writes the same codes again rather than colliding with them", async () => {
      await service.save(meanderRecord({ code: "clear-first-row" }));
      await service.save(meanderRecord({ code: "clear-second-row" }));

      await service.clear();

      await expect(repository.find()).resolves.toStrictEqual([]);
      await expect(
        service.save(meanderRecord({ code: "clear-first-row" })),
      ).resolves.toMatchObject({ code: "clear-first-row" });
    });
  });
});
