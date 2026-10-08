import { NeighborhoodService } from "@codependix/nx-projects";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { BoundaryFailureService } from "./boundary-failure.service";

import type { BoundaryCheckFailure } from "./boundary-check.types";
import type { NxProject, NxProjectGraph } from "@codependix/nx-projects";

/** Every project the stacks below can land in, one nested inside another. */
const PROJECTS: NxProject[] = [
  {
    absoluteRoot: "/workspace/applications/lexico/lexico-api",
    name: "lexico-api",
    tags: [],
  },
  {
    absoluteRoot: "/workspace/applications/lexico/lexico-cli",
    name: "lexico-cli",
    tags: [],
  },
  {
    absoluteRoot:
      "/workspace/packages/ic-suite/codependix/codependix-file-imports",
    name: "codependix-file-imports",
    tags: [],
  },
  {
    absoluteRoot: "/workspace/packages/lexico-entities",
    name: "lexico-entities",
    tags: [],
  },
  {
    absoluteRoot: "/workspace/packages/lexico-entities/fixtures",
    name: "lexico-fixtures",
    tags: [],
  },
];

/**
 * Both lexico applications depend on the entities, which depend on their
 * fixtures. `codependix-file-imports` is in the workspace but no lexico
 * project depends on it — it is the tool running the check.
 */
const GRAPH: NxProjectGraph = {
  dependencies: {
    "lexico-api": [
      { source: "lexico-api", target: "lexico-entities", type: "static" },
    ],
    "lexico-cli": [
      { source: "lexico-cli", target: "lexico-entities", type: "static" },
    ],
    "lexico-entities": [
      { source: "lexico-entities", target: "lexico-fixtures", type: "static" },
    ],
  },
  nodes: Object.fromEntries(
    PROJECTS.map((project) => [
      project.name,
      {
        data: {
          root: project.absoluteRoot.replace("/workspace/", ""),
        },
        name: project.name,
        type: "lib" as const,
      },
    ]),
  ),
};

/** Builds an error whose stack is exactly the given frames. */
function buildError(frames: string[]): Error {
  const error = new ReferenceError(
    "Cannot access 'Word' before initialization",
  );

  error.stack = [
    "ReferenceError: Cannot access 'Word' before initialization",
    ...frames.map((frame) => `    at ${frame}`),
  ].join("\n");

  return error;
}

