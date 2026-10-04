import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logging";

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
  writeFile: vi.fn<(path: string, data: string) => Promise<void>>(),
}));

/** Compiles a fresh sweep with `--code` and logging mocked out. */
async function compileSweep(): Promise<SweepFixture> {
  const module = await Test.createTestingModule(
    sweepModuleMetadata([
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
 * than one after the other. `node:fs/promises` stays mocked for the same
 * reason it is there: the committed `output/index.html` is not disposable.
 */
describe("drawCommand sweep mode", () => {
  describe("over a database already holding a hardcoded entry's address", () => {
    let sweep: SweepFixture;

    beforeEach(async () => {
      sweep = await compileSweep();
    });

    afterEach(async () => {
      await sweep.dataSource.destroy();
    });

    it(
      "ignores the sweep quietly when a hardcoded entry's lattice address is already committed",
      async () => {
        const duplicated = HISTORICAL_CORPUS.find((entry) =>
          sweep.corpus.isBeyondEnumeration(entry),
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
