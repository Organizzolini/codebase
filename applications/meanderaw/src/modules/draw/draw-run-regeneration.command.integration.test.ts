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
 * `DrawCommand`'s draw run over a database an earlier draw run already
 * filled, split from `draw-run.command.integration.test.ts` only for time.
 * This case draws twice and compares the rows, so it cannot share that
 * file's draw run over an empty database; in its own file vitest runs it in
 * parallel rather than after it.
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

  describe("over an already-populated database", () => {
    let drawRun: DrawRunFixture;

    beforeEach(async () => {
      drawRun = await compileDrawRun(container);
    });

    afterEach(async () => {
      await drawRun.dataSource.destroy();
    });

    it(
      "regenerates an already-populated database into exactly the rows a fresh draw run writes, each under a new id",
      async () => {
        await drawRun.command.run([], {});

        const fresh = await drawRun.repository.find({ order: { code: "ASC" } });

        await expect(drawRun.command.run([], {})).resolves.not.toThrow();

        const regenerated = await drawRun.repository.find({
          order: { code: "ASC" },
        });

        expect(regenerated).toHaveLength(fresh.length);
        expect(regenerated.map(({ id: _id, ...row }) => row)).toStrictEqual(
          fresh.map(({ id: _id, ...row }) => row),
        );
      },
      DRAW_RUN_TIMEOUT_MILLISECONDS,
    );
  });
});
