/**
 * Common mock pattern documentation for event tests.
 *
 * IMPORTANT: These mocks CANNOT be imported as helper functions due to Vitest's hoisting requirements.
 * Vitest hoists all vi.mock() calls to the top of the file before any imports are executed.
 *
 * Instead, copy these patterns directly in your test files:
 *
 * For event tests that write to database and filesystem:.
 * ```ts
 * vi.mock("../../database.utilities", () => ({
 *   upsertEvents: vi.fn(),
 * }));
 *
 * vi.mock("fs", () => ({
 *   default: {
 *     writeFileSync: vi.fn(),
 *   },
 * }));
 * ```
 *
 * Used in:
 * - All event generation tests (aspects, phases, ingresses, eclipses, etc.)
 * - Tests that call writeMajorAspectEvents, writePhaseEvents, etc.
 */

import { afterEach, beforeEach, vi } from "vitest";

export const MOCK_PATTERNS = {
  databaseUtilities: `vi.mock("../../database.utilities", () => ({
  upsertEvents: vi.fn(),
}));`,

  fileSystem: `vi.mock("fs", () => ({
  default: {
    writeFileSync: vi.fn(),
  },
}));`,
};

/**
 * Default test date used across time-sensitive tests.
 */
export const DEFAULT_TEST_DATE = new Date("2025-03-20T14:46:00Z");

/**
 * Sets up fake timers with a fixed system time before each test
 * and restores real timers after each test.
 *
 * Usage in test files:
 * ```ts
 * import { mockDates } from '../testing/mocks'
 *
 * describe('my suite', () => {
 *   mockDates()
 *   // your tests here
 * })
 * ```
 */
export function mockDates(date: Date = DEFAULT_TEST_DATE): void {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(date);
  });

  afterEach(() => {
    vi.useRealTimers();
  });
}
