import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  type DatabaseTestingModule,
  startDatabaseTestingModule,
} from "@codebase/database/testing";

import { meanderRecord } from "../../../testing/meanders";
import { CodeService } from "../code/code.service";
import { DrawingService } from "../drawing/drawing.service";
import { GeometryService } from "../geometry/geometry.service";
import { Meander } from "../meanderaw-database/entities/meander.entity";
import { MeanderawDatabaseModule } from "../meanderaw-database/meanderaw-database.module";
import { Migration1791160950069 } from "../meanderaw-database/migrations/1791160950069-migration";
import { Migration1791414023001 } from "../meanderaw-database/migrations/1791414023001-migration";
import { SvgService } from "../svg/svg.service";
import { SymmetryService } from "../symmetry/symmetry.service";
import { TileService } from "../tile/tile.service";

import { DrawIndexService } from "./draw-index.service";

import type { MeanderRecord } from "../meanderaw-database/meanderaw-database.types";
import type { Repository } from "typeorm";

/**
 * Drives `DrawIndexService.build` against a real TypeORM connection to a
 * throwaway Postgres container seeded with a small, deliberately
 * constructed set of rows, per spec #813's Testing Decisions for this seam.
 *
 * The module is booted by `startDatabaseTestingModule`, which points
 * `MeanderawDatabaseModule` at a fresh, isolated database instead of the
 * local one, the same way `meanderaw-database.service.integration.test.ts`
 * does.
 */
describe(DrawIndexService, () => {
  let database: DatabaseTestingModule;
  let repository: Repository<Meander>;
  let service: DrawIndexService;

  beforeAll(async () => {
    database = await startDatabaseTestingModule({
      database: MeanderawDatabaseModule,
      entities: [Meander],
      migrations: [Migration1791160950069, Migration1791414023001],
      project: "meanderaw",
      providers: [
        DrawIndexService,
        CodeService,
        DrawingService,
        GeometryService,
        SymmetryService,
        SvgService,
        TileService,
      ],
    });

    service = await database.module.resolve(DrawIndexService);
    repository = database.repository(Meander);
  });

  afterAll(async () => {
    await database.close();
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
