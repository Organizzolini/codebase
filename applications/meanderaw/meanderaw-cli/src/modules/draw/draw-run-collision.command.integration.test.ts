import { createMock } from "@golevelup/ts-vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logging";

import {
  DRAW_RUN_TIMEOUT_MILLISECONDS,
  type DrawRunFixture,
  startDrawRun,
} from "../../../testing/draw-run";
import { meanderRecord } from "../../../testing/meanders";
import { HISTORICAL_CORPUS } from "../corpus/historical-corpus.constants";

import { DrawCodeService } from "./draw-code.service";

vi.mock("node:fs/promises", () => ({
  mkdir: vi.fn<() => Promise<void>>(),
  writeFile: vi.fn<(path: string, data: unknown) => Promise<void>>(),
}));

/** Starts a fresh draw run over an emptied `meanders` table, with `--code` and logging mocked out. */
async function startMockedDrawRun(): Promise<DrawRunFixture> {
  return startDrawRun([
    { provide: DrawCodeService, useValue: createMock<DrawCodeService>() },
    { provide: LoggerService, useValue: createMock<LoggerService>() },
  ]);
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
  describe("over a database already holding a hardcoded entry's address", () => {
    let drawRun: DrawRunFixture;

    beforeEach(async () => {
      drawRun = await startMockedDrawRun();
    });

    afterEach(async () => {
      await drawRun.close();
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
