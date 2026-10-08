import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { FsTree } from "nx/src/generators/tree";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { PathsModule } from "./paths.module";
import { PathsService } from "./paths.service";

import type { InstancesService } from "../instances/instances.service";
import type { ScopeService } from "../scope/scope.service";
import type {
  ConfigurationService,
  Instance,
} from "@conformetry/configuration";
import type { Tree } from "@nx/devkit";

/**
 * Builds a workspace whose modules sit under `src/modules`, plus one stray
 * directory elsewhere, so the "most common parent" rule has something to beat.
 */
async function createWorkspace(): Promise<string> {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "conformetry-nx-paths-"),
  );

  for (const moduleName of ["differences", "logger"]) {
    const modulePath = path.join(
      workspaceRoot,
      "packages/widgets/src/modules",
      moduleName,
    );

    await mkdir(modulePath, { recursive: true });
    await writeFile(
      path.join(modulePath, `${moduleName}.service.ts`),
      "",
      "utf8",
    );
  }

  const strayPath = path.join(workspaceRoot, "packages/widgets/src/legacy/odd");

  await mkdir(strayPath, { recursive: true });
  await writeFile(path.join(strayPath, "odd.service.ts"), "", "utf8");
  await mkdir(path.join(workspaceRoot, "packages/empty"), { recursive: true });

  for (const project of [
    { name: "widgets", root: "packages/widgets" },
    { name: "empty", root: "packages/empty" },
  ]) {
    await writeFile(
      path.join(workspaceRoot, project.root, "project.json"),
      JSON.stringify({ name: project.name, root: project.root }),
      "utf8",
    );
  }

  await writeFile(
    path.join(workspaceRoot, "conformetry.config.json"),
    JSON.stringify([
      {
        instances: [{ patterns: ["packages/*/src/*/*"] }],
        name: "widget",
        templatePath: "templates/widget",
      },
    ]),
    "utf8",
  );

  return workspaceRoot;
}

