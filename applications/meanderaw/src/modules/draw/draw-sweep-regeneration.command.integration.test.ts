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
 * `DrawCommand`'s sweep over a database an earlier sweep already
 * filled, split from `draw-sweep.command.integration.test.ts` only for time.
 * This case sweeps twice and compares the rows, so it cannot share that
 * file's sweep over an empty database; in its own file vitest runs it in
 * parallel rather than after it. `node:fs/promises` stays mocked for the same
 * reason it is there: the committed `output/index.html` is not disposable.
 */
describe("drawCommand sweep mode", () => {
  describe("over an already-populated database", () => {
    let sweep: SweepFixture;

    beforeEach(async () => {
      sweep = await compileSweep();
    });

    afterEach(async () => {
      await sweep.dataSource.destroy();
    });

    it(
      "regenerates an already-populated database into exactly the rows a fresh sweep writes",
      async () => {
        await sweep.command.run([], {});

        const fresh = await sweep.repository.find({ order: { id: "ASC" } });

        await expect(sweep.command.run([], {})).resolves.not.toThrow();

        const regenerated = await sweep.repository.find({
          order: { id: "ASC" },
        });

        expect(regenerated).toHaveLength(fresh.length);
        expect(regenerated).toStrictEqual(fresh);
      },
      SWEEP_TIMEOUT_MILLISECONDS,
    );
  });
});