describe(BoundaryFailureService, () => {
  let service: BoundaryFailureService;

  /** Collects a NestJS-level failure charged to the given projects. */
  function collect(
    error: unknown,
    projects: readonly string[] = ["lexico-cli"],
  ): BoundaryCheckFailure {
    return service.collect({
      error,
      graph: GRAPH,
      level: "nestjsModules",
      projects,
      workspaceProjects: PROJECTS,
    });
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [BoundaryFailureService, NeighborhoodService],
    }).compile();

    service = await module.resolve(BoundaryFailureService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("charges a failure to the projects it was collected for", () => {
    expect(collect(new Error("boom"))).toStrictEqual({
      error: "boom",
      level: "nestjsModules",
      projects: ["lexico-cli"],
    });
  });

  it("records a non-Error rejection as its string form", () => {
    expect(collect("boom").error).toBe("boom");
  });

  // D3: a container that cannot boot fails its own project, and says which
  // project owns the class it could not evaluate.
  it("names the project owning the first frame of a file URL stack", () => {
    const failure = collect(
      buildError([
        "file:///workspace/packages/lexico-entities/src/WordForm.entity.ts:12:3",
        "ModuleJob.run (node:internal/modules/esm/module_job:271:25)",
      ]),
    );

    expect(failure.ownerProject).toBe("lexico-entities");
  });

  it("names the owner from a frame written as a path in parentheses", () => {
    const failure = collect(
      buildError([
        "Object.<anonymous> (/workspace/packages/lexico-entities/src/index.ts:4:1)",
      ]),
    );

    expect(failure.ownerProject).toBe("lexico-entities");
  });

  it("skips frames inside node_modules and Node's own internals", () => {
    const failure = collect(
      buildError([
        "node:internal/modules/esm/module_job:271:25",
        "Reflect.decorate (/workspace/packages/lexico-entities/node_modules/typeorm/index.js:1:1)",
        "/workspace/packages/lexico-entities/src/word.entity.ts:3:1",
      ]),
      ["lexico-api"],
    );

    expect(failure.ownerProject).toBe("lexico-entities");
  });

  it("names the innermost project when one root nests inside another", () => {
    const failure = collect(
      buildError([
        "/workspace/packages/lexico-entities/fixtures/word.fixture.ts:1:1",
      ]),
    );

    expect(failure.ownerProject).toBe("lexico-fixtures");
  });

  it("names no owner when the owner is a project already charged", () => {
    const failure = collect(
      buildError([
        "/workspace/packages/lexico-entities/src/WordForm.entity.ts:12:3",
      ]),
      ["lexico-entities"],
    );

    expect(failure).not.toHaveProperty("ownerProject");
  });

  // An error codependix raises itself throws from codependix's own source,
  // which is a workspace project too when it runs from source — but nothing
  // the charged project depends on, so it cannot own the failure.
  it("names no owner when the first project frame is in an unrelated project", () => {
    const failure = collect(
      buildError([
        "TypescriptProjectService.read (/workspace/packages/ic-suite/codependix/codependix-file-imports/src/typescript-project.service.ts:64:11)",
        "/workspace/applications/lexico/lexico-cli/src/main.ts:1:1",
      ]),
    );

    expect(failure).not.toHaveProperty("ownerProject");
  });

  it("skips an unrelated project's frame to reach a dependency's", () => {
    const failure = collect(
      buildError([
        "/workspace/packages/ic-suite/codependix/codependix-file-imports/src/index.ts:1:1",
        "file:///workspace/packages/lexico-entities/src/WordForm.entity.ts:12:3",
      ]),
    );

    expect(failure.ownerProject).toBe("lexico-entities");
  });

  // Another project the charged one does not depend on is not its owner,
  // even when that project's code is what threw.
  it("never names a project that only depends on the charged one", () => {
    const failure = collect(
      buildError(["/workspace/applications/lexico/lexico-api/src/main.ts:1:1"]),
      ["lexico-entities"],
    );

    expect(failure).not.toHaveProperty("ownerProject");
  });

  it("reads no file from a frame missing its line and column", () => {
    const failure = collect(
      buildError([
        "/workspace/packages/lexico-entities/src/WordForm.entity.ts",
        "Word (/workspace/packages/lexico-entities/src/word.entity.ts:x:1)",
        "Word (/workspace/packages/lexico-entities/src/word.entity.ts:1:)",
      ]),
    );

    expect(failure).not.toHaveProperty("ownerProject");
  });

  // A stack is library input: a frame crafted to make a backtracking parser
  // go polynomial must be read in linear time, and still read as no file.
  it.each([
    ["an unclosed name", "(a".repeat(50_000)],
    ["a closed one", `${"(a".repeat(50_000)}:1:1)`],
    ["a run of separators", `/${":1".repeat(50_000)}`],
  ])("reads an adversarial frame with %s promptly", (_shape, frame) => {
    const startedAt = performance.now();
    const failure = collect(buildError([frame]));

    expect(performance.now() - startedAt).toBeLessThan(500);
    expect(failure).not.toHaveProperty("ownerProject");
  });

  // Guessing would name a project that did nothing wrong.
  it("names no owner when no frame lands inside a known project", () => {
    const failure = collect(
      buildError([
        "/elsewhere/script.ts:1:1",
        "/workspace/packages/lexico-entities-legacy/src/index.ts:1:1",
      ]),
    );

    expect(failure).not.toHaveProperty("ownerProject");
  });

  it("names no owner for an error carrying no stack", () => {
    const error = new Error("boom");

    delete error.stack;

    expect(collect(error)).not.toHaveProperty("ownerProject");
  });
});
