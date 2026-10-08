import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { Test } from "@nestjs/testing";
import ts from "typescript";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { TypescriptProjectService } from "./typescript-project.service";
import { TypescriptProjectConfigurationError } from "./typescript.constants";

import type { TypescriptProject } from "./typescript.types";

/** Writes a project holding one source file, and returns its description. */
async function buildProject(args: {
  configuration?: string;
  name: string;
  sources?: Record<string, string>;
}): Promise<TypescriptProject> {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "codependix-imports-"),
  );
  const root = path.join(workspaceRoot, "packages", args.name);

  await mkdir(path.join(root, "src"), { recursive: true });
  await writeFile(
    path.join(root, "tsconfig.json"),
    args.configuration ??
      JSON.stringify({
        compilerOptions: { moduleResolution: "bundler", noLib: true },
        include: ["src/**/*.ts"],
      }),
    "utf8",
  );

  for (const [name, text] of Object.entries(
    args.sources ?? { "src/index.ts": "export function entry(): void {}\n" },
  )) {
    await writeFile(path.join(root, name), text, "utf8");
  }

  return {
    absoluteRoot: root,
    name: args.name,
    tsconfigPath: path.join(root, "tsconfig.json"),
  };
}

describe(TypescriptProjectService, () => {
  let service: TypescriptProjectService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [TypescriptProjectService],
    }).compile();

    service = await module.resolve(TypescriptProjectService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("describes a project by its root and Nx name", () => {
    const described = service.describeProject(
      "/workspace/packages/example",
      "example",
    );

    expect(described).toStrictEqual({
      absoluteRoot: "/workspace/packages/example",
      name: "example",
      tsconfigPath: path.join("/workspace/packages/example", "tsconfig.json"),
    });
  });

  it("discovers only projects carrying a tsconfig.json", async () => {
    const withConfig = await buildProject({ name: "with-config" });
    const withoutConfigRoot = path.dirname(withConfig.absoluteRoot);

    const discovered = service.discoverProjects([
      { absoluteRoot: withConfig.absoluteRoot, name: "with-config" },
      { absoluteRoot: withoutConfigRoot, name: "without-config" },
    ]);

    expect(discovered.map((project) => project.name)).toStrictEqual([
      "with-config",
    ]);
  });

  it("builds a program from a project's tsconfig", async () => {
    const project = await buildProject({ name: "example" });

    const projectProgram = service.buildProgram(project);

    expect(projectProgram.program.getRootFileNames()).toHaveLength(1);
    expect(projectProgram.project).toBe(project);
  });

  it("throws when a tsconfig cannot be read", async () => {
    const project = await buildProject({
      configuration: "{ not valid json",
      name: "broken",
    });

    expect(() => service.buildProgram(project)).toThrow(
      TypescriptProjectConfigurationError,
    );
  });

  it("resolves a path through symlinks", () => {
    expect(service.toRealPath("/workspace/packages/example/src/index.ts")).toBe(
      ts.sys.realpath?.("/workspace/packages/example/src/index.ts"),
    );
  });

  it("returns the path unchanged when the host offers no realpath", () => {
    const mutableSys: { realpath?: ((path: string) => string) | undefined } =
      ts.sys;
    const originalRealpath = mutableSys.realpath;
    mutableSys.realpath = undefined;

    try {
      expect(
        service.toRealPath("/workspace/packages/example/src/index.ts"),
      ).toBe("/workspace/packages/example/src/index.ts");
    } finally {
      mutableSys.realpath = originalRealpath;
    }
  });
});
