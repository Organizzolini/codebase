import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

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

const { writes } = vi.hoisted(() => ({ writes: new Map<string, string>() }));

/**
 * The page writes stay off disk, and each page's pieces are read into the
 * one string it would have written, so a case can assert on what a sweep
 * writes without a sweep writing a real file.
 */
vi.mock("node:fs/promises", () => ({
  mkdir: vi.fn<() => Promise<void>>(),
  writeFile: vi.fn<
    (path: string, data: AsyncIterable<string>) => Promise<void>
  >(async (path, data) => {
    let page = "";

    for await (const piece of data) {
      page += piece;
    }

    writes.set(path, page);
  }),
}));

/**
 * How many of the historical corpus's entries are preserved as hardcoded
 * rows: those past the sixteen edges the corpus was extracted against, or
 * shallower than the sweep's row floor.
 *
 * Written down rather than computed, because the boundary is computed from
 * `HISTORICAL_CORPUS_EDGE_BUDGET` and the row floor rather than hand-listed,
 * and a number written down is what catches that computation drifting. It
 * is exactly the number of entries the retired constants files held, and it
 * does not move with `SWEEP_TEST_EDGE_BUDGET` or `EDGE_BUDGET`: raising the
 * sweep's budget never drops a hardcoded meander.
 */
const HISTORICAL_CORPUS_PRESERVED = 1026;

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
 * write through the same unique index over a meander's lattice address.
 * The hardcoded half is ingested first and the sweep skips any Code it
 * already holds, so a collision across the halves resolves to the
 * hardcoded row, while one within either half still fails its insert.
 * Nothing short of running both halves for real catches a collision: each
 * half passes its own suite alone.
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
      const expectedHardcoded = 963;

      await expect(
        sweep.repository.countBy({ isHardcoded: false }),
      ).resolves.toBe(expectedEnumerated);
      await expect(
        sweep.repository.countBy({ isHardcoded: true }),
      ).resolves.toBe(expectedHardcoded);
    });

    it("rebuilds output/index.html and a page per family from the sweep's own rows once both halves have committed", async () => {
      const total = await sweep.repository.count();

      expect(writes.get("output/index.html")).toContain(
        `${total} meanders across`,
      );
      expect(writes.get("output/families/unclassified.html")).toContain(
        '<section id="unclassified">',
      );
    });

    it("preserves exactly the 1026 entries the retired constants files held, whatever the sweep's budget", () => {
      expect(
        HISTORICAL_CORPUS.filter((entry) => sweep.corpus.isPreserved(entry)),
      ).toHaveLength(HISTORICAL_CORPUS_PRESERVED);
    });

    it("carries the family it was filed under, and isHardcoded, on every ingested corpus entry", async () => {
      const rows = await sweep.repository.findBy({ isHardcoded: true });

      const filed = new Set<string>(MEANDER_FAMILIES);

      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((row) => filed.has(row.family))).toBe(true);
    });
  });
});
