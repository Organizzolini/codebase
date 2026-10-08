import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { BoundaryFailureService } from "./boundary-failure.service";

import type { NxProject } from "@codependix/nx-projects";

/** Every project the stacks below can land in, one nested inside another. */
const PROJECTS: NxProject[] = [
  {
    absoluteRoot: "/workspace/applications/lexico/lexico-cli",
    name: "lexico-cli",
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

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [BoundaryFailureService],
    }).compile();

    service = await module.resolve(BoundaryFailureService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("charges a failure to the projects it was collected for", () => {
    expect(
      service.collect({
        error: new Error("boom"),
        level: "nestjsModules",
        projects: ["lexico-cli"],
        workspaceProjects: PROJECTS,
      }),
    ).toStrictEqual({
      error: "boom",
      level: "nestjsModules",
      projects: ["lexico-cli"],
    });
  });

  it("records a non-Error rejection as its string form", () => {
    expect(
      service.collect({
        error: "boom",
        level: "typescript",
        projects: ["lexico-cli"],
        workspaceProjects: PROJECTS,
      }).error,
    ).toBe("boom");
  });

  // D3: a container that cannot boot fails its own project, and says which
  // project owns the class it could not evaluate.
  it("names the project owning the first frame of a file URL stack", () => {
    const failure = service.collect({
      error: buildError([
        "file:///workspace/packages/lexico-entities/src/WordForm.entity.ts:12:3",
        "ModuleJob.run (node:internal/modules/esm/module_job:271:25)",
      ]),
      level: "nestjsModules",
      projects: ["lexico-cli"],
      workspaceProjects: PROJECTS,
    });

    expect(failure.ownerProject).toBe("lexico-entities");
  });

  it("names the owner from a frame written as a path in parentheses", () => {
    const failure = service.collect({
      error: buildError([
        "Object.<anonymous> (/workspace/packages/lexico-entities/src/index.ts:4:1)",
      ]),
      level: "nestjsModules",
      projects: ["lexico-cli"],
      workspaceProjects: PROJECTS,
    });

    expect(failure.ownerProject).toBe("lexico-entities");
  });

  it("skips frames inside node_modules and Node's own internals", () => {
    const failure = service.collect({
      error: buildError([
        "node:internal/modules/esm/module_job:271:25",
        "Reflect.decorate (/workspace/packages/lexico-entities/node_modules/typeorm/index.js:1:1)",
        "/workspace/applications/lexico/lexico-cli/src/main.ts:3:1",
      ]),
      level: "nestjsModules",
      projects: ["lexico-api"],
      workspaceProjects: PROJECTS,
    });

    expect(failure.ownerProject).toBe("lexico-cli");
  });

  it("names the innermost project when one root nests inside another", () => {
    const failure = service.collect({
      error: buildError([
        "/workspace/packages/lexico-entities/fixtures/word.fixture.ts:1:1",
      ]),
      level: "nestjsModules",
      projects: ["lexico-cli"],
      workspaceProjects: PROJECTS,
    });

    expect(failure.ownerProject).toBe("lexico-fixtures");
  });

  it("names no owner when the owner is a project already charged", () => {
    const failure = service.collect({
      error: buildError([
        "/workspace/packages/lexico-entities/src/WordForm.entity.ts:12:3",
      ]),
      level: "nestjsModules",
      projects: ["lexico-entities"],
      workspaceProjects: PROJECTS,
    });

    expect(failure).not.toHaveProperty("ownerProject");
  });

  // Guessing would name a project that did nothing wrong.
  it("names no owner when no frame lands inside a known project", () => {
    const failure = service.collect({
      error: buildError([
        "/elsewhere/script.ts:1:1",
        "/workspace/packages/lexico-entities-legacy/src/index.ts:1:1",
      ]),
      level: "nestjsModules",
      projects: ["lexico-cli"],
      workspaceProjects: PROJECTS,
    });

    expect(failure).not.toHaveProperty("ownerProject");
  });

  it("names no owner for an error carrying no stack", () => {
    const error = new Error("boom");

    delete error.stack;

    expect(
      service.collect({
        error,
        level: "nestjsModules",
        projects: ["lexico-cli"],
        workspaceProjects: PROJECTS,
      }),
    ).not.toHaveProperty("ownerProject");
  });
});
