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
  SWEEP_TIMEOUT_MILLISECONDS,
  type SweepFixture,
  sweepFixture,
  sweepModuleMetadata,
} from "../../../testing/draw-sweep";
import { meanderRecord } from "../../../testing/meanders";
import { HISTORICAL_CORPUS } from "../corpus/historical-corpus.constants";

import { DrawCodeService } from "./draw-code.service";

vi.mock("node:fs/promises", () => ({
  mkdir: vi.fn<() => Promise<void>>(),
  writeFile: vi.fn<(path: string, data: unknown) => Promise<void>>(),
}));

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
 * `DrawCommand`'s sweep over a database that already commits one hardcoded
 * entry's lattice address, split from
 * `draw-sweep.command.integration.test.ts` only for time. This case writes
 * before it sweeps, so it cannot share that file's sweep over an empty
 * database; in its own file vitest runs the two sweeps in parallel rather
 * than one after the other.
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

  describe("over a database already holding a hardcoded entry's address", () => {
    let sweep: SweepFixture;

    beforeEach(async () => {
      sweep = await compileSweep(container);
    });

    afterEach(async () => {
      await sweep.dataSource.destroy();
    });

    it(
      "ignores the sweep quietly when a hardcoded entry's lattice address is already committed",
      async () => {
        const duplicated = HISTORICAL_CORPUS.find((entry) =>
          sweep.corpus.isPreserved(entry),
        );

        if (duplicated === undefined) {
          throw new Error(
            "no hardcoded entry is committed to collide a duplicate against",
          );
        }

        await sweep.repository.save(
          meanderRecord({
            characteristics: { bettiNumber0Count: 1, freeEndCount: 2 },
            code: `${String(duplicated.columns).padStart(2, "0")}x${String(duplicated.rows).padStart(2, "0")}y${duplicated.code}`,
            columns: duplicated.columns,
            isHardcoded: false,
            lattice: duplicated.code,
            rows: duplicated.rows,
          }),
        );

        await expect(sweep.command.run([], {})).resolves.not.toThrow();
      },
      SWEEP_TIMEOUT_MILLISECONDS,
    );
  });
});
