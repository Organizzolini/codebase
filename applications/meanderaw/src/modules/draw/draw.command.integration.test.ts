import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { getRepositoryToken, TypeOrmModule } from "@nestjs/typeorm";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { DataSource, type Repository } from "typeorm";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { LoggerService } from "@codebase/logger";

import {
  TEST_DATABASE_NAME,
  TEST_POSTGRES_IMAGE,
  TEST_SCHEMA_INITIALIZATION,
  testDataSourceOptions,
} from "../../../testing/database";
import { CharacteristicsModule } from "../characteristics/characteristics.module";
import { ClassificationModule } from "../classification/classification.module";
import { CodeModule } from "../code/code.module";
import { CorpusService } from "../corpus/corpus.service";
import { DatabaseService } from "../database/database.service";
import { Meander } from "../database/entities/Meander.entity";
import { DrawingModule } from "../drawing/drawing.module";
import { GeometryService } from "../geometry/geometry.service";
import { GraphService } from "../graph/graph.service";
import { MatrixModule } from "../matrix/matrix.module";
import { SvgService } from "../svg/svg.service";
import { TileService } from "../tile/tile.service";

import { DrawCodeService } from "./draw-code.service";
import { DrawEnumerationService } from "./draw-enumeration.service";
import { DrawRecordService } from "./draw-record.service";
import { DrawCommand } from "./draw.command";

/**
 * Drives `DrawCommand`'s `--code` mode against a real TypeORM connection to
 * a throwaway Postgres container, per spec #813's Testing
 * Decisions: this is the highest seam for the CLI's new single-drawing
 * path, and it asserts on persisted rows rather than on a mocked service
 * graph.
 *
 * The connection is assembled inline rather than through
 * `DatabaseModule`, which always connects to the local database — this
 * suite needs a fresh, emptied schema per test instead.
 */
describe("drawCommand --code mode", () => {
  let command: DrawCommand;
  let container: StartedPostgreSqlContainer;
  let dataSource: DataSource;
  let repository: Repository<Meander>;

  beforeAll(async () => {
    container = await new PostgreSqlContainer(TEST_POSTGRES_IMAGE)
      .withDatabase(TEST_DATABASE_NAME)
      .withCopyContentToContainer([TEST_SCHEMA_INITIALIZATION])
      .start();
  });

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot(testDataSourceOptions(container)),
        TypeOrmModule.forFeature([Meander]),
        CharacteristicsModule,
        ClassificationModule,
        CodeModule,
        DrawingModule,
        MatrixModule,
      ],
      providers: [
        DrawCommand,
        DrawCodeService,
        DrawRecordService,
        GeometryService,
        DatabaseService,
        GraphService,
        TileService,
        SvgService,
        {
          provide: DrawEnumerationService,
          useValue: createMock<DrawEnumerationService>(),
        },
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: CorpusService,
          useValue: createMock<CorpusService>({
            ingest: vi.fn<() => Promise<Meander[]>>().mockResolvedValue([]),
          }),
        },
      ],
    }).compile();

    command = await module.resolve(DrawCommand);
    dataSource = module.get(DataSource);
    repository = module.get(getRepositoryToken(Meander));
  });

  afterEach(async () => {
    await dataSource.destroy();
  });

  afterAll(async () => {
    await container.stop();
  });

  it("writes exactly one row, decoded and rendered by the generic pipeline", async () => {
    await command.run([], {
      code: "3c9a",
      columns: 2,
      rows: 2,
    });

    const rows = await repository.find();

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      code: "02x02y3c9a",
      columns: 2,
      isHardcoded: true,
      lattice: "3c9a",
      repeats: 1,
      rows: 2,
    });
    expect(rows[0]?.characteristics).not.toHaveProperty("crossCount");
    expect(rows[0]?.characteristics).not.toHaveProperty("forkCount");
    expect(rows[0]).not.toHaveProperty("pitch");
  });

  it("writes a self-contained formatted code directly without requiring --rows and --columns", async () => {
    await command.run([], {
      code: "02x02y3c9a",
    });

    const rows = await repository.find();

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      code: "02x02y3c9a",
      columns: 2,
      lattice: "3c9a",
      repeats: 1,
      rows: 2,
    });
  });

  it("populates a row's Characteristics from its Code, for a code with a three-armed ink junction", async () => {
    await command.run([], {
      code: "e",
      columns: 1,
      rows: 1,
    });

    const rows = await repository.find();

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      characteristics: { forkCount: 1 },
      code: "01x01ye",
      lattice: "e",
      repeats: 1,
    });
    expect(rows[0]?.characteristics).not.toHaveProperty("crossCount");
  });

  it("refuses a --code drawing missing --columns", async () => {
    await expect(
      command.run([], {
        code: "0",
        rows: 2,
      }),
    ).rejects.toThrow(/needs both --rows and --columns/);

    await expect(repository.find()).resolves.toHaveLength(0);
  });

  it("refuses a --code drawing missing --rows", async () => {
    await expect(
      command.run([], {
        code: "0",
        columns: 1,
      }),
    ).rejects.toThrow(/needs both --rows and --columns/);

    await expect(repository.find()).resolves.toHaveLength(0);
  });

  it("passes --code through parseCode unchanged", () => {
    expect(command.parseCode("3c9a")).toBe("3c9a");
  });

  it("parses --columns as an integer", () => {
    expect(command.parseColumns("2")).toBe(2);
  });
});
