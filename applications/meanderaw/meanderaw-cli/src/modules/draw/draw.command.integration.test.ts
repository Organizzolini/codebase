import { createMock } from "@golevelup/ts-vitest";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  type DatabaseTestingModule,
  startDatabaseTestingModule,
} from "@codebase/database/testing";
import { LoggerService } from "@codebase/logging";

import { CharacteristicsModule } from "../characteristics/characteristics.module";
import { ClassificationModule } from "../classification/classification.module";
import { CodeModule } from "../code/code.module";
import { CorpusService } from "../corpus/corpus.service";
import { DrawingModule } from "../drawing/drawing.module";
import { GeometryService } from "../geometry/geometry.service";
import { GraphService } from "../graph/graph.service";
import { MatrixModule } from "../matrix/matrix.module";
import { Meander } from "../meanderaw-database/entities/meander.entity";
import { MeanderawDatabaseModule } from "../meanderaw-database/meanderaw-database.module";
import { Migration1791160950069 } from "../meanderaw-database/migrations/1791160950069-migration";
import { SvgService } from "../svg/svg.service";
import { TileService } from "../tile/tile.service";

import { DrawCodeService } from "./draw-code.service";
import { DrawEnumerationService } from "./draw-enumeration.service";
import { DrawIndexService } from "./draw-index.service";
import { DrawRecordService } from "./draw-record.service";
import { DrawCommand } from "./draw.command";

import type { Repository } from "typeorm";

/**
 * Drives `DrawCommand`'s `--code` mode against a real TypeORM connection to
 * a throwaway Postgres container, per spec #813's Testing
 * Decisions: this is the highest seam for the CLI's new single-drawing
 * path, and it asserts on persisted rows rather than on a mocked service
 * graph.
 *
 * The module is booted by `startDatabaseTestingModule`, which points
 * `MeanderawDatabaseModule` at a fresh, migrated schema instead of the
 * local database.
 */
describe("drawCommand --code mode", () => {
  let command: DrawCommand;
  let database: DatabaseTestingModule;
  let repository: Repository<Meander>;

  beforeAll(async () => {
    database = await startDatabaseTestingModule({
      database: MeanderawDatabaseModule,
      entities: [Meander],
      imports: [
        CharacteristicsModule,
        ClassificationModule,
        CodeModule,
        DrawingModule,
        MatrixModule,
      ],
      migrations: [Migration1791160950069],
      project: "meanderaw",
      providers: [
        DrawCommand,
        DrawCodeService,
        DrawRecordService,
        GeometryService,
        GraphService,
        TileService,
        SvgService,
        {
          provide: DrawEnumerationService,
          useValue: createMock<DrawEnumerationService>(),
        },
        {
          provide: DrawIndexService,
          useValue: createMock<DrawIndexService>(),
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
    });

    command = await database.module.resolve(DrawCommand);
    repository = database.repository(Meander);
  });

  beforeEach(async () => {
    // The migrated schema persists across the cases one container serves,
    // so each case starts from an empty table.
    await repository.clear();
  });

  afterAll(async () => {
    await database.close();
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
