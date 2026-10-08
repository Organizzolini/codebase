import { createMock } from "@golevelup/ts-vitest";
import { afterEach, beforeEach, vi } from "vitest";

import type { DiscoveredCallable } from "../src/modules/callables/callables.types";
import type { CallableNode, SourceLocation } from "@callidescope/core";

/**
 * Default test date used across time-sensitive tests.
 */
export const DEFAULT_TEST_DATE = new Date("2025-03-20T14:46:00Z");

/**
 * Builds a callable node with every field populated.
 *
 * Tests that only care about one field still get a whole node, so adding a
 * field to `CallableNode` does not break every test that builds one.
 */
export function buildCallableNode(
  overrides: Partial<CallableNode> = {},
): CallableNode {
  const location = overrides.location ?? buildSourceLocation();

  return {
    displayName: "ExampleService.example",
    enclosingTypeName: "ExampleService",
    id: `${location.filePath}#0`,
    isExported: true,
    kind: "method",
    location,
    memberName: "example",
    projectName: "example",
    statementCount: 1,
    ...overrides,
  };
}

/**
 * Builds a discovered callable for tests that only read its described node.
 *
 * The declaration and program come from `createMock` rather than a cast: the
 * graph services never touch either, but a bare `{}` would have to be lied
 * about to the type system to say so.
 */
export function buildDiscoveredCallable(
  overrides: Partial<CallableNode> = {},
): DiscoveredCallable {
  return {
    declaration: createMock<DiscoveredCallable["declaration"]>(),
    node: buildCallableNode(overrides),
    projectProgram: createMock<DiscoveredCallable["projectProgram"]>(),
  };
}

/**
 * Builds a source location, defaulting the parts a test does not care about.
 */
export function buildSourceLocation(
  overrides: Partial<SourceLocation> = {},
): SourceLocation {
  return {
    column: 1,
    filePath: "packages/example/src/modules/example/example.service.ts",
    line: 1,
    ...overrides,
  };
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
