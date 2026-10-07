import { ConfigService } from "@nestjs/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  type DatabaseTestingModule,
  startDatabaseTestingModule,
} from "@codebase/database/testing";

import {
  DRAW_TEST_EDGE_BUDGET,
  DRAW_TEST_WORKERS,
} from "../../../testing/draw-run-budget";
import { environmentSchema } from "../../constants";
import { CharacteristicsModule } from "../characteristics/characteristics.module";
import { CodeService } from "../code/code.service";
import { DrawingService } from "../drawing/drawing.service";
import { EnumerationService } from "../enumeration/enumeration.service";
import { TileEnumerationService } from "../enumeration/tile-enumeration.service";
import { GeometryService } from "../geometry/geometry.service";
import { GraphService } from "../graph/graph.service";
import { MatrixService } from "../matrix/matrix.service";
import { Meander } from "../meanderaw-database/entities/meander.entity";
import { MeanderawDatabaseModule } from "../meanderaw-database/meanderaw-database.module";
import { Migration1791160950069 } from "../meanderaw-database/migrations/1791160950069-migration";
import { Migration1791414023001 } from "../meanderaw-database/migrations/1791414023001-migration";
import { SvgService } from "../svg/svg.service";
import { SymmetryService } from "../symmetry/symmetry.service";
import { TileService } from "../tile/tile.service";

import { DrawEnumerationService } from "./draw-enumeration.service";
import { DrawPoolService } from "./draw-pool.service";
import { DrawRecordService } from "./draw-record.service";
import { DrawWorkerService } from "./draw-worker.service";

import type { Environment } from "../enumeration/enumeration.types";
import type { Repository } from "typeorm";

// 🔧 Configuration

/**
 * How long the whole draw run may take. At `DRAW_TEST_EDGE_BUDGET` it walks
 * `2 ** edges` assignments at each of fourteen shapes, renders an SVG for
 * every meander it keeps, and writes 30,279 rows — about ten seconds
 * locally, and several times that on a shared CI runner. Bounded rather
 * than removed, so a pinned budget raised past what anybody meant fails here
 * rather than running forever.
 */
const DRAW_RUN_TIMEOUT_MILLISECONDS = 300_000;

// 🧪 Tests

/**
 * Drives the draw run's lattice-first half against a real TypeORM connection to
 * a throwaway Postgres container, per spec #813's Testing Decisions:
 * this is the highest seam, and it asserts on persisted rows rather than on
 * a mocked service graph.
 *
 * The module is booted by `startDatabaseTestingModule`, which points
 * `MeanderawDatabaseModule` at a fresh, isolated database instead of the
 * local one.
 */
describe(DrawEnumerationService, () => {
  let database: DatabaseTestingModule;
  let repository: Repository<Meander>;
  let service: DrawEnumerationService;

  beforeAll(async () => {
    const environment = environmentSchema.parse({
      DRAW_EDGE_BUDGET: DRAW_TEST_EDGE_BUDGET,
      DRAW_WORKERS: DRAW_TEST_WORKERS,
    });
    database = await startDatabaseTestingModule({
      database: MeanderawDatabaseModule,
      entities: [Meander],
      imports: [CharacteristicsModule],
      migrations: [Migration1791160950069, Migration1791414023001],
      project: "meanderaw",
      providers: [
        DrawEnumerationService,
        DrawPoolService,
        DrawRecordService,
        DrawWorkerService,
        GeometryService,
        CodeService,
        MatrixService,
        CodeService,
        EnumerationService,
        DrawingService,
        GraphService,
        SymmetryService,
        TileService,
        TileEnumerationService,
        SvgService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: keyof Environment) => environment[key],
          },
        },
      ],
    });

    service = await database.module.resolve(DrawEnumerationService);
    repository = database.repository(Meander);

    await service.drawAll();
  }, DRAW_RUN_TIMEOUT_MILLISECONDS);

  afterAll(async () => {
    await database.close();
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("drawAll", () => {
    // 🎯 The acceptance criterion, as one number: every structurally
    // distinct meander the pinned test budget admits, at every shape it
    // admits one at, persisted: nine shapes, from 2 by 1 to 6 by 1.
    it("persists every meander the budget admits, across every shape it admits", async () => {
      await expect(repository.count()).resolves.toBe(2079);
    });

    // 🎯 A meander's identity is its lattice address — its Code together
    // with the shape that Code is read at — and this is the measurement that
    // says so. 11 lattices are spelled by meanders of two different shapes,
    // 24 rows in all: a lattice names a tile by its points and deliberately
    // not by its shape, so the four characters `0000` are four bare points
    // two rows by two columns and also four down one column. Uniqueness is
    // asserted over the address rather than over the lattice for exactly
    // that reason, and the lattice count is asserted beside it so that the
    // gap between them cannot close silently.
    it("writes no two rows sharing a lattice address, though 11 lattices are shared across shapes", async () => {
      const rows = await repository.find({
        select: { code: true, columns: true, lattice: true, rows: true },
      });
      const addresses = rows.map(
        ({ columns, lattice, rows: bandRows }) =>
          `${bandRows}r${columns}c-${lattice}`,
      );

      expect(new Set(addresses).size).toBe(rows.length);
      expect(new Set(rows.map(({ lattice }) => lattice)).size).toBe(2066);
      expect(new Set(rows.map(({ code }) => code)).size).toBe(2079);
    });

    // 🎯 One row per symmetry class, and the rest of the class recorded
    // beside it rather than dropped. Each folded Code belongs to exactly one
    // class, so none may repeat across rows, and none may be a row of its
    // own — a Code that were would mean two rows for one class.
    it("records each row's folded mirror and flip Codes, none of them a row of its own or another row's", async () => {
      const rows = await repository.find({
        select: { code: true, symmetricalCodes: true },
      });
      const codes = new Set(rows.map(({ code }) => code));
      const folded = rows.flatMap(({ symmetricalCodes }) => symmetricalCodes);

      expect(folded.length).toBeGreaterThan(0);
      expect(new Set(folded).size).toBe(folded.length);
      expect(folded.filter((code) => codes.has(code))).toStrictEqual([]);
    });

    // 🎯 The hardcoded corpus is ingested before the draw run, and a meander
    // whose Code a row already holds is skipped rather than refused — so a
    // second pass over a shape whose every Code is held writes nothing and
    // raises no unique-index error.
    it("skips every meander whose Code a row of its shape already holds", async () => {
      await expect(service.persist([{ columns: 3, rows: 2 }])).resolves.toBe(0);
      await expect(repository.count()).resolves.toBe(2079);
    });

    it("records every row as enumerated rather than hardcoded", async () => {
      await expect(repository.countBy({ isHardcoded: true })).resolves.toBe(0);
    });

    // 🎯 Every meander the pinned budget of 12 edges admits is written,
    // whatever patterns hold for it — nothing is filtered from the draw run.
    it("writes every enumerated meander within the budget", async () => {
      await expect(repository.count()).resolves.toBe(2079);
    });

    it("records a meander's Characteristics with its row, so a structural question is answerable without re-deriving one", async () => {
      const row = await repository.findOneByOrFail({ lattice: "4488" });

      expect(row).toMatchObject({
        characteristics: {
          bettiNumber0Count: 1,
          endsAreLatticeNeighbors: true,
          endsOnBorderRules: true,
          freeEndCount: 2,
          isBars: true,
          isReducible: true,
          isSingleArc: true,
        },
        code: "02x02y4488",
        columns: 2,
        isHardcoded: false,
        lattice: "4488",
        repeats: 1,
        rows: 2,
      });
    });
  });
});
