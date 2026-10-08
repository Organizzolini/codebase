import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { ProjectsService } from "./projects.service";

/** Writes a workspace holding projects, a template, and a dependency. */
async function createWorkspace(): Promise<string> {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "conformetry-nx-projects-"),
  );

  const write = async (
    relativePath: string,
    contents: string,
  ): Promise<void> => {
    await mkdir(path.join(workspaceRoot, path.dirname(relativePath)), {
      recursive: true,
    });
    await writeFile(path.join(workspaceRoot, relativePath), contents, "utf8");
  };

  await write(
    "packages/widgets/project.json",
    JSON.stringify({ name: "widgets", tags: ["framework:nestjs"] }),
  );
  await write(
    "applications/storefront/project.json",
    JSON.stringify({ name: "storefront", tags: ["framework:react"] }),
  );
  // A project.json inside a template is a file the template renders, not a
  // project, which is what `.nxignore` is there to say.
  await write("templates/widget/{{name}}/project.json", "{}");
  await write(".nxignore", "# generator templates\ntemplates\n");
  // Dependencies and dot directories are skipped however deep they go.
  await write("node_modules/some-package/project.json", "{}");
  await write(".conformetry/nx-generators/project.json", "{}");

  return workspaceRoot;
}

describe(ProjectsService, () => {
  let service: ProjectsService;
  let workspaceRoot: string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [ProjectsService],
    }).compile();

    service = await module.resolve(ProjectsService);
    workspaceRoot = await createWorkspace();
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("listWorkspaceProjects", () => {
    it("lists the workspace's projects, sorted by name", () => {
      // Sorted so the choices an emitted schema offers are stable between
      // runs; an unstable order would report drift on every re-emit.
      expect(
        service.listWorkspaceProjects(workspaceRoot).map((p) => p.name),
      ).toStrictEqual(["storefront", "widgets"]);
    });

    it("carries each project's root and tags", () => {
      expect(service.listWorkspaceProjects(workspaceRoot)).toContainEqual({
        name: "widgets",
        root: "packages/widgets",
        tags: ["framework:nestjs", "name:widgets"],
      });
    });

    it("skips templates, dependencies, and dot directories", () => {
      const roots = service
        .listWorkspaceProjects(workspaceRoot)
        .map((project) => project.root);

      expect(roots).not.toContain("templates/widget/{{name}}");
      expect(roots).not.toContain("node_modules/some-package");
      expect(roots).not.toContain(".conformetry/nx-generators");
    });
  });

  describe("readProjectScope", () => {
    it("falls back to the root as a name, and to no tags", async () => {
      await writeFile(
        path.join(workspaceRoot, "packages/widgets/nameless.json"),
        "{}",
        "utf8",
      );

      expect(
        service.readProjectScope({
          projectConfigurationFile: "packages/widgets/nameless.json",
          workspaceRoot,
        }),
      ).toStrictEqual({
        name: "packages/widgets",
        root: "packages/widgets",
        tags: ["name:packages/widgets"],
      });
    });

    it("survives a project.json holding no object", async () => {
      await writeFile(
        path.join(workspaceRoot, "packages/widgets/scalar.json"),
        '"nope"',
        "utf8",
      );

      expect(
        service.readProjectScope({
          projectConfigurationFile: "packages/widgets/scalar.json",
          workspaceRoot,
        }).tags,
      ).toStrictEqual(["name:packages/widgets"]);
    });

    it("keeps only the tags that are text", async () => {
      await writeFile(
        path.join(workspaceRoot, "packages/widgets/mixed.json"),
        JSON.stringify({ name: "mixed", tags: ["keep", 7, null] }),
        "utf8",
      );

      expect(
        service.readProjectScope({
          projectConfigurationFile: "packages/widgets/mixed.json",
          workspaceRoot,
        }).tags,
      ).toStrictEqual(["keep", "name:mixed"]);
    });
  });
});
