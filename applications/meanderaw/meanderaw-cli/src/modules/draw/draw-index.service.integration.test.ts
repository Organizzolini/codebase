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
import { meanderRecord } from "../../../testing/meanders";
import { CodeService } from "../code/code.service";
import { DatabaseService } from "../database/database.service";
import { Meander } from "../database/entities/Meander.entity";
import { DrawingService } from "../drawing/drawing.service";
import { GeometryService } from "../geometry/geometry.service";
import { SvgService } from "../svg/svg.service";
import { SymmetryService } from "../symmetry/symmetry.service";
import { TileService } from "../tile/tile.service";

import { DrawIndexService } from "./draw-index.service";

import type { MeanderRecord } from "../database/database.types";

/**
 * Drives `DrawIndexService.build` against a real TypeORM connection to a
 * throwaway Postgres container seeded with a small, deliberately
 * constructed set of rows, per spec #813's Testing Decisions for this seam.
 *
 * The connection is assembled inline rather than through
 * `DatabaseModule`, which always connects to the local database — this
 * suite needs a fresh, isolated database instead, the same way
 * `database.service.integration.test.ts` does.
 */
describe(DrawIndexService, () => {
  let container: StartedPostgreSqlContainer;
  let dataSource: DataSource;
  let repository: Repository<Meander>;
  let service: DrawIndexService;

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
      providers: [
        DrawIndexService,
        CodeService,
        DrawingService,
        GeometryService,
        DatabaseService,
        SymmetryService,
        SvgService,
        TileService,
      ],
    }).compile();

    service = await module.resolve(DrawIndexService);
    dataSource = module.get(DataSource);
    repository = module.get(getRepositoryToken(Meander));
  });

  afterAll(async () => {
    await dataSource.destroy();
    await container.stop();
  });

  /** Every field besides `code` a fixture row does not care about, defaulted so a case only spells out what it means to test. */
  const record = (
    overrides: Partial<MeanderRecord> & Pick<MeanderRecord, "code">,
  ): MeanderRecord => meanderRecord({ rows: 1, ...overrides });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("builds one page per held pattern from the committed rows, and an index linking them", async () => {
    await repository.save(
      record({
        characteristics: { isSnake: true },
        code: "01x01y0",
        lattice: "0",
      }),
    );
    await repository.save(
      record({
        characteristics: { isDots: true, isWhirl: true },
        code: "01x01y1",
        lattice: "1",
      }),
    );
    await repository.save(record({ code: "01x01y2", lattice: "2" }));

    const built = await service.build();
    const pages: Record<string, string> = {};

    for (const [path, content] of Object.entries(built)) {
      pages[path] = "";

      for await (const piece of content) {
        pages[path] += piece;
      }
    }

    expect(Object.keys(pages).toSorted()).toStrictEqual([
      "index.html",
      "patterns/isDots.html",
      "patterns/isSnake.html",
      "patterns/isWhirl.html",
    ]);
    expect(pages["patterns/isSnake.html"]).toContain('<section id="isSnake">');
    expect(pages["patterns/isSnake.html"]).toContain(
      "<figcaption>1×1 · 01x01y0 (isSnake)</figcaption>",
    );
    expect(pages["patterns/isDots.html"]).toContain("01x01y1");
    expect(pages["patterns/isWhirl.html"]).toContain("01x01y1");
    expect(pages["patterns/isWhirl.html"]).toContain("(isDots, isWhirl)");
    expect(Object.values(pages).join("")).not.toContain("01x01y2");

    const indexPage = pages["index.html"] ?? "";

    expect(indexPage).toContain(
      '<a href="patterns/isSnake.html">isSnake</a> <span>1</span>',
    );
    expect(indexPage.indexOf("isDots.html")).toBeLessThan(
      indexPage.indexOf("isSnake.html"),
    );
    expect(indexPage.indexOf("isSnake.html")).toBeLessThan(
      indexPage.indexOf("isWhirl.html"),
    );
    expect(pages["patterns/isSnake.html"]).toContain('<path d="M7.5 37.5H7.5"');
  });
});
