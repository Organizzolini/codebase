import { createMock } from "@golevelup/ts-vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logging";

import {
  DRAW_RUN_TIMEOUT_MILLISECONDS,
  type DrawRunFixture,
  startDrawRun,
} from "../../../testing/draw-run";

import { DrawCodeService } from "./draw-code.service";

import type { Meander } from "../meanderaw-database/entities/meander.entity";

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

/** A row without the columns the database assigns on each insert, so two draw runs' rows compare by what they describe. */
function withoutRowIdentity({
  createdAt: _createdAt,
  id: _id,
  updatedAt: _updatedAt,
  ...row
}: Meander): Omit<Meander, "createdAt" | "id" | "updatedAt"> {
  return row;
}

/**
 * `DrawCommand`'s draw run over a database an earlier draw run already
 * filled, split from `draw-run.command.integration.test.ts` only for time.
 * This case draws twice and compares the rows, so it cannot share that
 * file's draw run over an empty database; in its own file vitest runs it in
 * parallel rather than after it.
 */
describe("drawCommand draw run", () => {
  describe("over an already-populated database", () => {
    let drawRun: DrawRunFixture;

    beforeEach(async () => {
      drawRun = await startMockedDrawRun();
    });

    afterEach(async () => {
      await drawRun.close();
    });

    it(
      "regenerates an already-populated database into exactly the rows a fresh draw run writes, each under a new id and timestamp",
      async () => {
        await drawRun.command.run([], {});

        const fresh = await drawRun.repository.find({ order: { code: "ASC" } });

        await expect(drawRun.command.run([], {})).resolves.not.toThrow();

        const regenerated = await drawRun.repository.find({
          order: { code: "ASC" },
        });

        expect(regenerated).toHaveLength(fresh.length);
        expect(regenerated.map((row) => withoutRowIdentity(row))).toStrictEqual(
          fresh.map((row) => withoutRowIdentity(row)),
        );
      },
      DRAW_RUN_TIMEOUT_MILLISECONDS,
    );
  });
});
