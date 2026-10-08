import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";

import { ConfigurationFileService } from "./configuration-file.service";
import {
  ConfigurationFileNotFoundError,
  DEFAULT_ENTRY_POINT_DECORATORS,
  DEFAULT_EXCLUDE_GLOBS,
  DEFAULT_JSON_INDENTATION,
  DEFAULT_MARKDOWN_END_MARKER,
  DEFAULT_MARKDOWN_START_MARKER,
  DEFAULT_MAXIMUM_DEPTH,
  DEFAULT_PREVIEW_COUNT,
  DEFAULT_RUN_HEADING,
  UnknownConfigurationFileTypeError,
} from "./configuration.constants";

/** Writes a JSON configuration holding whatever the caller passes. */
async function writeConfiguration(configuration: unknown): Promise<string> {
  return writeConfigurationFile(
    "callidescope.config.json",
    JSON.stringify(configuration),
  );
}

/** Writes a configuration file of the given name into a fresh temp directory. */
async function writeConfigurationFile(
  fileName: string,
  contents: string,
): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), "callidescope-config-"));
  const configurationPath = path.join(directory, fileName);

  await writeFile(configurationPath, contents, "utf8");

  return configurationPath;
}

describe(ConfigurationFileService, () => {
  let service: ConfigurationFileService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [ConfigurationFileService],
    }).compile();

    service = await module.resolve(ConfigurationFileService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  // 🌱 Defaults

  it("falls back to defaults when no configuration file exists", async () => {
    const searchDirectory = await mkdtemp(
      path.join(tmpdir(), "callidescope-empty-"),
    );

    const configuration = await service.loadConfiguration({ searchDirectory });

    expect(configuration.exclude).toStrictEqual([...DEFAULT_EXCLUDE_GLOBS]);
    expect(configuration.excludeFrom).toStrictEqual([]);
    expect(configuration.excludeCallees).toStrictEqual([]);
    expect(configuration.directories).toStrictEqual([]);
    expect(configuration.write.json).toBeUndefined();
    expect(configuration.write.markdown).toBeUndefined();
  });

  it("applies every limit default", () => {
    const configuration = service.resolveConfiguration({});

    expect(configuration.limits).toStrictEqual({
      maximumBreadth: undefined,
      maximumDepth: DEFAULT_MAXIMUM_DEPTH,
    });
  });

  it("leaves the breadth limit unset when no default exists for it", () => {
    const configuration = service.resolveConfiguration({});

    expect(configuration.limits.maximumBreadth).toBeUndefined();
  });

  it("keeps an authored breadth limit", () => {
    const configuration = service.resolveConfiguration({
      limits: { maximumBreadth: 5 },
    });

    expect(configuration.limits.maximumBreadth).toBe(5);
  });

  it("rejects a breadth limit that is not a positive integer", async () => {
    const configurationPath = await writeConfiguration({
      limits: { maximumBreadth: 0 },
    });

    await expect(
      service.loadConfiguration({ configurationPath }),
    ).rejects.toThrow(ZodError);
  });

  it("applies every entry-point default", () => {
    const configuration = service.resolveConfiguration({});

    expect(configuration.entryPoints).toStrictEqual({
      addresses: [],
      decorators: [...DEFAULT_ENTRY_POINT_DECORATORS],
      includeExportedFunctions: true,
      includeOrphans: true,
      includeTests: false,
    });
  });

  // 🎛️ Overrides

  it("keeps an authored limit and defaults the rest", () => {
    const configuration = service.resolveConfiguration({
      limits: { maximumDepth: 12 },
    });

    expect(configuration.limits.maximumDepth).toBe(12);
    expect(configuration.limits.maximumBreadth).toBeUndefined();
  });

  it("keeps authored callee-exclusion globs", () => {
    const configuration = service.resolveConfiguration({
      excludeCallees: ["LoggerService.*"],
    });

    expect(configuration.excludeCallees).toStrictEqual(["LoggerService.*"]);
  });

  it("keeps authored entry-point rules, including disabling them", () => {
    const configuration = service.resolveConfiguration({
      entryPoints: {
        addresses: ["packages/example/src/index.ts#publicApi"],
        decorators: ["Get"],
        includeExportedFunctions: false,
        includeOrphans: false,
        includeTests: true,
      },
    });

    expect(configuration.entryPoints).toStrictEqual({
      addresses: ["packages/example/src/index.ts#publicApi"],
      decorators: ["Get"],
      includeExportedFunctions: false,
      includeOrphans: false,
      includeTests: true,
    });
  });

  it("adds authored exclusions to the defaults rather than replacing them", () => {
    const configuration = service.resolveConfiguration({
      exclude: ["**/fixtures/**"],
    });

    expect(configuration.exclude).toContain("**/fixtures/**");
    expect(configuration.exclude).toContain("**/node_modules/**");
  });

  it("does not duplicate an exclusion the defaults already hold", () => {
    const configuration = service.resolveConfiguration({
      exclude: ["**/dist/**"],
    });

    const occurrences = configuration.exclude.filter(
      (glob) => glob === "**/dist/**",
    );

    expect(occurrences).toHaveLength(1);
  });

  // 📤 Write destinations

  it("defaults the JSON indentation when a path is named", () => {
    const configuration = service.resolveConfiguration({
      write: { json: { path: "output/callidescope.json" } },
    });

    expect(configuration.write.json).toStrictEqual({
      indentation: DEFAULT_JSON_INDENTATION,
      path: "output/callidescope.json",
    });
  });

  it("keeps an authored JSON indentation, zero included", () => {
    const configuration = service.resolveConfiguration({
      write: { json: { indentation: 0, path: "output/callidescope.json" } },
    });

    expect(configuration.write.json?.indentation).toBe(0);
  });

  it("defaults the markdown markers when a path is named", () => {
    const configuration = service.resolveConfiguration({
      write: { markdown: { path: "REPORT.md" } },
    });

    expect(configuration.write.markdown).toStrictEqual({
      description: undefined,
      endMarker: DEFAULT_MARKDOWN_END_MARKER,
      heading: DEFAULT_RUN_HEADING,
      path: "REPORT.md",
      previewCount: DEFAULT_PREVIEW_COUNT,
      render: undefined,
      startMarker: DEFAULT_MARKDOWN_START_MARKER,
      writeBlock: undefined,
    });
  });

  it("keeps authored markdown markers, description, and callbacks", () => {
    const render = (): string => "rendered";
    const writeBlock = (): boolean => true;

    const configuration = service.resolveConfiguration({
      write: {
        markdown: {
          description: "Call stacks",
          endMarker: "<!-- END -->",
          path: "REPORT.md",
          render,
          startMarker: "<!-- START -->",
          writeBlock,
        },
      },
    });

    expect(configuration.write.markdown?.description).toBe("Call stacks");
    expect(configuration.write.markdown?.startMarker).toBe("<!-- START -->");
    expect(configuration.write.markdown?.endMarker).toBe("<!-- END -->");
    expect(configuration.write.markdown?.render).toBe(render);
    expect(configuration.write.markdown?.writeBlock).toBe(writeBlock);
  });

  it("keeps an authored markdown heading", () => {
    const configuration = service.resolveConfiguration({
      write: {
        markdown: { heading: "## 🔭 Callidescope", path: "README.md" },
      },
    });

    expect(configuration.write.markdown?.heading).toBe("## 🔭 Callidescope");
  });

  it("carries an authored heading through the file schema, not only the resolver", async () => {
    // Resolution is not the whole path a configured value travels: a loaded
    // file is parsed by the schema first, and a field the schema does not name
    // is stripped there — silently, with the default appearing in its place
    // and nothing to say the file asked for anything else. That is how the
    // heading configured for this repository's own README came out at `#`
    // while the file said `##`, so the schema is asserted through
    // `loadConfiguration` rather than only through `resolveConfiguration`.
    const configurationPath = await writeConfiguration({
      write: { markdown: { heading: "### Deep", path: "README.md" } },
    });

    const configuration = await service.loadConfiguration({
      configurationPath,
    });

    expect(configuration.write.markdown?.heading).toBe("### Deep");
  });

  it("leaves the diagram destination alone until it is asked for", () => {
    expect(
      service.resolveConfiguration({ write: {} }).write.mermaid,
    ).toBeUndefined();
  });

  it("defaults the diagram destination's markers when a path is named", () => {
    expect(
      service.resolveConfiguration({
        write: { mermaid: { path: "GRAPH.md" } },
      }).write.mermaid,
    ).toStrictEqual({
      description: undefined,
      endMarker: DEFAULT_MARKDOWN_END_MARKER,
      heading: DEFAULT_RUN_HEADING,
      path: "GRAPH.md",
      previewCount: DEFAULT_PREVIEW_COUNT,
      render: undefined,
      startMarker: DEFAULT_MARKDOWN_START_MARKER,
      writeBlock: undefined,
    });
  });

  it("resolves the diagram and markdown destinations independently", () => {
    // Two destinations rather than one with a mode, so a repository can
    // publish the tree and the diagram from the same run.
    const configuration = service.resolveConfiguration({
      write: {
        markdown: { path: "REPORT.md" },
        mermaid: { endMarker: "<!-- END -->", path: "GRAPH.md" },
      },
    });

    expect(configuration.write.markdown?.path).toBe("REPORT.md");
    expect(configuration.write.markdown?.endMarker).toBe(
      DEFAULT_MARKDOWN_END_MARKER,
    );
    expect(configuration.write.mermaid?.path).toBe("GRAPH.md");
    expect(configuration.write.mermaid?.endMarker).toBe("<!-- END -->");
  });

  // 📂 File discovery

  it("discovers a configuration file in the search directory", async () => {
    const configurationPath = await writeConfiguration({
      limits: { maximumDepth: 9 },
    });

    const configuration = await service.loadConfiguration({
      searchDirectory: path.dirname(configurationPath),
    });

    expect(configuration.limits.maximumDepth).toBe(9);
  });

  it("loads a configuration file named explicitly", async () => {
    const configurationPath = await writeConfiguration({
      directories: ["packages/caelundas"],
    });

    const configuration = await service.loadConfiguration({
      configurationPath,
    });

    expect(configuration.directories).toStrictEqual(["packages/caelundas"]);
  });

  it("loads a JSONC configuration, comments included", async () => {
    const configurationPath = await writeConfigurationFile(
      "callidescope.config.jsonc",
      '{\n  // the limit\n  "limits": { "maximumDepth": 4 }\n}',
    );

    const configuration = await service.loadConfiguration({
      configurationPath,
    });

    expect(configuration.limits.maximumDepth).toBe(4);
  });

  it("loads a TypeScript configuration through its default export", async () => {
    const configurationPath = await writeConfigurationFile(
      "callidescope.config.ts",
      "export default { limits: { maximumDepth: 3 } };\n",
    );

    const configuration = await service.loadConfiguration({
      configurationPath,
    });

    expect(configuration.limits.maximumDepth).toBe(3);
  });

  it("treats a module exporting no object as an empty configuration", async () => {
    const configurationPath = await writeConfigurationFile(
      "callidescope.config.ts",
      "export default 42;\n",
    );

    const configuration = await service.loadConfiguration({
      configurationPath,
    });

    expect(configuration.limits.maximumDepth).toBe(DEFAULT_MAXIMUM_DEPTH);
  });

  // 🚨 Failures

  it("throws when an explicitly named configuration file is missing", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "callidescope-gone-"));

    await expect(
      service.loadConfiguration({
        configurationPath: path.join(directory, "callidescope.config.ts"),
      }),
    ).rejects.toThrow(ConfigurationFileNotFoundError);
  });

  // 🌳 Repository-root resolution
  //
  // A task runner sets the cwd to the project rather than the workspace, so a
  // path given relative to the repository root has to survive being resolved
  // from somewhere below it.

  it("resolves a path relative to the repository root", async () => {
    const repositoryRoot = await mkdtemp(
      path.join(tmpdir(), "callidescope-repository-"),
    );
    await writeFile(
      path.join(repositoryRoot, "pnpm-workspace.yaml"),
      "packages: []\n",
      "utf8",
    );
    const nestedDirectory = path.join(repositoryRoot, "packages", "nested");
    await mkdir(nestedDirectory, { recursive: true });
    await writeFile(
      path.join(repositoryRoot, "callidescope.config.json"),
      JSON.stringify({ limits: { maximumDepth: 11 } }),
      "utf8",
    );

    const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(nestedDirectory);

    try {
      const configuration = await service.loadConfiguration({
        configurationPath: "callidescope.config.json",
      });

      expect(configuration.limits.maximumDepth).toBe(11);
    } finally {
      cwdSpy.mockRestore();
    }
  });

  it("throws when the path is missing at the repository root too", async () => {
    const repositoryRoot = await mkdtemp(
      path.join(tmpdir(), "callidescope-repository-"),
    );
    await writeFile(
      path.join(repositoryRoot, "pnpm-workspace.yaml"),
      "packages: []\n",
      "utf8",
    );

    const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(repositoryRoot);

    try {
      await expect(
        service.loadConfiguration({
          configurationPath: "callidescope.config.json",
        }),
      ).rejects.toThrow(ConfigurationFileNotFoundError);
    } finally {
      cwdSpy.mockRestore();
    }
  });

  it("throws when no repository root is found above the working directory", async () => {
    // A temp directory has no `.git` or `pnpm-workspace.yaml` anywhere above
    // it, so the upward walk reaches the filesystem root and gives up.
    const directory = await mkdtemp(
      path.join(tmpdir(), "callidescope-rootless-"),
    );

    const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(directory);

    try {
      await expect(
        service.loadConfiguration({
          configurationPath: "callidescope.config.json",
        }),
      ).rejects.toThrow(ConfigurationFileNotFoundError);
    } finally {
      cwdSpy.mockRestore();
    }
  });

  it("throws when a configuration file has an unreadable extension", async () => {
    const configurationPath = await writeConfigurationFile(
      "callidescope.config.yaml",
      "limits:\n  maximumDepth: 6\n",
    );

    await expect(
      service.loadConfiguration({ configurationPath }),
    ).rejects.toThrow(UnknownConfigurationFileTypeError);
  });

  it("rejects a limit that is not a positive integer", async () => {
    const configurationPath = await writeConfiguration({
      limits: { maximumDepth: 0 },
    });

    await expect(
      service.loadConfiguration({ configurationPath }),
    ).rejects.toThrow(ZodError);
  });

  it.each([
    ["callerMajorityRatio", 0.8],
    ["directSpreadThreshold", 3],
    ["maximumImplementationCandidates", 8],
    ["minimumCallers", 2],
    ["spreadThreshold", 4],
  ])("refuses the retired limit %s", async (limit, value) => {
    const configurationPath = await writeConfiguration({
      limits: { [limit]: value },
    });

    await expect(
      service.loadConfiguration({ configurationPath }),
    ).rejects.toThrow(ZodError);
  });

  it("refuses a limit nothing in the tool reads", async () => {
    const configurationPath = await writeConfiguration({
      limits: { maximumDepth: 6, maximumWidth: 3 },
    });

    await expect(
      service.loadConfiguration({ configurationPath }),
    ).rejects.toThrow(ZodError);
  });

  it("rejects a JSON output destination with no path", async () => {
    const configurationPath = await writeConfiguration({
      write: { json: { indentation: 2 } },
    });

    await expect(
      service.loadConfiguration({ configurationPath }),
    ).rejects.toThrow(ZodError);
  });

  it("rejects a markdown output destination with no path", async () => {
    const configurationPath = await writeConfiguration({
      write: { markdown: { description: "no path" } },
    });

    await expect(
      service.loadConfiguration({ configurationPath }),
    ).rejects.toThrow(ZodError);
  });

  it("rejects a non-function render callback", async () => {
    const configurationPath = await writeConfiguration({
      write: { markdown: { path: "REPORT.md", render: "not a function" } },
    });

    await expect(
      service.loadConfiguration({ configurationPath }),
    ).rejects.toThrow(ZodError);
  });

  it("rejects an exclusion list holding a non-string", async () => {
    const configurationPath = await writeConfiguration({ exclude: [7] });

    await expect(
      service.loadConfiguration({ configurationPath }),
    ).rejects.toThrow(ZodError);
  });

  it("refuses the retired ignoreCallees field rather than aliasing it", async () => {
    const configurationPath = await writeConfiguration({
      ignoreCallees: ["LoggerService.*"],
    });

    await expect(
      service.loadConfiguration({ configurationPath }),
    ).rejects.toThrow(ZodError);
  });

  it("refuses the retired output field rather than aliasing it", async () => {
    const configurationPath = await writeConfiguration({
      output: { markdown: { path: "REPORT.md" } },
    });

    await expect(
      service.loadConfiguration({ configurationPath }),
    ).rejects.toThrow(ZodError);
  });

  it("refuses a top-level field it has no opinion about", async () => {
    // A field nothing here names used to be stripped in silence, which reads
    // to whoever wrote it exactly like a field that took effect. Every field
    // this tool has ever retired — and every one somebody misspells — arrives
    // through this door, so the door is closed.
    const configurationPath = await writeConfiguration({
      limits: { maximumDepth: 5 },
      unknownFutureOption: true,
    });

    await expect(
      service.loadConfiguration({ configurationPath }),
    ).rejects.toThrow(ZodError);
  });

  it.each([
    ["entryPoints", { entryPoints: { includeGenerated: true } }],
    ["write", { write: { projectReadmes: {} } }],
    ["write.json", { write: { json: { path: "r.json", spaces: 2 } } }],
    ["write.markdown", { write: { markdown: { footer: "x", path: "R.md" } } }],
  ])("refuses an unknown member of %s", async (_field, configuration) => {
    const configurationPath = await writeConfiguration(configuration);

    await expect(
      service.loadConfiguration({ configurationPath }),
    ).rejects.toThrow(ZodError);
  });

  // 👀 Preview Count

  it("defaults the stacks a markdown destination previews", () => {
    const configuration = service.resolveConfiguration({
      write: { markdown: { path: "README.md" } },
    });

    expect(configuration.write.markdown?.previewCount).toBe(
      DEFAULT_PREVIEW_COUNT,
    );
  });

  it("keeps the preview count a markdown destination declared", () => {
    const configuration = service.resolveConfiguration({
      write: { markdown: { path: "README.md", previewCount: 7 } },
    });

    expect(configuration.write.markdown?.previewCount).toBe(7);
  });

  // 🗂️ Loaded Files

  it("reports the file a configuration came from, and what it authored", async () => {
    const configurationPath = await writeConfiguration({
      limits: { maximumDepth: 9 },
    });

    const loaded = await service.loadConfigurationFile({ configurationPath });

    expect(loaded.path).toBe(configurationPath);
    expect(loaded.authored.limits?.maximumDepth).toBe(9);
    expect(loaded.authored.exclude).toBeUndefined();
    expect(loaded.configuration.limits.maximumDepth).toBe(9);
  });

  it("reports no file when the search found none", async () => {
    const searchDirectory = await mkdtemp(
      path.join(tmpdir(), "callidescope-empty-"),
    );

    const loaded = await service.loadConfigurationFile({ searchDirectory });

    expect(loaded.path).toBeUndefined();
    expect(loaded.authored).toStrictEqual({});
    expect(loaded.configuration.limits.maximumDepth).toBe(
      DEFAULT_MAXIMUM_DEPTH,
    );
  });

  it("finds a configuration file sitting directly in a directory", async () => {
    const configurationPath = await writeConfiguration({});

    expect(
      service.findConfigurationFileAt(path.dirname(configurationPath)),
    ).toBe(configurationPath);
  });

  it("finds nothing in a directory holding no configuration file", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "callidescope-empty-"));

    expect(service.findConfigurationFileAt(directory)).toBeUndefined();
  });
});
