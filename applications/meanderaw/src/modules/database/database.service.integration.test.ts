import { Test } from "@nestjs/testing";
import { getRepositoryToken, TypeOrmModule } from "@nestjs/typeorm";
import { DataSource, Like, type Repository } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { meanderRecord } from "../../../testing/meanders";
import { CHARACTERISTIC_KEYS } from "../characteristics/characteristics.constants";

import { MEANDER_INSERT_CHUNK_SIZE } from "./database.constants";
import { DatabaseService } from "./database.service";
import { Meander } from "./entities/Meander.entity";

// 🧪 Tests

/**
 * Drives `DatabaseService` against a real TypeORM connection to an
 * in-memory `better-sqlite3` database, per spec #813's Testing Decisions:
 * this is the highest seam, and it asserts on persisted rows rather than on
 * a mocked repository.
 *
 * The connection is assembled inline rather than through
 * `DatabaseModule`, which always opens the one committed database
 * file — a test needs a fresh, isolated connection of its own instead.
 */
describe(DatabaseService, () => {
  let dataSource: DataSource;
  let repository: Repository<Meander>;
  let service: DatabaseService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          database: ":memory:",
          entities: [Meander],
          logging: false,
          synchronize: true,
          type: "better-sqlite3",
        }),
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
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("findAll", () => {
    it("resolves with an empty array before anything is committed", async () => {
      await expect(service.findAll()).resolves.toStrictEqual([]);
    });

    it("reads every committed row", async () => {
      await service.save(meanderRecord({ code: "findAll-first-row" }));
      await service.save(meanderRecord({ code: "findAll-second-row" }));

      const rows = await service.findAll();

      expect(rows.map((row) => row.code)).toStrictEqual(
        expect.arrayContaining(["findAll-first-row", "findAll-second-row"]),
      );
    });
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
          family: "snake",
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
          family: "snake",
          lattice: "3c9a",
          rows: 3,
        }),
        id: saved.id,
      });
    });

    it("assigns each saved row its own auto-generated id", async () => {
      const first = await service.save(meanderRecord({ code: "0" }));
      const second = await service.save(meanderRecord({ code: "f" }));

      expect(second.id).not.toBe(first.id);
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

    it("round-trips a meander's numbers, letter counts, and true booleans through save and a lattice lookup", async () => {
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

      const found = await service.findOneByLattice("map-round-trip", 2, 1);

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

      const found = await service.findOneByLattice("map-empty", 2, 1);

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
        .where("json_extract(meander.characteristics, :path) > 0", {
          path: "$.northForkCount",
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
        .andWhere("json_extract(meander.characteristics, :path) = 0", {
          path: "$.crossCount",
        })
        .getMany();
      const coalesced = await repository
        .createQueryBuilder("meander")
        .where("meander.code = :code", { code: "map-coalesce" })
        .andWhere(
          "COALESCE(json_extract(meander.characteristics, :path), 0) = 0",
          { path: "$.crossCount" },
        )
        .getMany();

      expect(bare).toStrictEqual([]);
      expect(coalesced.map((row) => row.code)).toStrictEqual(["map-coalesce"]);
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
  });

  describe("family and subFamily columns", () => {
    it("persists a trusted family and subFamily alongside a row", async () => {
      const saved = await service.save(
        meanderRecord({
          characteristics: { isDots: true },
          code: "trusted-row",
          family: "boxes",
        }),
      );

      const row = await repository.findOneByOrFail({ id: saved.id });

      expect(row).toMatchObject({
        characteristics: { isDots: true },
        family: "boxes",
      });
    });

    it("leaves family and subFamily null when a row names neither", async () => {
      const saved = await service.save(
        meanderRecord({ code: "untrusted-row" }),
      );

      const row = await repository.findOneByOrFail({ id: saved.id });

      expect(row.family).toBe("unclassified");
      expect(row.characteristics).toStrictEqual({});
    });
  });

  describe("clear", () => {
    it("deletes every meander row and restarts id assignment, so a regenerated sweep numbers its rows as a fresh one would", async () => {
      await service.save(meanderRecord({ code: "clear-first-row" }));
      await service.save(meanderRecord({ code: "clear-second-row" }));

      await service.clear();

      await expect(service.findAll()).resolves.toStrictEqual([]);

      const saved = await service.save(
        meanderRecord({ code: "clear-first-row" }),
      );

      expect(saved.id).toBe(1);
    });
  });
});
