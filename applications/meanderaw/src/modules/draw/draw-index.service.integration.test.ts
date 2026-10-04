import { Test } from "@nestjs/testing";
import { getRepositoryToken, TypeOrmModule } from "@nestjs/typeorm";
import { DataSource, type Repository } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

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
 * Drives `DrawIndexService.build` against a real TypeORM connection to an
 * in-memory `better-sqlite3` database seeded with a small, deliberately
 * constructed set of rows, per spec #813's Testing Decisions for this seam.
 *
 * The connection is assembled inline rather than through
 * `DatabaseModule`, which always opens the one committed database
 * file — this suite needs a fresh, isolated connection instead, the same way
 * `database.service.integration.test.ts` does.
 */
describe(DrawIndexService, () => {
  let dataSource: DataSource;
  let repository: Repository<Meander>;
  let service: DrawIndexService;

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

    const pages = await service.build();

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
