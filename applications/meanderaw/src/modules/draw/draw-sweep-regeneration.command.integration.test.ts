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
} from "vitest";

import { LoggerService } from "@codebase/logger";

import {
  TEST_DATABASE_NAME,
  TEST_POSTGRES_IMAGE,
  TEST_SCHEMA_INITIALIZATION,
} from "../../../testing/database";
import {
  SWEEP_TIMEOUT_MILLISECONDS,
  type SweepFixture,
  sweepFixture,
  sweepModuleMetadata,
} from "../../../testing/draw-sweep";

import { DrawCodeService } from "./draw-code.service";

/** Compiles a fresh sweep, over an emptied schema in `container`, with `--code` and logging mocked out. */
async function compileSweep(
  container: StartedPostgreSqlContainer,
): Promise<SweepFixture> {
  const module = await Test.createTestingModule(
    sweepModuleMetadata(container, [
      { provide: DrawCodeService, useValue: createMock<DrawCodeService>() },
      { provide: LoggerService, useValue: createMock<LoggerService>() },
    ]),
  ).compile();

  return sweepFixture(module);
}

/**
 * `DrawCommand`'s sweep over a database an earlier sweep already
 * filled, split from `draw-sweep.command.integration.test.ts` only for time.
 * This case sweeps twice and compares the rows, so it cannot share that
 * file's sweep over an empty database; in its own file vitest runs it in
 * parallel rather than after it.
 */
describe("drawCommand sweep mode", () => {
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
    let sweep: SweepFixture;

    beforeEach(async () => {
      sweep = await compileSweep(container);
    });

    afterEach(async () => {
      await sweep.dataSource.destroy();
    });

    it(
      "regenerates an already-populated database into exactly the rows a fresh sweep writes, each under a new id",
      async () => {
        await sweep.command.run([], {});

        const fresh = await sweep.repository.find({ order: { code: "ASC" } });

        await expect(sweep.command.run([], {})).resolves.not.toThrow();

        const regenerated = await sweep.repository.find({
          order: { code: "ASC" },
        });

        expect(regenerated).toHaveLength(fresh.length);
        expect(regenerated.map(({ id: _id, ...row }) => row)).toStrictEqual(
          fresh.map(({ id: _id, ...row }) => row),
        );
      },
      SWEEP_TIMEOUT_MILLISECONDS,
    );
  });
});
