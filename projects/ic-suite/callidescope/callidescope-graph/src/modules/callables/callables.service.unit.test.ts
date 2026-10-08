import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { ANALYSIS_MODULES } from "../../../testing/modules";
import {
  buildFixtureProgram,
  buildFixtureServices,
  FIXTURE_ROOT,
} from "../../../testing/programs";

import { CallablesService } from "./callables.service";

import type { CallableCollection } from "./callables.types";

/** Collects callables from in-memory files under the given options. */
function collect(args: {
  files: Record<string, string>;
  includeTests?: boolean;
  includeTestsByProject?: ReadonlyMap<string, boolean>;
  isExcluded?: (filePath: string) => boolean;
}): CallableCollection {
  const projectProgram = buildFixtureProgram(args.files);
  const services = buildFixtureServices({ projectProgram });

  return services.callables.collect({
    fileFilter: { isExcluded: args.isExcluded ?? (() => false) },
    includeTests: args.includeTests ?? true,
    includeTestsByProject: args.includeTestsByProject ?? new Map(),
    ownerByFilePath: new Map(
      [...projectProgram.ownedFilePaths].map((filePath) => [
        filePath,
        projectProgram,
      ]),
    ),
    workspaceRoot: FIXTURE_ROOT,
  });
}

/** Lists the display names collected from in-memory files. */
function collectNames(args: Parameters<typeof collect>[0]): string[] {
  return [...collect(args).byId.values()].map(
    (callable) => callable.node.displayName,
  );
}

describe(CallablesService, () => {
  let service: CallablesService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [...ANALYSIS_MODULES],
      providers: [CallablesService],
    }).compile();

    service = await module.resolve(CallablesService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("collects every function-like declaration with a body", () => {
    expect(
      collectNames({
        files: {
          "packages/example/src/modules/a/a.service.ts": `
            export function one(): void {}
            export class Service { public two(): void {} }
          `,
        },
      }),
    ).toStrictEqual(["one", "Service.two"]);
  });

  it("collects a nested function literal as its own callable", () => {
    expect(
      collectNames({
        files: {
          "packages/example/src/modules/a/a.service.ts": `
            function each(callback: () => void): void { callback(); }
            export function entry(): void { each(() => {}); }
          `,
        },
      }),
    ).toContain("each(…)");
  });

  it("skips an overload signature in favour of the implementation", () => {
    // A signature is a promise about a call, not a frame the runtime pushes.
    const names = collectNames({
      files: {
        "packages/example/src/modules/a/a.service.ts": `
          export function entry(value: string): void;
          export function entry(value: number): void;
          export function entry(value: unknown): void { void value; }
        `,
      },
    });

    expect(names.filter((name) => name === "entry")).toHaveLength(1);
  });

  it("skips a declaration with no body at all", () => {
    expect(
      collectNames({
        files: {
          "packages/example/src/modules/a/a.service.ts":
            "export abstract class Base { public abstract run(): void; }",
        },
      }),
    ).toStrictEqual([]);
  });

  it("counts the files it walked", () => {
    expect(
      collect({
        files: {
          "packages/example/src/modules/a/a.service.ts":
            "export function a(): void {}",
          "packages/example/src/modules/b/b.service.ts":
            "export function b(): void {}",
        },
      }).fileCount,
    ).toBe(2);
  });

  it("leaves out a file the filter excludes", () => {
    expect(
      collectNames({
        files: {
          "packages/example/src/modules/a/a.service.ts":
            "export function a(): void {}",
          "packages/example/src/modules/b/b.service.ts":
            "export function b(): void {}",
        },
        isExcluded: (filePath) => filePath.includes("/b/"),
      }),
    ).toStrictEqual(["a"]);
  });

  it("leaves out test files when they are not wanted", () => {
    expect(
      collectNames({
        files: {
          "packages/example/src/modules/a/a.service.ts":
            "export function a(): void {}",
          "packages/example/src/modules/a/a.service.unit.test.ts":
            "export function testHelper(): void {}",
        },
        includeTests: false,
      }),
    ).toStrictEqual(["a"]);
  });

  it("includes test files when they are wanted", () => {
    expect(
      collectNames({
        files: {
          "packages/example/src/modules/a/a.service.unit.test.ts":
            "export function testHelper(): void {}",
        },
        includeTests: true,
      }),
    ).toStrictEqual(["testHelper"]);
  });

  it("includes a project's test files when that project asked for them", () => {
    expect(
      collectNames({
        files: {
          "packages/example/src/modules/a/a.service.unit.test.ts":
            "export function testHelper(): void {}",
        },
        includeTests: false,
        includeTestsByProject: new Map([["example", true]]),
      }),
    ).toStrictEqual(["testHelper"]);
  });

  it("skips a project's test files when that project refused them", () => {
    expect(
      collectNames({
        files: {
          "packages/example/src/modules/a/a.service.ts":
            "export function a(): void {}",
          "packages/example/src/modules/a/a.service.unit.test.ts":
            "export function testHelper(): void {}",
        },
        includeTests: true,
        includeTestsByProject: new Map([["example", false]]),
      }),
    ).toStrictEqual(["a"]);
  });

  it("falls back to the run's answer for a project that declared none", () => {
    expect(
      collectNames({
        files: {
          "packages/example/src/modules/a/a.service.unit.test.ts":
            "export function testHelper(): void {}",
        },
        includeTests: true,
        includeTestsByProject: new Map([["other", false]]),
      }),
    ).toStrictEqual(["testHelper"]);
  });

  it("skips a source file no program owns", () => {
    const projectProgram = buildFixtureProgram({
      "packages/example/src/modules/a/a.service.ts":
        "export function a(): void {}",
      "packages/example/src/modules/b/b.service.ts":
        "export function b(): void {}",
    });
    const services = buildFixtureServices({ projectProgram });
    const owned = [...projectProgram.ownedFilePaths].filter((filePath) =>
      filePath.includes("/a/"),
    );
    const collection = services.callables.collect({
      fileFilter: { isExcluded: () => false },
      includeTests: true,
      includeTestsByProject: new Map(),
      ownerByFilePath: new Map(
        owned.map((filePath) => [filePath, projectProgram]),
      ),
      workspaceRoot: FIXTURE_ROOT,
    });

    expect(
      [...collection.byId.values()].map(
        (callable) => callable.node.displayName,
      ),
    ).toStrictEqual(["a"]);
  });

  it("skips a declaration file", () => {
    expect(
      collectNames({
        files: {
          "packages/example/src/modules/a/a.service.ts":
            "export function a(): void {}",
          "packages/example/src/modules/a/a.types.d.ts":
            "export declare function b(): void;",
        },
      }),
    ).toStrictEqual(["a"]);
  });

  it("names the project each callable belongs to", () => {
    const collection = collect({
      files: {
        "packages/example/src/modules/a/a.service.ts":
          "export function a(): void {}",
      },
    });

    expect([...collection.byId.values()][0]?.node.projectName).toBe("example");
  });
});
