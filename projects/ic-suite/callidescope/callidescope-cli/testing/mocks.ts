import { createMock } from "@golevelup/ts-vitest";
import { afterEach, beforeEach, vi } from "vitest";

import type {
  CallableNode,
  CallGraphResult,
  SourceLocation,
  StackFrame,
} from "@callidescope/core";
import type { DiscoveredCallable } from "@callidescope/graph";

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
 * Builds a finding-free result, for tests that only pass one through.
 *
 * Every collection the pipeline produces is present, so a test asserting on the
 * whole result keeps working when a new finding kind is added.
 *
 * The summary counts one callable in one file rather than none. A result with
 * nothing in it is not the neutral value it looks like: the command fails a run
 * that traced nothing, so a zero here would make every test that passes this
 * through assert the wrong exit code for the wrong reason.
 */
export function buildCallGraphResult(
  overrides: Partial<CallGraphResult> = {},
): CallGraphResult {
  return {
    deepStacks: [],
    projects: [],
    summary: {
      callableCount: 1,
      cyclicComponentCount: 0,
      edgeCount: 0,
      entryPointCount: 0,
      fileCount: 1,
      maximumDepth: 0,
      projectCount: 1,
      unresolvedCallCount: 0,
    },
    wideCallables: [],
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
 * Builds a stack frame, defaulting the parts a test does not care about.
 *
 * Carrying neither documentation nor a signature by default: most assertions are about the
 * shape of a stack rather than what its frames say about themselves, and a
 * frame carrying neither is the honest baseline.
 */
export function buildStackFrame(
  overrides: Partial<StackFrame> = {},
): StackFrame {
  const location = overrides.location ?? buildSourceLocation();

  return {
    displayName: "ExampleService.example",
    documentation: undefined,
    id: `${location.filePath}#0`,
    isCycle: false,
    location,
    signature: undefined,
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
