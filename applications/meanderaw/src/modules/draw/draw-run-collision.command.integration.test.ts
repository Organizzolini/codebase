import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
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
} from "../../../testing/database";
import {
  DRAW_RUN_TIMEOUT_MILLISECONDS,
  type DrawRunFixture,
  drawRunFixture,
  drawRunModuleMetadata,
} from "../../../testing/draw-run";
import { meanderRecord } from "../../../testing/meanders";
import { HISTORICAL_CORPUS } from "../corpus/historical-corpus.constants";

import { DrawCodeService } from "./draw-code.service";

vi.mock("node:fs/promises", () => ({
  mkdir: vi.fn<() => Promise<void>>(),
  writeFile: vi.fn<(path: string, data: unknown) => Promise<void>>(),
}));

/** Compiles a fresh draw run, over an emptied schema in `container`, with `--code` and logging mocked out. */
async function compileDrawRun(
  container: StartedPostgreSqlContainer,
): Promise<DrawRunFixture> {
  const module = await Test.createTestingModule(
    drawRunModuleMetadata(container, [
      { provide: DrawCodeService, useValue: createMock<DrawCodeService>() },
      { provide: LoggerService, useValue: createMock<LoggerService>() },
    ]),
  ).compile();

  return drawRunFixture(module);
}

/**
 * `DrawCommand`'s draw run over a database that already commits one hardcoded
 * entry's lattice address, split from
 * `draw-run.command.integration.test.ts` only for time. This case writes
 * before it draws, so it cannot share that file's draw run over an empty
 * database; in its own file vitest runs the two draw runs in parallel rather
 * than one after the other.
 */
describe("drawCommand draw run", () => {
  let container: StartedPostgreSqlContainer;

  beforeAll(async () => {
    container = await new PostgreSqlContainer(TEST_POSTGRES_IMAGE)
      .withDatabase(TEST_DATABASE_NAME)
      .withCopyContentToContainer([TEST_SCHEMA_INITIALIZATION])
      .start();
  });

  afterAll(async () => {
    await container.stop();
  });

  describe("over a database already holding a hardcoded entry's address", () => {
    let drawRun: DrawRunFixture;

    beforeEach(async () => {
      drawRun = await compileDrawRun(container);
    });

    afterEach(async () => {
      await drawRun.dataSource.destroy();
    });

    it(
      "ignores the draw run quietly when a hardcoded entry's lattice address is already committed",
      async () => {
        const duplicated = HISTORICAL_CORPUS.find((entry) =>
          drawRun.corpus.isPreserved(entry),
        );

        if (duplicated === undefined) {
          throw new Error(
            "no hardcoded entry is committed to collide a duplicate against",
          );
        }

        await drawRun.repository.save(
          meanderRecord({
            characteristics: { bettiNumber0Count: 1, freeEndCount: 2 },
            code: `${String(duplicated.columns).padStart(2, "0")}x${String(duplicated.rows).padStart(2, "0")}y${duplicated.code}`,
            columns: duplicated.columns,
            isHardcoded: false,
            lattice: duplicated.code,
            rows: duplicated.rows,
          }),
        );

        await expect(drawRun.command.run([], {})).resolves.not.toThrow();
      },
      DRAW_RUN_TIMEOUT_MILLISECONDS,
    );
  });
});
