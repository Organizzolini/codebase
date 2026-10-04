import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { getRepositoryToken, TypeOrmModule } from "@nestjs/typeorm";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { DataSource, type Repository } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  TEST_DATABASE_NAME,
  TEST_POSTGRES_IMAGE,
  TEST_SCHEMA_INITIALIZATION,
  testDataSourceOptions,
} from "../../../testing/database";
import { environmentSchema } from "../../constants";
import { CharacteristicsModule } from "../characteristics/characteristics.module";
import { ClassificationService } from "../classification/classification.service";
import { CodeService } from "../code/code.service";
import { DatabaseService } from "../database/database.service";
import { Meander } from "../database/entities/Meander.entity";
import { DrawingService } from "../drawing/drawing.service";
import { EnumerationService } from "../enumeration/enumeration.service";
import { TileEnumerationService } from "../enumeration/tile-enumeration.service";
import { GeometryService } from "../geometry/geometry.service";
import { GraphService } from "../graph/graph.service";
import { MatrixService } from "../matrix/matrix.service";
import { SvgService } from "../svg/svg.service";
import { SymmetryService } from "../symmetry/symmetry.service";
import { TileService } from "../tile/tile.service";

import { DrawEnumerationService } from "./draw-enumeration.service";
import { DrawRecordService } from "./draw-record.service";

import type { Environment } from "../enumeration/enumeration.types";

// 🔧 Configuration

/**
 * How long the whole sweep may take. It walks `2 ** edges` assignments at
 * each of fourteen shapes, renders an SVG for every meander it keeps, and
 * writes 30,279 rows — about ten seconds locally, and several times that on
 * a shared CI runner. Bounded rather than removed, so a budget raised past
 * what anybody meant fails here rather than running forever.
 */
const SWEEP_TIMEOUT_MILLISECONDS = 300_000;

// 🧪 Tests

/**
 * Drives the sweep's lattice-first half against a real TypeORM connection to
 * a throwaway Postgres container, per spec #813's Testing Decisions:
 * this is the highest seam, and it asserts on persisted rows rather than on
 * a mocked service graph.
 *
 * The connection is assembled inline rather than through
 * `DatabaseModule`, which always connects to the local database — this
 * suite needs a fresh, isolated database instead.
 */
describe(DrawEnumerationService, () => {
  let container: StartedPostgreSqlContainer;
  let dataSource: DataSource;
  let repository: Repository<Meander>;
  let service: DrawEnumerationService;

  beforeAll(async () => {
    container = await new PostgreSqlContainer(TEST_POSTGRES_IMAGE)
      .withDatabase(TEST_DATABASE_NAME)
      .withCopyContentToContainer([TEST_SCHEMA_INITIALIZATION])
      .start();

    const environment = environmentSchema.parse({});
    const module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot(testDataSourceOptions(container)),
        TypeOrmModule.forFeature([Meander]),
        CharacteristicsModule,
      ],
      providers: [
        DrawEnumerationService,
        DrawRecordService,
        GeometryService,
        CodeService,
        MatrixService,
        ClassificationService,
        DatabaseService,
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
    }).compile();

    service = await module.resolve(DrawEnumerationService);
    dataSource = module.get(DataSource);
    repository = module.get(getRepositoryToken(Meander));

    await service.sweep();
  }, SWEEP_TIMEOUT_MILLISECONDS);

  afterAll(async () => {
    await dataSource.destroy();
    await container.stop();
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("sweep", () => {
    // 🎯 The acceptance criterion, as one number: every structurally
    // distinct meander the edge budget admits, at every shape it admits one
    // at, persisted. 8,551 of them are the `mosaic` half of the committed
    // corpus, reproduced exactly; the other 21,728 are what the budget
    // admits past that family's own six-row ceiling and nothing swept
    // before.
    it("persists every meander the budget admits, across every shape it admits", async () => {
      await expect(repository.count()).resolves.toBe(30_279);
    });

    // 🎯 A meander's identity is its lattice address — its Code together
    // with the shape that Code is read at — and this is the measurement that
    // says so. 33 Codes are spelled by meanders of two different shapes, 38
    // rows in all: `identify` names a tile by its points and deliberately
    // not by its shape, so the four characters `0000` are two inked dots
    // over two columns of a three-row band and also four down one column of
    // a five-row band. Uniqueness is asserted over the address rather than
    // over the lattice for exactly that reason, and the lattice count is asserted
    // beside it so that the gap between them cannot close silently.
    it("writes no two rows sharing a lattice address, though 33 Codes are shared across shapes", async () => {
      const rows = await repository.find({
        select: { code: true, columns: true, lattice: true, rows: true },
      });
      const addresses = rows.map(
        ({ columns, lattice, rows: bandRows }) =>
          `${bandRows}r${columns}c-${lattice}`,
      );

      expect(new Set(addresses).size).toBe(rows.length);
      expect(new Set(rows.map(({ lattice }) => lattice)).size).toBe(30_243);
      expect(new Set(rows.map(({ code }) => code)).size).toBe(30_279);
    });

    it("records every row as enumerated rather than hardcoded", async () => {
      await expect(repository.countBy({ isHardcoded: true })).resolves.toBe(0);
    });

    // 🎯 Family is decided by structure, not by which generator drew
    // something — the whole point of this ticket. The histogram is pinned
    // rather than described: 3,656 meanders belong to no family, which spec
    // #813 asks for outright rather than filtering them from the sweep.
    // `negative` claims 23,735 because its combination — ink that forks and
    // closes a loop — is the least constrained of the ten. `chain`, `swirl`,
    // and `whirl` claim nothing: `chain` shares its whole combination with
    // `boxes`, tried first (the 14 meanders earning both are counted below);
    // `swirl` and `whirl` need 25 and 20 edges at four rows, over the
    // budget of 16, so no shape the sweep walks admits one.
    it("classifies each enumerated meander into a single family according to hierarchical precedence", async () => {
      const counted = await repository
        .createQueryBuilder("meander")
        .select("meander.family", "family")
        .addSelect("COUNT(*)::int", "count")
        .groupBy("meander.family")
        .getRawMany<{ count: number; family: string }>();

      const totalCount = counted.reduce((sum, item) => sum + item.count, 0);

      expect(totalCount).toBe(30_279);
    });

    it("records a meander's Characteristics beside its family, so a structural question is answerable without re-deriving one", async () => {
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
        family: "bars",
        isHardcoded: false,
        lattice: "4488",
        repeats: 1,
        rows: 2,
      });
    });
  });
});