describe(PathsService, () => {
  let configurationPath: string;
  let service: PathsService;
  let tree: Tree;
  let workspaceRoot: string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [PathsModule],
      providers: [PathsService],
    }).compile();

    service = await module.resolve(PathsService);
    workspaceRoot = await createWorkspace();
    configurationPath = path.join(workspaceRoot, "conformetry.config.json");
    // A real tree over the temporary workspace: `readProjectConfiguration`
    // walks the tree for `project.json` files rather than reading one path,
    // so a hand-rolled fake cannot stand in for it.
    tree = new FsTree(workspaceRoot, false);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("resolveGenerationPath", () => {
    it("honours an explicit directory", async () => {
      await expect(
        service.resolveGenerationPath({
          configurationPath,
          inputs: { directory: "somewhere/else", name: "my-widget" },
          tree,
          workspaceRoot,
        }),
      ).resolves.toBe(path.join(workspaceRoot, "somewhere/else"));
    });

    it("returns the directory the project's existing modules sit in", async () => {
      await expect(
        service.resolveGenerationPath({
          configurationPath,
          inputs: { name: "my-widget", project: "widgets" },
          tree,
          workspaceRoot,
        }),
      ).resolves.toBe(path.join(workspaceRoot, "packages/widgets/src/modules"));
    });

    it("places a new instance in the folder a tagged group names", async () => {
      // A group stating where instances belong beats inferring it from where
      // they already are — inference answers nothing in an empty project.
      const scopedPath = path.join(workspaceRoot, "scoped.config.json");

      await writeFile(
        scopedPath,
        JSON.stringify([
          {
            instances: [
              { patterns: ["src/widgets/*"], tags: ["type:package"] },
            ],
            name: "widget",
            templatePath: "templates/widget",
          },
        ]),
        "utf8",
      );

      await expect(
        service.resolveGenerationPath({
          configurationPath: scopedPath,
          generatorName: "widget",
          inputs: { name: "my-widget", project: "widgets" },
          tree,
          workspaceRoot,
        }),
      ).resolves.toBe(path.join(workspaceRoot, "packages/widgets/src/widgets"));
    });

    it("infers the folder when the named generator has no tagged group", async () => {
      await expect(
        service.resolveGenerationPath({
          configurationPath,
          generatorName: "widget",
          inputs: { name: "my-widget", project: "widgets" },
          tree,
          workspaceRoot,
        }),
      ).resolves.toBe(path.join(workspaceRoot, "packages/widgets/src/modules"));
    });

    it("infers the folder when no generator by that name exists", async () => {
      await expect(
        service.resolveGenerationPath({
          configurationPath,
          generatorName: "not-a-generator",
          inputs: { name: "my-widget", project: "widgets" },
          tree,
          workspaceRoot,
        }),
      ).resolves.toBe(path.join(workspaceRoot, "packages/widgets/src/modules"));
    });

    it("writes into an existing module when one is named", async () => {
      await expect(
        service.resolveGenerationPath({
          configurationPath,
          inputs: {
            module: "differences",
            name: "my-widget",
            project: "widgets",
          },
          tree,
          workspaceRoot,
        }),
      ).resolves.toBe(
        path.join(workspaceRoot, "packages/widgets/src/modules/differences"),
      );
    });

    it("refuses a module the project does not have", async () => {
      // Placing the files at a made-up path instead scattered a stray
      // directory across the project root and reported success.
      await expect(
        service.resolveGenerationPath({
          configurationPath,
          inputs: {
            module: "no-such-module",
            name: "my-service",
            project: "widgets",
          },
          tree,
          workspaceRoot,
        }),
      ).rejects.toThrow("has no module named no-such-module");
    });

    it("falls back to the project root when it has no modules yet", async () => {
      await expect(
        service.resolveGenerationPath({
          configurationPath,
          inputs: { name: "my-widget", project: "empty" },
          tree,
          workspaceRoot,
        }),
      ).resolves.toBe(path.join(workspaceRoot, "packages/empty"));
    });

    it("returns the directory its type's projects already sit in", async () => {
      await expect(
        service.resolveGenerationPath({
          configurationPath,
          inputs: { name: "my-package", type: "packages" },
          tree,
          workspaceRoot,
        }),
      ).resolves.toBe(path.join(workspaceRoot, "packages"));
    });

    it("uses the type itself when no project sits under that directory", async () => {
      await expect(
        service.resolveGenerationPath({
          configurationPath,
          inputs: { name: "my-tool", type: "tools" },
          tree,
          workspaceRoot,
        }),
      ).resolves.toBe(path.join(workspaceRoot, "tools"));
    });

    it("ignores a project's modules that sit outside its own root", async () => {
      await expect(
        service.resolveGenerationPath({
          configurationPath,
          inputs: { name: "my-widget", project: "empty" },
          tree,
          workspaceRoot,
        }),
      ).resolves.toBeDefined();
    });

    it("falls back to the workspace root when nothing locates the output", async () => {
      await expect(
        service.resolveGenerationPath({
          configurationPath,
          inputs: { name: "my-widget" },
          tree,
          workspaceRoot,
        }),
      ).resolves.toBe(workspaceRoot);
    });
  });

  describe("resolveGenerationPath with a crafted set of instances", () => {
    /**
     * Builds a `PathsService` whose collaborators are stubbed, so the
     * instances fed into it can be shaped by hand instead of by a real glob —
     * what these tests exercise is the module-parent inference, not
     * discovery.
     */
    function createIsolatedService(instances: Instance[]): PathsService {
      return new PathsService(
        createMock<InstancesService>({
          findProjectInstances: vi
            .fn<InstancesService["findProjectInstances"]>()
            .mockResolvedValue(instances),
        }),
        createMock<ConfigurationService>(),
        createMock<ScopeService>(),
      );
    }

    it("ignores a project-level instance when inferring the module parent", async () => {
      // A project itself can be discovered as an instance — its own template
      // matches the directory holding it, not a directory inside it — and
      // that instance's parent path sits outside the project root entirely.
      const isolatedService = createIsolatedService([
        { nameStem: "widgets", path: path.join(workspaceRoot, "packages") },
        {
          nameStem: "differences",
          path: path.join(workspaceRoot, "packages/widgets/src/modules"),
        },
      ]);

      await expect(
        isolatedService.resolveGenerationPath({
          configurationPath,
          inputs: { name: "my-widget", project: "widgets" },
          tree,
          workspaceRoot,
        }),
      ).resolves.toBe(path.join(workspaceRoot, "packages/widgets/src/modules"));
    });

    it("breaks a tie between equally common parents alphabetically", async () => {
      const isolatedService = createIsolatedService([
        {
          nameStem: "differences",
          path: path.join(workspaceRoot, "packages/widgets/src/modules"),
        },
        {
          nameStem: "other",
          path: path.join(workspaceRoot, "packages/widgets/src/alpha"),
        },
      ]);

      await expect(
        isolatedService.resolveGenerationPath({
          configurationPath,
          inputs: { name: "my-widget", project: "widgets" },
          tree,
          workspaceRoot,
        }),
      ).resolves.toBe(path.join(workspaceRoot, "packages/widgets/src/alpha"));
    });
  });
});
