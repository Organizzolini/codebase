import { afterEach, beforeEach, expect, vi } from "vitest";

import type { MockInstance } from "vitest";

/**
 * Default test date used across time-sensitive tests.
 */
export const DEFAULT_TEST_DATE = new Date("2025-03-20T14:46:00Z");

/** Shape of a directory entry returned by readdirSync in tests. */
export interface DirectoryEntry {
  isDirectory: () => boolean;
  name: string;
}

/**
 * Asserts that invoking the provided action exits the process with code 1.
 */
export async function expectProcessExitOne(
  action: () => Promise<void> | void,
): Promise<void> {
  const processExitSpy = mockProcessExit();

  await expect(Promise.resolve().then(action)).rejects.toThrow(
    "process.exit:1",
  );

  processExitSpy.mockRestore();
}

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

/**
 * Mocks process.exit by throwing an Error with the exit code.
 * Useful for command tests that assert exit behavior.
 */
export function mockProcessExit(): MockInstance<typeof process.exit> {
  return vi
    .spyOn(process, "exit")
    .mockImplementation((code?: null | number | string): never => {
      throw new Error(`process.exit:${code ?? 0}`);
    });
}
