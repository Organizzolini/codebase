import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { createTree } from "nx/src/generators/testing-utils/create-tree";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logging";

import {
  DEFAULT_OUTPUT_PATH,
  DEFAULT_PACKAGE_NAME,
} from "../generator/generator.constants";
import { GeneratorService } from "../generator/generator.service";

import { PluginModule } from "./plugin.module";
import { PluginService } from "./plugin.service";

import type { ProjectScope } from "../instances/instances.types";
import type { Tree } from "@nx/devkit";
import type { MockInstance } from "vitest";

const WIDGETS: ProjectScope = {
  name: "widgets",
  root: "packages/widgets",
  tags: ["type:package"],
};

const EMPTY: ProjectScope = {
  name: "empty",
  root: "packages/empty",
  tags: ["type:package"],
};

/**
 * Writes a workspace holding one conforming module, one drifted module, and a
 * project with nothing to validate.
 */
async function createWorkspace(): Promise<string> {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "conformetry-nx-plugin-"),
  );
  const templatePath = path.join(workspaceRoot, "templates/widget");

  // A module template contains the folder it produces, so its tree is laid
  // over `src/modules` rather than over the module directory itself.
  await mkdir(path.join(templatePath, "{{nameKebabCase}}"), {
    recursive: true,
  });
  await writeFile(
    path.join(
      templatePath,
      "{{nameKebabCase}}",
      "{{nameKebabCase}}.config.json",
    ),
    '{\n  "kind": "widget",\n  "name": "{{nameKebabCase}}"\n}\n',
    "utf8",
  );

  const modulePath = path.join(
    workspaceRoot,
    "packages/widgets/src/modules/gears",
  );

  await mkdir(modulePath, { recursive: true });
  await writeFile(
    path.join(modulePath, "gears.config.json"),
    '{\n  "name": "gears"\n}\n',
    "utf8",
  );
  await mkdir(path.join(workspaceRoot, "packages/empty"), { recursive: true });

  for (const project of [WIDGETS, EMPTY]) {
    await writeFile(
      path.join(workspaceRoot, project.root, "project.json"),
      JSON.stringify({ name: project.name, tags: project.tags }),
      "utf8",
    );
  }

  // A project.json naming neither itself nor its tags: both fall back.
  await mkdir(path.join(workspaceRoot, "packages/nameless"), {
    recursive: true,
  });
  await writeFile(
    path.join(workspaceRoot, "packages/nameless/project.json"),
    JSON.stringify({ tags: "not-a-list" }),
    "utf8",
  );

  // A project.json holding no object at all.
  await mkdir(path.join(workspaceRoot, "packages/empty-json"), {
    recursive: true,
  });
  await writeFile(
    path.join(workspaceRoot, "packages/empty-json/project.json"),
    "null",
    "utf8",
  );

  // The workspace-level project, which inference deliberately skips.
  await writeFile(
    path.join(workspaceRoot, "project.json"),
    JSON.stringify({ name: "codebase", tags: [] }),
    "utf8",
  );
  await writeFile(
    path.join(workspaceRoot, "conformetry.config.json"),
    JSON.stringify([
      {
        instances: [
          {
            patterns: ["packages/*/src/modules/*"],
            substitutions: { type: "packages" },
          },
        ],
        name: "widget",
        templatePath: "templates/widget",
      },
    ]),
    "utf8",
  );

  return workspaceRoot;
}

