import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";

import { InputService } from "../input/input.service";
import { OverrideResolutionService } from "../override-resolution/override-resolution.service";

import { ConfigurationLoaderService } from "./configuration-loader.service";
import {
  codependixConfigurationSchema,
  ConfigurationFileNotFoundError,
  DEFAULT_INCLUDE_GLOBS,
} from "./configuration.constants";
import { ConfigurationService } from "./configuration.service";
import { FlagResolutionService } from "./flag-resolution.service";

import type {
  CodependixBoundaryRule,
  CodependixProjectConfiguration,
  ResolvedCodependixConfiguration,
} from "./configuration.types";

/** Writes a JSON configuration holding whatever the caller passes. */
async function writeConfiguration(configuration: unknown): Promise<string> {
  return writeConfigurationFile(
    "codependix.config.json",
    JSON.stringify(configuration),
  );
}

/** Writes a configuration file of the given name into a fresh temp directory. */
async function writeConfigurationFile(
  fileName: string,
  contents: string,
): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), "codependix-config-"));
  const configurationPath = path.join(directory, fileName);

  await writeFile(configurationPath, contents, "utf8");

  return configurationPath;
}

describe(ConfigurationService, () => {
  let service: ConfigurationService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ConfigurationService,
        ConfigurationLoaderService,
        FlagResolutionService,
        InputService,
        OverrideResolutionService,
      ],
    }).compile();

    service = await module.resolve(ConfigurationService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("loading", () => {
    it("falls back to defaults when no configuration file exists", async () => {
      const searchDirectory = await mkdtemp(
        path.join(tmpdir(), "codependix-empty-"),
      );

      const configuration = await service.loadConfiguration({
        searchDirectory,
      });

      expect(configuration.include).toStrictEqual([...DEFAULT_INCLUDE_GLOBS]);
      expect(configuration.exclude).toStrictEqual([]);
    });

    it("discovers a configuration file in the search directory", async () => {
      const configurationPath = await writeConfiguration({
        exclude: ["scratch-*"],
      });

      const configuration = await service.loadConfiguration({
        searchDirectory: path.dirname(configurationPath),
      });

      expect(configuration.exclude).toStrictEqual(["scratch-*"]);
    });

    it("reads a TypeScript configuration's default export", async () => {
      const configurationPath = await writeConfigurationFile(
        "codependix.config.ts",
        `interface Configuration { include: string[] }
        const configuration: Configuration = { include: ["packages/*"] };
        export default configuration;
        `,
      );

      const configuration = await service.loadConfiguration({
        configurationPath,
      });

      expect(configuration.include).toStrictEqual(["packages/*"]);
    });

    it("unwraps a CommonJS module's nested default export", async () => {
      const configurationPath = await writeConfigurationFile(
        "codependix.config.cjs",
        'module.exports = { default: { include: ["packages/*"] } };',
      );

      const configuration = await service.loadConfiguration({
        configurationPath,
      });

      expect(configuration.include).toStrictEqual(["packages/*"]);
    });

    it("searches the process cwd when no directory is given", async () => {
      const configurationPath = await writeConfiguration({
        include: ["packages/from-cwd"],
      });
      const cwdSpy = vi
        .spyOn(process, "cwd")
        .mockReturnValue(path.dirname(configurationPath));

      const configuration = await service.loadConfiguration();

      expect(configuration.include).toStrictEqual(["packages/from-cwd"]);

      cwdSpy.mockRestore();
    });

    it("falls back to defaults when the module exports no object", async () => {
      const configurationPath = await writeConfigurationFile(
        "codependix.config.ts",
        "export default 42;",
      );

      const configuration = await service.loadConfiguration({
        configurationPath,
      });

      expect(configuration.include).toStrictEqual([...DEFAULT_INCLUDE_GLOBS]);
    });

    it("rejects a malformed configuration", async () => {
      const configurationPath = await writeConfiguration({
        include: "not-an-array",
      });

      await expect(
        service.loadConfiguration({ configurationPath }),
      ).rejects.toBeInstanceOf(ZodError);
    });

    it("throws a typed error for an unsupported extension", async () => {
      const configurationPath = await writeConfigurationFile(
        "codependix.config.yaml",
        "include: []",
      );

      await expect(
        service.loadConfiguration({ configurationPath }),
      ).rejects.toThrow(/Unsupported configuration file type/);
    });

    it("throws a typed error for a configuration path that does not exist", async () => {
      await expect(
        service.loadConfiguration({
          configurationPath: "configuration/missing.config.ts",
        }),
      ).rejects.toBeInstanceOf(ConfigurationFileNotFoundError);
    });

    it("throws when no workspace root holds the relative path either", async () => {
      const searchDirectory = await mkdtemp(
        path.join(tmpdir(), "codependix-rootless-"),
      );
      const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(searchDirectory);

      await expect(
        service.loadConfiguration({
          configurationPath: "configuration/codependix.config.ts",
        }),
      ).rejects.toBeInstanceOf(ConfigurationFileNotFoundError);

      cwdSpy.mockRestore();
    });

    it("resolves a configuration path relative to the workspace root", async () => {
      const configuration = await service.loadConfiguration({
        configurationPath:
          "projects/ic-suite/codependix/codependix-configuration/package.json",
      });

      // package.json parses as JSON and validates as an (empty) configuration.
      expect(configuration.include).toStrictEqual([...DEFAULT_INCLUDE_GLOBS]);
    });

    it("rejects a graph output naming a json target with no json destination", async () => {
      const configurationPath = await writeConfiguration({
        workspace: { nxProjects: { target: "json" } },
      });

      await expect(
        service.loadConfiguration({ configurationPath }),
      ).rejects.toBeInstanceOf(ZodError);
    });

    it("rejects a graph output naming a markdown target with no markdown destination", async () => {
      const configurationPath = await writeConfiguration({
        workspace: { nxProjects: { target: "markdown" } },
      });

      await expect(
        service.loadConfiguration({ configurationPath }),
      ).rejects.toBeInstanceOf(ZodError);
    });

    it("rejects a both target missing either destination", async () => {
      const configurationPath = await writeConfiguration({
        workspace: {
          nxProjects: { json: { path: "codependix-nx.json" }, target: "both" },
        },
      });

      await expect(
        service.loadConfiguration({ configurationPath }),
      ).rejects.toBeInstanceOf(ZodError);
    });

    it("rejects a markdown destination naming neither an anchor nor a path", async () => {
      const configurationPath = await writeConfiguration({
        workspace: { nxProjects: { markdown: {}, target: "markdown" } },
      });

      await expect(
        service.loadConfiguration({ configurationPath }),
      ).rejects.toBeInstanceOf(ZodError);
    });

    it("accepts a fully configured graph output", async () => {
      const configurationPath = await writeConfiguration({
        workspace: {
          nxProjects: {
            json: { path: "codependix-nx.json" },
            markdown: { anchor: "codependix-nx" },
            target: "both",
          },
        },
      });

      const configuration = await service.loadConfiguration({
        configurationPath,
      });

      expect(configuration.workspace.nxProjects?.target).toBe("both");
    });
  });

  describe("overrides", () => {
    it("overrides a declared include for the run", async () => {
      const configurationPath = await writeConfiguration({
        include: ["packages/**"],
      });

      const configuration = await service.loadConfiguration({
        configurationPath,
        overrides: { include: ["applications/**"] },
      });

      expect(configuration.include).toStrictEqual(["applications/**"]);
    });

    it("overrides a declared exclude for the run", async () => {
      const configurationPath = await writeConfiguration({
        exclude: ["scratch-*"],
        include: ["packages/**"],
      });

      const configuration = await service.loadConfiguration({
        configurationPath,
        overrides: { exclude: ["fixtures-*"] },
      });

      expect(configuration.exclude).toStrictEqual(["fixtures-*"]);
    });

    it("refuses to override include when the configuration never declared it", async () => {
      const configurationPath = await writeConfiguration({
        exclude: ["scratch-*"],
      });

      await expect(
        service.loadConfiguration({
          configurationPath,
          overrides: { include: ["applications/**"] },
        }),
      ).rejects.toThrow(
        "--include overrides a value the configuration does not declare. Add `include` to the configuration this run reads, then use --include to change it.",
      );
    });

    it("refuses to override exclude when the configuration never declared it", async () => {
      const configurationPath = await writeConfiguration({
        include: ["packages/**"],
      });

      await expect(
        service.loadConfiguration({
          configurationPath,
          overrides: { exclude: ["fixtures-*"] },
        }),
      ).rejects.toThrow(
        "--exclude overrides a value the configuration does not declare. Add `exclude` to the configuration this run reads, then use --exclude to change it.",
      );
    });

    it("refuses an override when no configuration file exists at all", async () => {
      const searchDirectory = await mkdtemp(
        path.join(tmpdir(), "codependix-empty-"),
      );

      await expect(
        service.loadConfiguration({
          overrides: { include: ["applications/**"] },
          searchDirectory,
        }),
      ).rejects.toThrow(
        "--include overrides a value the configuration does not declare. Add `include` to the configuration this run reads, then use --include to change it.",
      );
    });

    it("leaves the configuration untouched when no override is given", async () => {
      const configurationPath = await writeConfiguration({
        include: ["packages/**"],
      });

      const configuration = await service.loadConfiguration({
        configurationPath,
      });

      expect(configuration.include).toStrictEqual(["packages/**"]);
    });

    it("ignores an empty override list, the same as an absent one", async () => {
      const configurationPath = await writeConfiguration({
        include: ["packages/**"],
      });

      const configuration = await service.loadConfiguration({
        configurationPath,
        overrides: { include: [] },
      });

      expect(configuration.include).toStrictEqual(["packages/**"]);
    });
  });

  describe("boundaries", () => {
    it("resolves every level to an empty list when none is declared", () => {
      expect(service.resolveConfiguration({}).boundaries).toStrictEqual({
        fileImports: { python: [], typescript: [] },
        nestjsModules: [],
        nxProjects: [],
      });
    });

    it("keeps the rules a level declares", () => {
      const rule: CodependixBoundaryRule = {
        from: { tags: ["type:application"] },
        kind: "forbid",
        name: "applications-are-leaves",
        to: { tags: ["type:application"] },
      };

      expect(
        service.resolveConfiguration({ boundaries: { nxProjects: [rule] } })
          .boundaries,
      ).toStrictEqual({
        fileImports: { python: [], typescript: [] },
        nestjsModules: [],
        nxProjects: [rule],
      });
    });

    it("keeps fileImports rules nested by language", () => {
      const typescriptRule: CodependixBoundaryRule = {
        from: { path: ["**/*.types.ts"] },
        kind: "forbid",
        name: "types-files-do-not-reach-services",
        to: { path: ["**/*.service.ts"] },
      };
      const pythonRule: CodependixBoundaryRule = {
        from: { path: ["**/settings.py"] },
        kind: "forbid",
        name: "settings-do-not-reach-scanners",
        to: { path: ["**/scanner.py"] },
      };

      expect(
        service.resolveConfiguration({
          boundaries: {
            fileImports: { python: [pythonRule], typescript: [typescriptRule] },
          },
        }).boundaries,
      ).toStrictEqual({
        fileImports: { python: [pythonRule], typescript: [typescriptRule] },
        nestjsModules: [],
        nxProjects: [],
      });
    });

    it("resolves a fileImports language naming no rules to an empty list", () => {
      const typescriptRule: CodependixBoundaryRule = {
        from: { path: ["**/*.types.ts"] },
        kind: "forbid",
        name: "types-files-do-not-reach-services",
        to: { path: ["**/*.service.ts"] },
      };

      expect(
        service.resolveConfiguration({
          boundaries: { fileImports: { typescript: [typescriptRule] } },
        }).boundaries.fileImports,
      ).toStrictEqual({ python: [], typescript: [typescriptRule] });
    });

    it("accepts an access rule and an acyclic rule at the same level", () => {
      const parsed = codependixConfigurationSchema.safeParse({
        boundaries: {
          fileImports: {
            typescript: [
              {
                from: { path: ["**/*.types.ts"] },
                kind: "forbid",
                message: "Types are the leaf of a module.",
                name: "types-files-do-not-reach-services",
                to: { path: ["**/*.service.ts"] },
              },
              {
                kind: "acyclic",
                name: "no-cycles",
                nodes: { path: ["src/**"] },
              },
            ],
          },
        },
      });

      expect(parsed.success).toBe(true);
    });

    it("accepts a Python rule under fileImports.python independently of typescript", () => {
      const parsed = codependixConfigurationSchema.safeParse({
        boundaries: {
          fileImports: {
            python: [
              {
                from: { path: ["**/settings.py"] },
                kind: "forbid",
                name: "settings-do-not-reach-scanners",
                to: { path: ["**/scanner.py"] },
              },
            ],
          },
        },
      });

      expect(parsed.success).toBe(true);
    });

    it("refuses a selector naming no field at all", () => {
      const parsed = codependixConfigurationSchema.safeParse({
        boundaries: {
          nxProjects: [
            { from: {}, kind: "forbid", name: "empty", to: { id: ["a"] } },
          ],
        },
      });

      expect(parsed.success).toBe(false);
    });

    it("refuses a rule kind it does not know", () => {
      const parsed = codependixConfigurationSchema.safeParse({
        boundaries: {
          nxProjects: [
            { from: { id: ["a"] }, kind: "warn", name: "x", to: { id: ["b"] } },
          ],
        },
      });

      expect(parsed.success).toBe(false);
    });

    it("refuses a rule with no name", () => {
      const parsed = codependixConfigurationSchema.safeParse({
        boundaries: { nxProjects: [{ kind: "acyclic", name: "" }] },
      });

      expect(parsed.success).toBe(false);
    });
  });

  describe("resolveForProject", () => {
    /** A project's own loaded `codependix.config.ts`, for these tests. */
    const ownFile: CodependixProjectConfiguration = {
      nxProjects: { markdown: { anchor: "nx" }, target: "markdown" },
    };

    // Participation is declared: naming an own file alone selects nothing.
    it("resolves to none for a configuration naming no include", () => {
      const configuration = service.resolveConfiguration({});

      expect(configuration.include).toStrictEqual([]);
      expect(
        service.resolveForProject({
          configuration,
          graphType: "nxProjects",
          projectConfiguration: ownFile,
          projectName: "codependix-nx",
        }),
      ).toStrictEqual({ json: undefined, markdown: undefined, target: "none" });
    });

    it("resolves to none for an included project with no configuration file of its own", () => {
      const configuration = service.resolveConfiguration({
        include: ["**"],
      });

      expect(
        service.resolveForProject({
          configuration,
          graphType: "nxProjects",
          projectConfiguration: undefined,
          projectName: "codependix-nx",
        }),
      ).toStrictEqual({ json: undefined, markdown: undefined, target: "none" });
    });

    it("resolves to none when the project's own file names no override for the graph type", () => {
      const configuration = service.resolveConfiguration({
        include: ["**"],
      });

      expect(
        service.resolveForProject({
          configuration,
          graphType: "fileImports",
          projectConfiguration: ownFile,
          projectName: "codependix-nx",
        }),
      ).toStrictEqual({ json: undefined, markdown: undefined, target: "none" });
    });

    it("resolves an included project's own file for the graph type it declares", () => {
      const configuration = service.resolveConfiguration({
        include: ["**"],
      });

      const resolved = service.resolveForProject({
        configuration,
        graphType: "nxProjects",
        projectConfiguration: ownFile,
        projectName: "codependix-nx",
      });

      expect(resolved).toStrictEqual({
        json: undefined,
        markdown: { anchor: "nx", path: "README.md" },
        target: "markdown",
      });
    });

    it("reads a project's own file as-is, with no merge against anything else", () => {
      const configuration = service.resolveConfiguration({
        include: ["**"],
      });
      const projectConfiguration: CodependixProjectConfiguration = {
        nxProjects: { json: { path: "graph.json" }, target: "json" },
      };

      const resolved = service.resolveForProject({
        configuration,
        graphType: "nxProjects",
        projectConfiguration,
        projectName: "codependix-nx",
      });

      expect(resolved).toStrictEqual({
        json: { path: "graph.json" },
        markdown: undefined,
        target: "json",
      });
    });

    it("defaults an anchor destination's markdown path to README.md", () => {
      const configuration = service.resolveConfiguration({
        include: ["**"],
      });

      const resolved = service.resolveForProject({
        configuration,
        graphType: "nxProjects",
        projectConfiguration: ownFile,
        projectName: "any-project",
      });

      expect(resolved.markdown?.path).toBe("README.md");
    });

    it("keeps a standalone markdown path a project names for itself", () => {
      const configuration = service.resolveConfiguration({
        include: ["**"],
      });
      const projectConfiguration: CodependixProjectConfiguration = {
        nxProjects: {
          markdown: { path: "docs/dependency-graph.md" },
          target: "markdown",
        },
      };

      const resolved = service.resolveForProject({
        configuration,
        graphType: "nxProjects",
        projectConfiguration,
        projectName: "any-project",
      });

      expect(resolved.markdown).toStrictEqual({
        anchor: undefined,
        path: "docs/dependency-graph.md",
      });
    });

    it("excludes a project matching an exclude glob even with its own configuration file", () => {
      const configuration = service.resolveConfiguration({
        exclude: ["excluded-*"],
        include: ["**"],
      });

      const resolved = service.resolveForProject({
        configuration,
        graphType: "nxProjects",
        projectConfiguration: ownFile,
        projectName: "excluded-project",
      });

      expect(resolved.target).toBe("none");
    });

    it("excludes a project matching no include glob", () => {
      const configuration = service.resolveConfiguration({
        include: ["packages/*"],
      });

      const resolved = service.resolveForProject({
        configuration,
        graphType: "nxProjects",
        projectConfiguration: ownFile,
        projectName: "tools-something",
      });

      expect(resolved.target).toBe("none");
    });

    it("includes a project matching the configured include glob", () => {
      const configuration = service.resolveConfiguration({
        include: ["packages/*"],
      });

      expect(
        service.isProjectIncluded({
          configuration,
          projectName: "packages/codependix-nx-projects",
        }),
      ).toBe(true);
    });

    it("includes a project whose root matches an include glob its name does not", () => {
      const configuration = service.resolveConfiguration({
        include: ["packages/*"],
      });
      const projectConfiguration: CodependixProjectConfiguration = {
        nxProjects: { target: "json" },
      };

      const resolved = service.resolveForProject({
        configuration,
        graphType: "nxProjects",
        projectConfiguration,
        projectName: "codependix-nx",
        projectRoot: "packages/codependix-nx",
      });

      expect(resolved.target).not.toBe("none");
    });

    it("excludes a project whose root matches an exclude glob its name does not", () => {
      const configuration = service.resolveConfiguration({
        exclude: ["packages/excluded-*"],
        include: ["**"],
      });

      const resolved = service.resolveForProject({
        configuration,
        graphType: "nxProjects",
        projectConfiguration: ownFile,
        projectName: "kept-name",
        projectRoot: "packages/excluded-project",
      });

      expect(resolved.target).toBe("none");
    });
  });

  describe("loadProjectConfiguration", () => {
    it("returns undefined when a project has no configuration file of its own", async () => {
      const projectRoot = await mkdtemp(
        path.join(tmpdir(), "codependix-project-none-"),
      );

      await expect(
        service.loadProjectConfiguration({ projectRoot }),
      ).resolves.toBeUndefined();
    });

    it("loads and validates a project's own configuration file", async () => {
      const configurationPath = await writeConfiguration({
        nxProjects: { markdown: { anchor: "example" }, target: "markdown" },
      });

      const projectConfiguration = await service.loadProjectConfiguration({
        projectRoot: path.dirname(configurationPath),
      });

      expect(projectConfiguration).toStrictEqual({
        nxProjects: { markdown: { anchor: "example" }, target: "markdown" },
      });
    });

    it("never walks upward past the project's own root", async () => {
      const workspaceConfigurationPath = await writeConfiguration({
        nxProjects: { markdown: { anchor: "workspace" }, target: "markdown" },
      });
      const projectRoot = path.join(
        path.dirname(workspaceConfigurationPath),
        "nested-project",
      );

      await mkdir(projectRoot, { recursive: true });

      await expect(
        service.loadProjectConfiguration({ projectRoot }),
      ).resolves.toBeUndefined();
    });

    it("rejects a project configuration file naming an unknown graph type", async () => {
      const configurationPath = await writeConfiguration({
        notAGraphType: { target: "markdown" },
      });

      const projectConfiguration = await service.loadProjectConfiguration({
        projectRoot: path.dirname(configurationPath),
      });

      // Zod strips unknown keys, matching root configuration parsing.
      expect(projectConfiguration).toStrictEqual({});
    });

    it("rejects a malformed project configuration file", async () => {
      const configurationPath = await writeConfiguration({
        nxProjects: { target: "not-a-target" },
      });

      await expect(
        service.loadProjectConfiguration({
          projectRoot: path.dirname(configurationPath),
        }),
      ).rejects.toBeInstanceOf(ZodError);
    });
  });

  describe("projectGraph", () => {
    it("carries the path a configuration named", () => {
      expect(
        service.resolveConfiguration({ projectGraph: "artifacts/graph.json" })
          .projectGraph,
      ).toBe("artifacts/graph.json");
    });

    it("leaves it unset when a configuration names none", () => {
      expect(service.resolveConfiguration({}).projectGraph).toBeUndefined();
    });

    it("refuses a projectGraph that is not a path", () => {
      const parsed = codependixConfigurationSchema.safeParse({
        projectGraph: 42,
      });

      expect(parsed.success).toBe(false);
    });
  });

  describe("workspace", () => {
    it("accepts a fileImports workspace section, the same CodependixGraphOutput shape as nxProjects", () => {
      const parsed = codependixConfigurationSchema.safeParse({
        workspace: {
          fileImports: {
            markdown: { anchor: "codependix-workspace-file-imports" },
            target: "markdown",
          },
        },
      });

      expect(parsed.success).toBe(true);
    });

    it("accepts a nestjsModules workspace section, the same CodependixGraphOutput shape as nxProjects", () => {
      const parsed = codependixConfigurationSchema.safeParse({
        workspace: {
          nestjsModules: {
            markdown: { anchor: "codependix-workspace-nestjs-modules" },
            target: "markdown",
          },
        },
      });

      expect(parsed.success).toBe(true);
    });

    it("accepts all three workspace graph types declared together", () => {
      const parsed = codependixConfigurationSchema.safeParse({
        workspace: {
          fileImports: { markdown: { anchor: "workspace-file-imports" } },
          nestjsModules: { markdown: { anchor: "workspace-nestjs-modules" } },
          nxProjects: { markdown: { anchor: "workspace" } },
        },
      });

      expect(parsed.success).toBe(true);
    });

    it("refuses a fileImports workspace section missing its markdown destination for a markdown target", () => {
      const parsed = codependixConfigurationSchema.safeParse({
        workspace: { fileImports: { target: "markdown" } },
      });

      expect(parsed.success).toBe(false);
    });
  });

  describe("a command-line selection", () => {
    /** Resolves a configuration whose only include glob is `packages/*`. */
    function buildConfiguration(
      selection: { projects?: string; tags?: string } = {},
    ): ResolvedCodependixConfiguration {
      return service.resolveConfiguration(
        { include: ["packages/*"] },
        selection,
      );
    }

    it("splits a comma-separated argument, trimming and dropping blanks", () => {
      expect(
        buildConfiguration({ projects: " widgets , ,tools/reporting," })
          .selection.projects,
      ).toStrictEqual(["widgets", "tools/reporting"]);
    });

    it("resolves to empty lists when nothing was named", () => {
      expect(buildConfiguration().selection).toStrictEqual({
        projects: [],
        tags: [],
      });
    });

    describe("isProjectIncluded", () => {
      it("widens rather than replaces what include already selected", () => {
        const configuration = buildConfiguration({ projects: "widgets" });

        expect(
          service.isProjectIncluded({
            configuration,
            projectName: "packages/codependix-nx-projects",
          }),
        ).toBe(true);
        expect(
          service.isProjectIncluded({ configuration, projectName: "widgets" }),
        ).toBe(true);
      });

      it("matches a --projects glob against a name or a root", () => {
        const configuration = buildConfiguration({ projects: "tools/*" });

        expect(
          service.isProjectIncluded({
            configuration,
            projectName: "reporting",
            projectRoot: "tools/reporting",
          }),
        ).toBe(true);
      });

      it("matches a --tags entry against the project's own tags", () => {
        const configuration = buildConfiguration({
          tags: "framework:nestjs",
        });

        expect(
          service.isProjectIncluded({
            configuration,
            projectName: "widgets",
            projectTags: ["framework:nestjs", "type:package"],
          }),
        ).toBe(true);
        expect(
          service.isProjectIncluded({
            configuration,
            projectName: "widgets",
            projectTags: ["framework:react"],
          }),
        ).toBe(false);
      });

      // A flag that could resurrect an excluded project would make `exclude`
      // advisory rather than a statement that a project is never exported.
      it("lets exclude win over a project the command line named", () => {
        const configuration = service.resolveConfiguration(
          { exclude: ["widgets"], include: ["**"] },
          { projects: "widgets" },
        );

        expect(
          service.isProjectIncluded({ configuration, projectName: "widgets" }),
        ).toBe(false);
      });
    });

    describe("isProjectSelected", () => {
      // What keeps the workspace graph and the boundary gate whole by default.
      it("selects every project when no selection was named", () => {
        expect(
          service.isProjectSelected({
            configuration: buildConfiguration(),
            projectName: "anything-at-all",
          }),
        ).toBe(true);
      });

      it("narrows to what a selection named", () => {
        const configuration = buildConfiguration({ projects: "widgets" });

        expect(
          service.isProjectSelected({ configuration, projectName: "widgets" }),
        ).toBe(true);
        expect(
          service.isProjectSelected({
            configuration,
            projectName: "packages/codependix-nx-projects",
          }),
        ).toBe(false);
      });

      // `include` is about which projects get exports written, and has never
      // reached the workspace graph or the gate. A selection reaches all three.
      it("ignores include entirely", () => {
        const configuration = service.resolveConfiguration({ include: [] }, {});

        expect(
          service.isProjectSelected({ configuration, projectName: "widgets" }),
        ).toBe(true);
      });
    });
  });

  describe("resolveForWorkspace", () => {
    it("resolves to none when the configuration names no workspace section", () => {
      const configuration = service.resolveConfiguration({});

      expect(
        service.resolveForWorkspace(configuration, "nxProjects"),
      ).toStrictEqual({
        json: undefined,
        markdown: undefined,
        target: "none",
      });
    });

    it("reads the workspace section's nx export configuration", () => {
      const configuration = service.resolveConfiguration({
        workspace: {
          nxProjects: {
            json: { path: "codependix-workspace-graph.json" },
            markdown: { anchor: "workspace" },
            target: "both",
          },
        },
      });

      expect(
        service.resolveForWorkspace(configuration, "nxProjects"),
      ).toStrictEqual({
        json: { path: "codependix-workspace-graph.json" },
        markdown: { anchor: "workspace", path: "README.md" },
        target: "both",
      });
    });

    it("reads the workspace section's fileImports export configuration", () => {
      const configuration = service.resolveConfiguration({
        workspace: {
          fileImports: {
            markdown: { anchor: "codependix-workspace-file-imports" },
            target: "markdown",
          },
        },
      });

      expect(
        service.resolveForWorkspace(configuration, "fileImports"),
      ).toStrictEqual({
        json: undefined,
        markdown: {
          anchor: "codependix-workspace-file-imports",
          path: "README.md",
        },
        target: "markdown",
      });
    });

    it("reads the workspace section's nestjsModules export configuration", () => {
      const configuration = service.resolveConfiguration({
        workspace: {
          nestjsModules: {
            markdown: { anchor: "codependix-workspace-nestjs-modules" },
            target: "markdown",
          },
        },
      });

      expect(
        service.resolveForWorkspace(configuration, "nestjsModules"),
      ).toStrictEqual({
        json: undefined,
        markdown: {
          anchor: "codependix-workspace-nestjs-modules",
          path: "README.md",
        },
        target: "markdown",
      });
    });

    // Each graph type's workspace destination is independent: naming one
    // never resolves another that was never declared.
    it("resolves each graph type's workspace section independently", () => {
      const configuration = service.resolveConfiguration({
        workspace: {
          nxProjects: { markdown: { anchor: "workspace" }, target: "markdown" },
        },
      });

      expect(
        service.resolveForWorkspace(configuration, "fileImports"),
      ).toStrictEqual({ json: undefined, markdown: undefined, target: "none" });
      expect(
        service.resolveForWorkspace(configuration, "nestjsModules"),
      ).toStrictEqual({ json: undefined, markdown: undefined, target: "none" });
    });

    it("is unaffected by include and exclude globs", () => {
      const configuration = service.resolveConfiguration({
        exclude: ["**"],
        include: [],
        workspace: {
          nxProjects: { markdown: { anchor: "workspace" }, target: "markdown" },
        },
      });

      expect(
        service.resolveForWorkspace(configuration, "nxProjects").target,
      ).toBe("markdown");
    });

    it("resolves an explicit workspace configuration built without loading a file", async () => {
      const configurationPath = await writeConfiguration({
        workspace: {
          nxProjects: { json: { path: "graph.json" }, target: "json" },
        },
      });

      const configuration = await service.loadConfiguration({
        configurationPath,
      });

      expect(
        service.resolveForWorkspace(configuration, "nxProjects"),
      ).toStrictEqual({
        json: { path: "graph.json" },
        markdown: undefined,
        target: "json",
      });
    });
  });

  // The one public service answers both halves of "what is this run
  // configured to do": the configuration file above, and the command line
  // here. Nothing else in this package is exported, so a host that could not
  // ask these of `ConfigurationService` could not ask them at all.
  describe("the command line", () => {
    it("trims an optional option and reads blank as absent", () => {
      expect(service.parseOptionalOption("  graph.json  ")).toBe("graph.json");
      expect(service.parseOptionalOption("   ")).toBeUndefined();
      expect(service.parseOptionalOption(undefined)).toBeUndefined();
    });

    it("falls back to the working directory for a path option", () => {
      expect(service.parsePathOption("  packages  ")).toBe("packages");
      expect(service.parsePathOption(undefined)).toBe(process.cwd());
    });

    it("splits a comma-separated option, dropping blank entries", () => {
      expect(service.parseCommaDelimitedOption("a, ,b,")).toStrictEqual([
        "a",
        "b",
      ]);
      expect(service.parseCommaDelimitedOption(undefined)).toStrictEqual([]);
    });

    it("reads a valueless flag as present", () => {
      expect(service.parseFlagOption(undefined)).toBe(true);
      expect(service.parseFlagOption(false)).toBe(false);
    });

    it("selects the mode the flags asked for", async () => {
      const { errors, mode } = await service.selectMode({
        check: "boundaries",
      });

      expect(errors).toStrictEqual([]);
      expect(mode).toStrictEqual({
        checksBoundaries: true,
        checksReports: false,
        writes: false,
      });
    });

    it("refuses --write combined with --check reports", async () => {
      const { errors } = await service.selectMode({
        check: "reports",
        write: true,
      });

      expect(errors).toHaveLength(1);
    });

    it("knows which modes touch the files an export lives in", () => {
      expect(
        service.touchesFiles({
          checksBoundaries: true,
          checksReports: false,
          writes: false,
        }),
      ).toBe(false);
      expect(
        service.touchesFiles({
          checksBoundaries: false,
          checksReports: false,
          writes: true,
        }),
      ).toBe(true);
    });
  });
});
