/**
 * The edge budget every whole-draw-run suite runs at, pinned below the
 * application's own default.
 *
 * The default sets the size of the corpus a draw run writes, and at
 * twenty-four that is millions of rows and minutes of work — a size a suite
 * cannot pay
 * per run. These suites assert how a draw run behaves rather than how large the
 * committed one is, so they pin twelve, which still walks every code path:
 * nine shapes, 2,079 enumerated meanders, and the hardcoded corpus beyond
 * them. Below twelve the hardcoded corpus, about a thousand entries ingested
 * one by one, is most of a draw run's cost, so pinning lower buys little.
 * Overriding the environment rather than reading it keeps a developer's own
 * `DRAW_EDGE_BUDGET` from resizing what the suites assert.
 *
 * It lives in a file importing nothing so a suite can read it inside
 * `vi.hoisted`, before any module whose `ConfigModule.forRoot` validates the
 * environment at import time has loaded.
 */
export const DRAW_TEST_EDGE_BUDGET = 12;

/**
 * How many worker threads every whole-draw-run suite draws with: none, so
 * each draws in-process.
 *
 * At the pinned budget a draw run is a couple of thousand meanders, which one
 * thread draws in about a second — less than booting a pool of threads
 * costs, and vitest already runs the suites side by side. Drawing across
 * real threads is asserted once, in `draw-pool.service.integration.test.ts`.
 */
export const DRAW_TEST_WORKERS = 0;