describe(PluginService, () => {
  // Spied on the shared class prototype rather than injected as a mock: the
  // conformetry template for this file expects `Test.createTestingModule`
  // chained straight into `.compile()`, which an `overrideProvider` call
  // would break. A prototype spy intercepts every instance's calls no matter
  // which testing module constructed it.
  let errorSpy: MockInstance<typeof LoggerService.prototype.error>;
  let infoSpy: MockInstance<typeof LoggerService.prototype.info>;
  let setContextSpy: MockInstance<typeof LoggerService.prototype.setContext>;
  let warnSpy: MockInstance<typeof LoggerService.prototype.warn>;
  let options: { configurationPath: string };
  let service: PluginService;
  let workspaceRoot: string;

  beforeAll(async () => {
    errorSpy = vi
      .spyOn(LoggerService.prototype, "error")
      .mockImplementation(() => {});
    infoSpy = vi
      .spyOn(LoggerService.prototype, "info")
      .mockImplementation(() => {});
    setContextSpy = vi
      .spyOn(LoggerService.prototype, "setContext")
      .mockImplementation(() => {});
    warnSpy = vi
      .spyOn(LoggerService.prototype, "warn")
      .mockImplementation(() => {});

    const module = await Test.createTestingModule({
      imports: [PluginModule],
      providers: [PluginService],
    }).compile();

    service = await module.resolve(PluginService);
    workspaceRoot = await createWorkspace();
    options = {
      configurationPath: path.join(workspaceRoot, "conformetry.config.json"),
    };

    // The plugin refuses to run against a stale emitted plugin, so the
    // fixture emits a current one the way `nx sync` would.
    const generatorService = await module.resolve(GeneratorService);
    const emittedFiles = await generatorService.emitPlugin({
      configurationPath: options.configurationPath,
      outputPath: DEFAULT_OUTPUT_PATH,
      packageName: DEFAULT_PACKAGE_NAME,
    });

    for (const emittedFile of emittedFiles) {
      const absolutePath = path.join(workspaceRoot, emittedFile.filePath);

      await mkdir(path.dirname(absolutePath), { recursive: true });
      await writeFile(absolutePath, emittedFile.content, "utf8");
    }
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("sets logger context", async () => {
    // Its own module: the shared setup clears mocks between tests, so a
    // constructor call recorded during `beforeAll` is no longer observable.
    const module = await Test.createTestingModule({
      imports: [PluginModule],
      providers: [PluginService],
    }).compile();

    await module.resolve(PluginService);

    expect(setContextSpy).toHaveBeenCalledWith("PluginService");
  });

  describe("inferTargets", () => {
    it("falls back to the root as a name, and to no tags", async () => {
      const targets = await service.inferTargets({
        options,
        projectConfigurationFiles: ["packages/nameless/project.json"],
        workspaceRoot,
      });

      expect(targets.size).toBe(0);
    });

    it("survives a project.json that holds no object", async () => {
      const targets = await service.inferTargets({
        options,
        projectConfigurationFiles: ["packages/empty-json/project.json"],
        workspaceRoot,
      });

      expect(targets.size).toBe(0);
    });

    it("skips the workspace-level project", async () => {
      // Every candidate in the workspace sits inside the root project, so a
      // target there would duplicate every other project's work.
      const targets = await service.inferTargets({
        options,
        projectConfigurationFiles: ["project.json"],
        workspaceRoot,
      });

      expect(targets.size).toBe(0);
    });

    it("infers a validation target onto a project holding instances", async () => {
      const targets = await service.inferTargets({
        options,
        projectConfigurationFiles: ["packages/widgets/project.json"],
        workspaceRoot,
      });

      expect(targets.get("packages/widgets")).toStrictEqual({
        "conformetry-validate": {
          cache: true,
          executor: "@conformetry/nx:validate",
          // The configuration, emitted plugin, and every configured
          // template invalidate the cache, so a cache hit cannot skip the
          // drift check the executor performs, nor survive a template edit.
          inputs: [
            "default",
            `{workspaceRoot}/${options.configurationPath}`,
            "{workspaceRoot}/.conformetry/nx-generators/**/*",
            "{workspaceRoot}/templates/widget/**/*",
          ],
          options: {},
        },
      });
    });

    it("infers nothing onto a project with no instances", async () => {
      const targets = await service.inferTargets({
        options,
        projectConfigurationFiles: ["packages/empty/project.json"],
        workspaceRoot,
      });

      expect(targets.has("packages/empty")).toBe(false);
    });

    it("honours a configured target name", async () => {
      const targets = await service.inferTargets({
        options: { ...options, validateTargetName: "conform" },
        projectConfigurationFiles: ["packages/widgets/project.json"],
        workspaceRoot,
      });

      expect(Object.keys(targets.get("packages/widgets") ?? {})).toStrictEqual([
        "conform",
      ]);
    });
  });

  describe("runValidation", () => {
    it("reports the difference between an instance and its template", async () => {
      const result = await service.runValidation({
        options,
        project: WIDGETS,
        workspaceRoot,
      });

      expect(result.ok).toBe(false);
      expect(result.report).toContain("gears.config.json");
      expect(infoSpy).toHaveBeenCalledWith(
        "👔 Validated conformetry instances",
        undefined,
        { ok: false },
      );
    });

    it("passes a project with nothing to validate", async () => {
      const result = await service.runValidation({
        options,
        project: EMPTY,
        workspaceRoot,
      });

      expect(result.ok).toBe(true);
      expect(infoSpy).toHaveBeenCalledWith(
        "👔 Validated conformetry instances",
        undefined,
        { ok: true },
      );
    });
  });

  describe("runValidation with a language filter", () => {
    it("passes the caller's languages through", async () => {
      const { report } = await service.runValidation({
        languageNames: ["json"],
        options,
        project: WIDGETS,
        workspaceRoot,
      });

      expect(typeof report).toBe("string");
    });
  });

  describe("runValidation with a threshold", () => {
    it("passes the caller's threshold through", async () => {
      const result = await service.runValidation({
        options,
        project: WIDGETS,
        threshold: 0,
        workspaceRoot,
      });

      // A threshold of 0 accepts any score, so the drifted instance passes
      // where the default threshold rejects it.
      expect(result.ok).toBe(true);
    });
  });

  describe("resolving options that are not an object", () => {
    it("falls back to the registration when the passed options are not an object", async () => {
      // Whatever a caller hands the plugin is `unknown`, so a non-object
      // value must fall back to the registration rather than being spread
      // onto it.
      const nxConfigurationPath = path.join(workspaceRoot, "nx.json");

      await writeFile(
        nxConfigurationPath,
        JSON.stringify({
          plugins: [
            {
              options: { configurationPath: options.configurationPath },
              plugin: "@conformetry/nx",
            },
          ],
        }),
        "utf8",
      );

      await expect(
        service.runValidation({
          options: "not-an-object",
          project: EMPTY,
          workspaceRoot,
        }),
      ).resolves.toMatchObject({ ok: true });
    });
  });

  describe("runGenerator", () => {
    it("renders the template into the tree without touching disk", async () => {
      const tree = createTree();

      tree.root = workspaceRoot;

      const generatedFilePaths = await service.runGenerator({
        generatorName: "widget",
        options: {
          ...options,
          directory: "packages/widgets/src/modules",
          name: "sprockets",
        },
        tree,
        workspaceRoot,
      });

      expect(generatedFilePaths).toHaveLength(1);
      expect(
        tree.read(
          "packages/widgets/src/modules/sprockets/sprockets.config.json",
          "utf8",
        ),
      ).toContain('"name": "sprockets"');
      expect(infoSpy).toHaveBeenCalledWith(
        "✨ Generated instance files",
        undefined,
        { count: 1, generator: "widget" },
      );
    });

    it("rejects a generator the configuration does not declare", async () => {
      await expect(
        service.runGenerator({
          generatorName: "nope",
          options,
          tree: createMock<Tree>({ root: workspaceRoot }),
          workspaceRoot,
        }),
      ).rejects.toThrow("Unknown conformetry generator: nope");
      expect(errorSpy).toHaveBeenCalledWith(
        "🚫 Rejected an unknown generator",
        undefined,
        { generator: "nope" },
      );
    });
  });

  describe("failing fast on a stale setup", () => {
    it("refuses to run when the emitted plugin is out of date", async () => {
      const manifestPath = path.join(
        workspaceRoot,
        DEFAULT_OUTPUT_PATH,
        "generators.json",
      );
      const original = await readFile(manifestPath, "utf8");

      await writeFile(
        manifestPath,
        original.replace("widget", "widgets"),
        "utf8",
      );

      await expect(
        service.runValidation({ options, project: WIDGETS, workspaceRoot }),
      ).rejects.toThrow("Run `nx sync`");
      expect(warnSpy).toHaveBeenCalledWith(
        "🚫 Rejected a stale conformetry generator plugin",
        undefined,
        { filePath: path.join(DEFAULT_OUTPUT_PATH, "generators.json") },
      );

      await writeFile(manifestPath, original, "utf8");
    });

    it("refuses to run when a generator names a template that is gone", async () => {
      const configurationPath = path.join(workspaceRoot, "missing.config.json");

      await writeFile(
        configurationPath,
        JSON.stringify([
          {
            instances: [{ patterns: ["packages/*/src/modules/*"] }],
            name: "widget",
            templatePath: "templates/not-there",
          },
        ]),
        "utf8",
      );

      await expect(
        service.runValidation({
          options: { configurationPath },
          project: WIDGETS,
          workspaceRoot,
        }),
      ).rejects.toThrow("which does not exist");
      expect(warnSpy).toHaveBeenCalledWith(
        "🚫 Rejected a generator with a missing template",
        undefined,
        { generator: "widget", templatePath: "templates/not-there" },
      );
    });

    it("refuses to run when an emitted file has been deleted from disk", async () => {
      // Missing entirely, rather than merely differing — the `existsSync`
      // check above `readFileSync` is what this exercises. The configuration
      // itself is untouched, so `generators.json` still matches and the
      // mismatch is only found once the loop reaches the deleted schema.
      const schemaPath = path.join(
        workspaceRoot,
        DEFAULT_OUTPUT_PATH,
        "src/schemas/widget.json",
      );
      const originalSchema = await readFile(schemaPath, "utf8");

      await rm(schemaPath);

      await expect(
        service.runValidation({ options, project: WIDGETS, workspaceRoot }),
      ).rejects.toThrow("Run `nx sync`");

      await writeFile(schemaPath, originalSchema, "utf8");
    });

    it("falls back to the path the workspace registered the plugin with", async () => {
      const registeredPath = path.join(workspaceRoot, "registered.config.json");

      await writeFile(
        registeredPath,
        JSON.stringify([
          {
            instances: [{ patterns: ["packages/*/src/modules/*"] }],
            name: "widget",
            templatePath: "templates/also-not-there",
          },
        ]),
        "utf8",
      );
      // Nx hands an inferred target's executor no plugin options, so without
      // reading `nx.json` this would look for the conventional path instead.
      await writeFile(
        path.join(workspaceRoot, "nx.json"),
        JSON.stringify({
          plugins: [
            {
              options: { configurationPath: registeredPath },
              plugin: "@conformetry/nx",
            },
          ],
        }),
        "utf8",
      );

      await expect(
        service.runValidation({
          options: {},
          project: WIDGETS,
          workspaceRoot,
        }),
      ).rejects.toThrow("which does not exist");
    });
  });
});
