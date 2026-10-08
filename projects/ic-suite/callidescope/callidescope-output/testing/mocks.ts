import { createMock } from "@golevelup/ts-vitest";
import { afterEach, beforeEach, vi } from "vitest";

import type {
  ProjectLimits,
  ProjectLimitsLookup,
} from "@callidescope/configuration";
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
 * Builds a result whose every collection and count is empty.
 *
 * Every collection the pipeline produces is present, so a test asserting on the
 * whole result keeps working when a new finding kind is added.
 *
 * Named for the emptiness rather than for the type, because the emptiness is
 * not neutral: an all-zero summary is itself a finding to anything that judges
 * a run, so a test about what a run reports wants
 * {@link buildTracedCallGraphResult} instead. This one is for the renderers,
 * which only pass a result through.
 */
export function buildEmptyCallGraphResult(
  overrides: Partial<CallGraphResult> = {},
): CallGraphResult {
  return {
    deepStacks: [],
    projects: [],
    summary: {
      callableCount: 0,
      cyclicComponentCount: 0,
      edgeCount: 0,
      entryPointCount: 0,
      fileCount: 0,
      maximumDepth: 0,
      projectCount: 0,
      unresolvedCallCount: 0,
    },
    wideCallables: [],
    ...overrides,
  };
}

/**
 * Builds the limits lookup a run hands the renderers.
 *
 * The workspace row is what a project the lookup does not name resolves to, so
 * a test that cares about nothing but the number can pass `{ maximumDepth: 6 }`
 * and leave `byProject` empty.
 */
export function buildProjectLimitsLookup(
  args: {
    byProject?: Record<string, number>;
    maximumDepth?: number;
  } = {},
): ProjectLimitsLookup {
  const workspaceDepth = args.maximumDepth ?? 6;

  const declared = (value: number): ProjectLimits => ({
    maximumBreadth: undefined,
    maximumDepth: value,
    path: "callidescope.config.ts",
  });

  return {
    byProject: new Map(
      Object.entries(args.byProject ?? {}).map(([project, value]) => [
        project,
        declared(value),
      ]),
    ),
    workspace: {
      maximumBreadth: undefined,
      maximumDepth: workspaceDepth,
      path: "configuration/callidescope.config.ts",
    },
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
 * Builds a result whose summary says a run really traced something.
 *
 * A result with nothing in it is not the neutral value it looks like: a run
 * that traced nothing is itself a finding, so an all-zero summary would make
 * every test that only passes a result through assert the wrong exit code for
 * the wrong reason. One callable in one file in one project is the smallest
 * summary that says the trace happened.
 */
export function buildTracedCallGraphResult(
  overrides: Partial<CallGraphResult> = {},
): CallGraphResult {
  return buildEmptyCallGraphResult({
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
    ...overrides,
  });
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
