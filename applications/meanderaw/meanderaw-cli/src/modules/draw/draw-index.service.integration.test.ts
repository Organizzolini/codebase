import { Test } from "@nestjs/testing";
import { getRepositoryToken, TypeOrmModule } from "@nestjs/typeorm";
import { DataSource, type Repository } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { postgresDataSourceOptions } from "@codebase/database";
import {
  type StartedPostgresContainer,
  startPostgresContainer,
} from "@codebase/database/testing";

import { meanderRecord } from "../../../testing/meanders";
import { CodeService } from "../code/code.service";
import { DrawingService } from "../drawing/drawing.service";
import { GeometryService } from "../geometry/geometry.service";
import { Meander } from "../meanderaw-database/entities/meander.entity";
import { MeanderawDatabaseService } from "../meanderaw-database/meanderaw-database.service";
import { SvgService } from "../svg/svg.service";
import { SymmetryService } from "../symmetry/symmetry.service";
import { TileService } from "../tile/tile.service";

import { DrawIndexService } from "./draw-index.service";

import type { MeanderRecord } from "../meanderaw-database/meanderaw-database.types";

/**
 * Drives `DrawIndexService.build` against a real TypeORM connection to a
 * throwaway Postgres container seeded with a small, deliberately
 * constructed set of rows, per spec #813's Testing Decisions for this seam.
 *
 * The connection is assembled inline rather than through
 * `MeanderawDatabaseModule`, which always connects to the local database — this
 * suite needs a fresh, isolated database instead, the same way
 * `database.service.integration.test.ts` does.
 */
describe(DrawIndexService, () => {
  let container: StartedPostgresContainer;
  let dataSource: DataSource;
  let repository: Repository<Meander>;
  let service: DrawIndexService;

  beforeAll(async () => {
    container = await startPostgresContainer({
      migrations: [],
      project: "meanderaw",
    });

    const module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot(
          postgresDataSourceOptions(container.connection, {
            entities: [Meander],
            migrations: [],
          }),
        ),
        TypeOrmModule.forFeature([Meander]),
      ],
      providers: [
        DrawIndexService,
        CodeService,
        DrawingService,
        GeometryService,
        MeanderawDatabaseService,
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

  it("builds pages from the committed rows, grouped by family with a section for the unclassified ones", async () => {
    await repository.save(
      record({
        code: "01x01y0",
        family: "snake",
        lattice: "0",
      }),
    );
    await repository.save(
      record({
        characteristics: { isDots: true },
        code: "01x01y1",
        family: "whirl",
        lattice: "1",
      }),
    );
    await repository.save(
      record({ code: "01x01y2", family: "unclassified", lattice: "2" }),
    );

    const built = await service.build();
    const pages: Record<string, string> = {};

    for (const [path, content] of Object.entries(built)) {
      pages[path] = "";

      for await (const piece of content) {
        pages[path] += piece;
      }
    }

    expect(pages["families/snake.html"]).toContain('<section id="snake">');
    expect(pages["families/whirl.html"]).toContain('<section id="whirl">');
    expect(pages["families/unclassified.html"]).toContain(
      '<section id="unclassified">',
    );
    expect(pages["families/snake.html"]).toContain(
      "<figcaption>1×1 · 01x01y0</figcaption>",
    );
    expect(pages["families/whirl.html"]).toContain("(isDots)");

    const indexPage = pages["index.html"] ?? "";

    expect(indexPage.indexOf("snake.html")).toBeLessThan(
      indexPage.indexOf("whirl.html"),
    );
    expect(indexPage.indexOf("whirl.html")).toBeLessThan(
      indexPage.indexOf("unclassified.html"),
    );
    expect(pages["families/snake.html"]).toContain('<path d="M7.5 37.5H7.5"');
  });
});
