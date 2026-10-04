import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

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
import { MEANDER_FAMILIES } from "../classification/classification.constants";
import { HISTORICAL_CORPUS } from "../corpus/historical-corpus.constants";

import { DrawCodeService } from "./draw-code.service";

/**
 * How many of the historical corpus's entries lie beyond the sweep's reach,
 * and so are ingested rather than enumerated.
 *
 * Written down rather than computed, because the boundary is computed from
 * the edge budget and the sweep's row floor rather than hand-listed, and a
 * number written down is what catches that computation drifting. This suite
 * sweeps at `SWEEP_TEST_EDGE_BUDGET` rather than `EDGE_BUDGET`, so it is the
 * count beyond twelve edges: the 1,026 entries the retired constants files
 * held beyond sixteen, plus the 40 between the two. A pinned budget moved
 * there moves this number, and should fail here rather than pass quietly.
 */
const HISTORICAL_CORPUS_BEYOND_ENUMERATION = 1066;

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
 * Drives the whole of `DrawCommand`'s sweep — the generalized enumeration
 * and the historical corpus's hardcoded ingestion — against a real TypeORM
 * connection to a throwaway Postgres container, and asserts on the rows it
 * persists. It is spec
 * #813's highest seam for this command, and the direct successor to the
 * file-tree assertions `draw.command.unit.test.ts` made by mocking
 * `node:fs/promises` while the per-family procedural pipeline still wrote
 * one.
 *
 * The cases over a database already holding a hardcoded entry's address and
 * over an already-populated one run sweeps of their own, so they live in
 * `draw-sweep-collision.command.integration.test.ts` and
 * `draw-sweep-regeneration.command.integration.test.ts`, where vitest runs
 * them beside this file's shared sweep rather than after it.
 *
 * **This is what proves the two halves do not collide.** Both halves
 * write through the same unique index over a meander's lattice address, and
 * the enumerated half runs first, so an entry the hardcoded corpus still
 * claims inside the enumerated space fails the second insert rather than
 * quietly overwriting the first. Nothing short of running both halves for
 * real catches that: each half passes its own suite alone.
 *
 * `HISTORICAL_CORPUS` is the real, committed corpus rather than a
 * fixture — `DrawCommand.run` reads it directly rather than through an
 * overridable dependency — and the enumeration is the real budgeted walk, so
 * this drives thousands of rows through the decoder, renderer, and
 * Characteristic computation. That is real work rather than a hang, and the
 * timeout is declared rather than left to the default five seconds.
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

  /**
   * One sweep, shared by every case that only reads what an empty database
   * ends up holding. Each sweep costs 45–90 seconds on a CI runner, and
   * running it once per case made this file the whole of 🧑‍🔬 Test's critical
   * path. None of these cases writes to the database, so sharing the run
   * changes no assertion.
   */
  describe("over an empty database", () => {
    let sweep: SweepFixture;

    beforeAll(async () => {
      sweep = await compileSweep(container);
      await sweep.command.run([], {});
    }, SWEEP_TIMEOUT_MILLISECONDS);

    afterAll(async () => {
      await sweep.dataSource.destroy();
    });

    it("persists both halves of the corpus, with neither colliding with the other", async () => {
      const expectedEnumerated = sweep.enumeration
        .shapes()
        .reduce(
          (total, shape) => total + sweep.enumeration.enumerate(shape).length,
          0,
        );
      const expectedHardcoded = 999;

      await expect(
        sweep.repository.countBy({ isHardcoded: false }),
      ).resolves.toBe(expectedEnumerated);
      await expect(
        sweep.repository.countBy({ isHardcoded: true }),
      ).resolves.toBe(expectedHardcoded);
    });

    it("ingests exactly the 1066 entries beyond the pinned budget, computed from the sweep's own reach rather than listed", () => {
      expect(
        HISTORICAL_CORPUS.filter((entry) =>
          sweep.corpus.isBeyondEnumeration(entry),
        ),
      ).toHaveLength(HISTORICAL_CORPUS_BEYOND_ENUMERATION);
    });

    it("keeps every ingested entry outside the shapes the enumeration already covers", () => {
      const swept = new Set(
        sweep.enumeration
          .shapes()
          .map((shape) => `${shape.rows}x${shape.columns}`),
      );
      const covered = HISTORICAL_CORPUS.filter(
        (entry) =>
          sweep.corpus.isBeyondEnumeration(entry) &&
          swept.has(`${entry.rows}x${entry.columns}`),
      );

      expect(covered).toStrictEqual([]);
    });

    it("carries the family it was filed under, and isHardcoded, on every ingested corpus entry", async () => {
      const rows = await sweep.repository.findBy({ isHardcoded: true });

      const filed = new Set<string>(MEANDER_FAMILIES);

      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((row) => filed.has(row.family))).toBe(true);
    });
  });
});
