import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  ConfigurationFileNotFoundError,
  InvalidConfigurationError,
  InvalidLimitValueError,
  UnknownConfigurationFileTypeError,
} from "@codometer/core";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { ConfigurationFlagsService } from "./configuration-flags.service";
import { ConfigurationLoaderService } from "./configuration-loader.service";
import { ConfigurationResolverService } from "./configuration-resolver.service";
import {
  DEFAULT_CUSTOM_STATISTIC_COLORS,
  DEFAULT_INPUT_COMPRESSION,
  DEFAULT_INPUT_DIRECTORY,
  DEFAULT_INPUT_NAME,
  DEFAULT_JSON_INDENTATION,
  DEFAULT_LIMIT_SEVERITY,
  DEFAULT_MARKDOWN_END_MARKER,
  DEFAULT_MARKDOWN_START_MARKER,
  DEFAULT_PYTHON_COMMAND,
} from "./configuration.constants";
import { ConfigurationService } from "./configuration.service";

import type { CodometerConfiguration } from "./configuration.types";

/** The minimal configuration every test builds on: only `format` is required. */
const BASE_CONFIGURATION = {
  format: "markdown",
} satisfies CodometerConfiguration;

/** Writes a JSON configuration holding whatever the caller passes. */
async function writeConfiguration(
  configuration: Record<string, unknown>,
): Promise<string> {
  return writeConfigurationFile(
    "codometer.config.json",
    JSON.stringify({ ...BASE_CONFIGURATION, ...configuration }),
  );
}

/** Writes a configuration file of the given name into a fresh temp directory. */
async function writeConfigurationFile(
  fileName: string,
  contents: string,
): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), "codometer-config-"));
  const configurationPath = path.join(directory, fileName);

  await writeFile(configurationPath, contents, "utf8");

  return configurationPath;
}

/**
 * Writes a configuration file, and returns a folder two levels beneath it.
 *
 * The nested folder is what an ancestor search has to climb out of, which is
 * the whole of what a project carrying no configuration file of its own does.
 */
async function writeConfigurationTree(
  fileName: string,
  contents: string,
): Promise<{ nestedDirectory: string; rootDirectory: string }> {
  const configurationPath = await writeConfigurationFile(fileName, contents);
  const rootDirectory = path.dirname(configurationPath);
  const nestedDirectory = path.join(rootDirectory, "packages", "project");

  await mkdir(nestedDirectory, { recursive: true });

  return { nestedDirectory, rootDirectory };
}

describe(ConfigurationService, () => {
  let service: ConfigurationService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ConfigurationFlagsService,
        ConfigurationLoaderService,
        ConfigurationResolverService,
        ConfigurationService,
      ],
    }).compile();

    service = await module.resolve(ConfigurationService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  // 🗂️ Format

  it("resolves format from the configuration, with no code-level fallback", async () => {
    const configurationPath = await writeConfiguration({ format: "json" });

    const configuration = await service.loadConfiguration({
      configurationPath,
    });

    expect(configuration.format).toBe("json");
  });

  it("fails to resolve when no configuration file names a format", async () => {
    const searchDirectory = await mkdtemp(
      path.join(tmpdir(), "codometer-empty-"),
    );

    // Written out rather than left as the schema's own issue dump: this is the
    // first thing a reader sees when they point codometer at a directory
    // nothing configures.
    await expect(
      service.loadConfiguration({ searchDirectory }),
    ).rejects.toThrow(
      /must name a `format` of "json" or "markdown", and nothing supplies one/,
    );
  });

  it("fails to resolve when a configuration file names no format", async () => {
    const configurationPath = await writeConfigurationFile(
      "codometer.config.json",
      JSON.stringify({ exclude: ["notepads/**"] }),
    );

    await expect(
      service.loadConfiguration({ configurationPath }),
    ).rejects.toBeInstanceOf(InvalidConfigurationError);
  });

  it("rejects a format nothing renders", async () => {
    const configurationPath = await writeConfiguration({ format: "yaml" });

    await expect(
      service.loadConfiguration({ configurationPath }),
    ).rejects.toBeInstanceOf(InvalidConfigurationError);
  });

  // 🌱 Defaults

  it("applies defaults when a configuration names nothing beyond format", async () => {
    const configurationPath = await writeConfiguration({});

    const configuration = await service.loadConfiguration({
      configurationPath,
    });

    expect(configuration.exclude).toStrictEqual([
      "**/.nx/**",
      "**/build/**",
      "**/coverage/**",
      "**/dist/**",
      "**/node_modules/**",
    ]);
    expect(configuration.excludeFrom).toStrictEqual([]);
    expect(configuration.limits).toStrictEqual([]);
    expect(configuration.outputs).toStrictEqual([]);
    expect(configuration.python.command).toBe(DEFAULT_PYTHON_COMMAND);
    expect(configuration.defaultInput).toBeUndefined();
  });

  it("discovers a configuration file in the search directory", async () => {
    const configurationPath = await writeConfiguration({
      python: { command: "poetry run python" },
    });

    const configuration = await service.loadConfiguration({
      searchDirectory: path.dirname(configurationPath),
    });

    expect(configuration.python.command).toBe("poetry run python");
  });

  it("appends configured exclusions to the defaults", async () => {
    const configurationPath = await writeConfiguration({
      exclude: ["notepads/**", "**/dist/**"],
    });

    const configuration = await service.loadConfiguration({
      configurationPath,
    });

    expect(configuration.exclude).toContain("notepads/**");
    expect(
      configuration.exclude.filter((glob) => glob === "**/dist/**"),
    ).toStrictEqual(["**/dist/**"]);
  });

  it("carries configured ignore files through untouched", async () => {
    const configurationPath = await writeConfiguration({
      excludeFrom: [".prettierignore", ".codometerignore"],
    });

    const configuration = await service.loadConfiguration({
      configurationPath,
    });

    // Not merged with defaults the way `exclude` is: naming an ignore file is
    // naming a file, and there is no default one to keep.
    expect(configuration.excludeFrom).toStrictEqual([
      ".prettierignore",
      ".codometerignore",
    ]);
  });

  // 🎯 Inputs

  it("includes the built-in codebase input when a configuration declares none", () => {
    const configuration = service.resolveConfiguration(BASE_CONFIGURATION);

    expect(configuration.inputs).toStrictEqual([
      {
        analyses: ["language"],
        compression: DEFAULT_INPUT_COMPRESSION,
        directory: DEFAULT_INPUT_DIRECTORY,
        exclude: [],
        include: ["**/*"],
        name: DEFAULT_INPUT_NAME,
      },
    ]);
  });

  it("keeps the built-in codebase input alongside a declared one", () => {
    const configuration = service.resolveConfiguration({
      ...BASE_CONFIGURATION,
      inputs: [
        { analyses: ["size"], include: ["dist/**/*.js"], name: "compiled" },
      ],
    });

    expect(configuration.inputs.map((input) => input.name)).toStrictEqual([
      DEFAULT_INPUT_NAME,
      "compiled",
    ]);
  });

  it("lets an inputs entry named codebase replace the built-in one", async () => {
    const configurationPath = await writeConfiguration({
      inputs: [
        {
          analyses: ["size"],
          include: ["dist/**/*.js"],
          name: DEFAULT_INPUT_NAME,
        },
      ],
    });

    const configuration = await service.loadConfiguration({
      configurationPath,
    });

    expect(configuration.inputs).toStrictEqual([
      {
        analyses: ["size"],
        compression: DEFAULT_INPUT_COMPRESSION,
        directory: DEFAULT_INPUT_DIRECTORY,
        exclude: [],
        include: ["dist/**/*.js"],
        name: DEFAULT_INPUT_NAME,
      },
    ]);
  });

  it("defaults an input's compression to gzip", () => {
    const configuration = service.resolveConfiguration({
      ...BASE_CONFIGURATION,
      inputs: [
        { analyses: ["size"], include: ["dist/**/*.js"], name: "compiled" },
      ],
    });
    const [, input] = configuration.inputs;

    expect(input).toStrictEqual({
      analyses: ["size"],
      compression: DEFAULT_INPUT_COMPRESSION,
      directory: DEFAULT_INPUT_DIRECTORY,
      exclude: [],
      include: ["dist/**/*.js"],
      name: "compiled",
    });
  });

  it("keeps a compression an input names for itself", () => {
    const configuration = service.resolveConfiguration({
      ...BASE_CONFIGURATION,
      inputs: [
        {
          analyses: ["size"],
          compression: "none",
          include: ["dist/**/*.js"],
          name: "compiled",
        },
      ],
    });

    expect(configuration.inputs[1]?.compression).toBe("none");
  });

  // Where a negation sits in the array is exactly what used to decide which
  // patterns it applied to, so it is collected rather than read in place.
  it.each([
    ["last", ["dist/**/*.js", "dist/extra/**/*.js", "!dist/**/*.map.js"]],
    ["first", ["!dist/**/*.map.js", "dist/**/*.js", "dist/extra/**/*.js"]],
    ["between", ["dist/**/*.js", "!dist/**/*.map.js", "dist/extra/**/*.js"]],
  ])("collects a negation written %s into the exclusions", (_, include) => {
    const configuration = service.resolveConfiguration({
      ...BASE_CONFIGURATION,
      inputs: [{ analyses: ["size"], include, name: "compiled" }],
    });
    const input = configuration.inputs[1];

    expect(input?.exclude).toStrictEqual(["dist/**/*.map.js"]);
    expect(input?.include.toSorted()).toStrictEqual([
      "dist/**/*.js",
      "dist/extra/**/*.js",
    ]);
  });

  it("keeps a negation out of the include globs and in the exclusions", () => {
    const configuration = service.resolveConfiguration({
      ...BASE_CONFIGURATION,
      inputs: [
        {
          analyses: ["language", "size"],
          exclude: ["dist/vendor/**"],
          include: ["dist/**/*.js", "!dist/**/*.map.js"],
          name: "compiled",
        },
      ],
    });
    const input = configuration.inputs[1];

    expect(input?.include).toStrictEqual(["dist/**/*.js"]);
    expect(input?.exclude).toStrictEqual([
      "dist/**/*.map.js",
      "dist/vendor/**",
    ]);
  });

  // Every pattern removing files leaves no pattern that adds any, so the
  // input would hold nothing for good — and a limit on it could never breach.
  it("rejects an input whose include globs only ever remove files", async () => {
    const configurationPath = await writeConfiguration({
      inputs: [
        {
          analyses: ["size"],
          include: ["!dist/**/*.map.js"],
          name: "compiled",
        },
      ],
    });

    // Zod serializes its issues into the error message, so the input's name
    // arrives quoted and escaped rather than as it was written.
    await expect(
      service.loadConfiguration({ configurationPath }),
    ).rejects.toThrow(/Input .*compiled.* has no include glob that adds files/);
  });

  it("rejects two inputs sharing one name", async () => {
    const configurationPath = await writeConfiguration({
      inputs: [
        { analyses: ["size"], include: ["dist/**/*.js"], name: "compiled" },
        { analyses: ["size"], include: ["build/**/*.js"], name: "compiled" },
      ],
    });

    await expect(
      service.loadConfiguration({ configurationPath }),
    ).rejects.toBeInstanceOf(InvalidConfigurationError);
  });

  it("rejects an input asking for an analysis nobody runs", async () => {
    const configurationPath = await writeConfiguration({
      inputs: [
        {
          analyses: ["astrology"],
          include: ["dist/**/*.js"],
          name: "compiled",
        },
      ],
    });

    await expect(
      service.loadConfiguration({ configurationPath }),
    ).rejects.toBeInstanceOf(InvalidConfigurationError);
  });

  // A `!` in a list that only ever removes files has nothing to negate, and
  // silently matches no path at all rather than the one it names.
  it("rejects a negated exclude glob", async () => {
    const configurationPath = await writeConfiguration({
      inputs: [
        {
          analyses: ["size"],
          exclude: ["!dist/**/*.map.js"],
          include: ["dist/**/*.js"],
          name: "compiled",
        },
      ],
    });

    await expect(
      service.loadConfiguration({ configurationPath }),
    ).rejects.toBeInstanceOf(InvalidConfigurationError);
  });

  it("reads the inputs a configuration file declares", async () => {
    const configurationPath = await writeConfiguration({
      inputs: [
        {
          analyses: ["size"],
          compression: "brotli",
          include: ["dist/**/*.js"],
          name: "compiled",
        },
      ],
    });

    const configuration = await service.loadConfiguration({
      configurationPath,
    });

    expect(configuration.inputs[1]).toStrictEqual({
      analyses: ["size"],
      compression: "brotli",
      directory: DEFAULT_INPUT_DIRECTORY,
      exclude: [],
      include: ["dist/**/*.js"],
      name: "compiled",
    });
  });

  it("defaults an input's directory to the process's working directory", async () => {
    const configurationPath = await writeConfiguration({
      inputs: [
        { analyses: ["size"], include: ["dist/**/*.js"], name: "compiled" },
      ],
    });

    const configuration = await service.loadConfiguration({
      configurationPath,
    });

    expect(configuration.inputs[1]?.directory).toBe(DEFAULT_INPUT_DIRECTORY);
  });

  it("keeps the directory an input reaches its globs from", async () => {
    const configurationPath = await writeConfiguration({
      inputs: [
        {
          analyses: ["size"],
          directory: "../..",
          include: ["dist/packages/logging/**/*.js"],
          name: "compiled",
        },
      ],
    });

    const configuration = await service.loadConfiguration({
      configurationPath,
    });

    expect(configuration.inputs[1]?.directory).toBe("../..");
  });

  // 📤 Outputs

  it("defaults the top-level custom statistics to none", () => {
    expect(
      service.resolveConfiguration(BASE_CONFIGURATION).custom,
    ).toStrictEqual([]);
  });

  it("defaults the outputs to none", () => {
    expect(
      service.resolveConfiguration(BASE_CONFIGURATION).outputs,
    ).toStrictEqual([]);
  });

  it("defaults the markdown markers and the JSON indentation", async () => {
    const configurationPath = await writeConfiguration({
      outputs: [
        { path: "output/codometer.json", type: "json" },
        { path: "README.md", type: "markdown" },
      ],
    });

    const configuration = await service.loadConfiguration({
      configurationPath,
    });

    expect(configuration.outputs[0]).toStrictEqual({
      custom: [],
      indentation: DEFAULT_JSON_INDENTATION,
      path: "output/codometer.json",
      type: "json",
    });
    expect(configuration.outputs[1]).toStrictEqual({
      custom: [],
      description: undefined,
      endMarker: DEFAULT_MARKDOWN_END_MARKER,
      path: "README.md",
      startMarker: DEFAULT_MARKDOWN_START_MARKER,
      type: "markdown",
      write: undefined,
    });
  });

  it("keeps configured markers and indentation", async () => {
    const configurationPath = await writeConfiguration({
      outputs: [
        { indentation: 4, path: "statistics.json", type: "json" },
        {
          endMarker: "<!-- end -->",
          path: "docs/metrics.md",
          startMarker: "<!-- start -->",
          type: "markdown",
        },
      ],
    });

    const configuration = await service.loadConfiguration({
      configurationPath,
    });
    const [json, markdown] = configuration.outputs;

    expect(json?.type === "json" && json.indentation).toBe(4);
    expect(markdown?.type === "markdown" && markdown.startMarker).toBe(
      "<!-- start -->",
    );
    expect(markdown?.type === "markdown" && markdown.endMarker).toBe(
      "<!-- end -->",
    );
  });

  it("keeps a configured description", async () => {
    const configurationPath = await writeConfiguration({
      outputs: [
        { description: "Measured on push.", path: "R.md", type: "markdown" },
      ],
    });

    const configuration = await service.loadConfiguration({
      configurationPath,
    });
    const [markdown] = configuration.outputs;

    expect(markdown?.type === "markdown" && markdown.description).toBe(
      "Measured on push.",
    );
  });

  it("carries the write callback through unchanged", () => {
    const write = (): boolean => true;

    const configuration = service.resolveConfiguration({
      ...BASE_CONFIGURATION,
      outputs: [{ path: "README.md", type: "markdown", write }],
    });
    const [markdown] = configuration.outputs;

    expect(markdown?.type === "markdown" && markdown.write).toBe(write);
  });

  it("validates a write callback loaded from a real configuration file", async () => {
    const configurationPath = await writeConfigurationFile(
      "codometer.config.mjs",
      `export default {
        format: "markdown",
        outputs: [{ path: "README.md", type: "markdown", write: () => true }],
      };`,
    );

    const configuration = await service.loadConfiguration({
      configurationPath,
    });
    const [markdown] = configuration.outputs;

    expect(markdown?.type === "markdown" && typeof markdown.write).toBe(
      "function",
    );
  });

  it("rejects a markdown output whose write is not a function", async () => {
    const configurationPath = await writeConfigurationFile(
      "codometer.config.mjs",
      `export default {
        format: "markdown",
        outputs: [{ path: "README.md", type: "markdown", write: "not a function" }],
      };`,
    );

    await expect(
      service.loadConfiguration({ configurationPath }),
    ).rejects.toBeInstanceOf(InvalidConfigurationError);
  });

  it("leaves the write callback unset when the configuration supplies none", () => {
    const configuration = service.resolveConfiguration({
      ...BASE_CONFIGURATION,
      outputs: [{ path: "README.md", type: "markdown" }],
    });
    const [markdown] = configuration.outputs;

    expect(markdown?.type === "markdown" && markdown.write).toBeUndefined();
  });

  it("accepts markdown output that only names a write function", () => {
    const configuration = service.resolveConfiguration({
      ...BASE_CONFIGURATION,
      outputs: [{ type: "markdown", write: () => true }],
    });
    const [markdown] = configuration.outputs;

    expect(markdown?.type === "markdown" && markdown.path).toBeUndefined();
    expect(markdown?.type === "markdown" && markdown.write).toBeDefined();
  });

  it("rejects markdown output naming neither a path nor a writer", async () => {
    const configurationPath = await writeConfiguration({
      outputs: [{ description: "Nowhere to write this.", type: "markdown" }],
    });

    await expect(
      service.loadConfiguration({ configurationPath }),
    ).rejects.toBeInstanceOf(InvalidConfigurationError);
  });

  it("rejects two outputs of the same type, naming the duplicated type", async () => {
    const configurationPath = await writeConfiguration({
      outputs: [
        { path: "first.json", type: "json" },
        { path: "second.json", type: "json" },
      ],
    });

    await expect(
      service.loadConfiguration({ configurationPath }),
    ).rejects.toThrow(/more than one "json" output/);
  });

  it("rejects an output naming an unknown type", async () => {
    const configurationPath = await writeConfiguration({
      outputs: [{ path: "codometer.yaml", type: "yaml" }],
    });

    await expect(
      service.loadConfiguration({ configurationPath }),
    ).rejects.toBeInstanceOf(InvalidConfigurationError);
  });

  it("gives each output its own selection of custom counters", async () => {
    const configurationPath = await writeConfiguration({
      custom: [
        { label: "Services", patterns: ["**/*.service.ts"] },
        { label: "Modules", patterns: ["**/*.module.ts"] },
      ],
      outputs: [
        {
          custom: ["Services"],
          path: "codometer.json",
          type: "json",
        },
        {
          custom: ["Modules"],
          path: "README.md",
          type: "markdown",
        },
      ],
    });

    const configuration = await service.loadConfiguration({
      configurationPath,
    });
    const [json, markdown] = configuration.outputs;

    expect(json?.custom.map((statistic) => statistic.label)).toStrictEqual([
      "Services",
    ]);
    expect(markdown?.custom.map((statistic) => statistic.label)).toStrictEqual([
      "Modules",
    ]);
  });

  it("measures a top-level counter no output selects", async () => {
    const configurationPath = await writeConfiguration({
      custom: [{ label: "Services", patterns: ["**/*.service.ts"] }],
      outputs: [{ path: "codometer.json", type: "json" }],
    });

    const configuration = await service.loadConfiguration({
      configurationPath,
    });

    expect(
      configuration.custom.map((statistic) => statistic.label),
    ).toStrictEqual(["Services"]);
    expect(configuration.outputs[0]?.custom).toStrictEqual([]);
  });

  it("rejects an output selecting a label the top level never declared", async () => {
    const configurationPath = await writeConfiguration({
      outputs: [
        {
          custom: ["Services"],
          path: "codometer.json",
          type: "json",
        },
      ],
    });

    await expect(
      service.loadConfiguration({ configurationPath }),
    ).rejects.toThrow(/Services/);
  });

  it("rejects two top-level custom statistics sharing a label", async () => {
    const configurationPath = await writeConfiguration({
      custom: [
        { label: "Services", patterns: ["**/*.service.ts"] },
        { label: "Services", patterns: ["**/*.module.ts"] },
      ],
    });

    await expect(
      service.loadConfiguration({ configurationPath }),
    ).rejects.toBeInstanceOf(InvalidConfigurationError);
  });

  // 🏷️ Custom statistics

  it("gives every configured counter a color from the palette", async () => {
    const configurationPath = await writeConfiguration({
      custom: [
        { label: "Services", patterns: ["**/*.service.ts"] },
        {
          color: "ff0000",
          label: "Modules",
          patterns: ["**/*.module.ts"],
        },
      ],
      outputs: [
        {
          custom: ["Services", "Modules"],
          path: "codometer.json",
          type: "json",
        },
      ],
    });

    const configuration = await service.loadConfiguration({
      configurationPath,
    });
    const [json] = configuration.outputs;

    expect(json?.custom).toStrictEqual([
      {
        color: DEFAULT_CUSTOM_STATISTIC_COLORS[0],
        comment: undefined,
        group: "conventions",
        label: "Services",
        patterns: ["**/*.service.ts"],
        symbols: undefined,
      },
      {
        color: "ff0000",
        comment: undefined,
        group: "conventions",
        label: "Modules",
        patterns: ["**/*.module.ts"],
        symbols: undefined,
      },
    ]);
  });

  // Colors run per group, so a counter added to one group cannot recolor the
  // badges of another and rewrite a report that had not otherwise changed.
  it("starts the palette over for each group", () => {
    const configuration = service.resolveConfiguration({
      ...BASE_CONFIGURATION,
      custom: [
        { label: "Services", patterns: ["**/*.service.ts"] },
        { label: "Modules", patterns: ["**/*.module.ts"] },
        {
          group: "typescript",
          label: "Classes",
          symbols: { kinds: ["class"] },
        },
      ],
      outputs: [
        {
          custom: ["Services", "Modules", "Classes"],
          path: "codometer.json",
          type: "json",
        },
      ],
    });
    const [json] = configuration.outputs;

    expect(json?.custom.map((statistic) => statistic.color)).toStrictEqual([
      DEFAULT_CUSTOM_STATISTIC_COLORS[0],
      DEFAULT_CUSTOM_STATISTIC_COLORS[1],
      DEFAULT_CUSTOM_STATISTIC_COLORS[0],
    ]);
  });

  it("keeps a symbol counter's matcher and defaults its patterns to none", () => {
    const configuration = service.resolveConfiguration({
      ...BASE_CONFIGURATION,
      custom: [
        {
          group: "typescript",
          label: "Static Methods",
          symbols: { kinds: ["method"], modifiers: ["static"] },
        },
      ],
      outputs: [
        {
          custom: ["Static Methods"],
          path: "codometer.json",
          type: "json",
        },
      ],
    });
    const [json] = configuration.outputs;

    expect(json?.custom[0]).toStrictEqual({
      color: DEFAULT_CUSTOM_STATISTIC_COLORS[0],
      comment: undefined,
      group: "typescript",
      label: "Static Methods",
      patterns: [],
      symbols: { kinds: ["method"], modifiers: ["static"] },
    });
  });

  it("rejects a counter with no patterns", async () => {
    const configurationPath = await writeConfiguration({
      custom: [{ label: "Nothing", patterns: [] }],
    });

    await expect(
      service.loadConfiguration({ configurationPath }),
    ).rejects.toBeInstanceOf(InvalidConfigurationError);
  });

  // Neither matcher means a permanent zero, which is worth failing over
  // rather than rendering as though it had been measured.
  it("rejects a counter that matches nothing at all", async () => {
    const configurationPath = await writeConfiguration({
      custom: [{ label: "Nothing" }],
    });

    await expect(
      service.loadConfiguration({ configurationPath }),
    ).rejects.toBeInstanceOf(InvalidConfigurationError);
  });

  it("rejects a counter naming a group that is never rendered", async () => {
    const configurationPath = await writeConfiguration({
      custom: [{ group: "notebooks", label: "Classes", patterns: ["**/*.ts"] }],
    });

    await expect(
      service.loadConfiguration({ configurationPath }),
    ).rejects.toBeInstanceOf(InvalidConfigurationError);
  });

  it("rejects a symbol matcher asking for an unknown declaration kind", async () => {
    const configurationPath = await writeConfiguration({
      custom: [{ label: "Sigils", symbols: { kinds: ["sigil"] } }],
    });

    await expect(
      service.loadConfiguration({ configurationPath }),
    ).rejects.toBeInstanceOf(InvalidConfigurationError);
  });

  // 💬 Comment selector

  it("round-trips a comment selector through the schema", async () => {
    const configurationPath = await writeConfiguration({
      custom: [
        {
          comment: { language: "yaml", maximumWords: 128 },
          label: "YAML Comment Budget",
        },
      ],
      outputs: [
        {
          custom: ["YAML Comment Budget"],
          path: "codometer.json",
          type: "json",
        },
      ],
    });

    const configuration = await service.loadConfiguration({
      configurationPath,
    });
    const [json] = configuration.outputs;

    expect(json?.custom[0]?.comment).toStrictEqual({
      kind: undefined,
      language: "yaml",
      maximumCharacters: undefined,
      maximumLines: undefined,
      maximumWords: 128,
      severity: DEFAULT_LIMIT_SEVERITY,
    });
  });

  it("accepts a comment selector naming a documentation kind and no language", () => {
    const configuration = service.resolveConfiguration({
      ...BASE_CONFIGURATION,
      custom: [
        {
          comment: { kind: "class", maximumLines: 24, severity: "warn" },
          label: "Class Comment Budget",
        },
      ],
      outputs: [
        {
          custom: ["Class Comment Budget"],
          path: "codometer.json",
          type: "json",
        },
      ],
    });
    const [json] = configuration.outputs;

    expect(json?.custom[0]?.comment).toStrictEqual({
      kind: "class",
      language: undefined,
      maximumCharacters: undefined,
      maximumLines: 24,
      maximumWords: undefined,
      severity: "warn",
    });
  });

  it("leaves comment undefined for a counter naming none", () => {
    const configuration = service.resolveConfiguration({
      ...BASE_CONFIGURATION,
      custom: [{ label: "Services", patterns: ["**/*.service.ts"] }],
      outputs: [
        {
          custom: ["Services"],
          path: "codometer.json",
          type: "json",
        },
      ],
    });
    const [json] = configuration.outputs;

    expect(json?.custom[0]?.comment).toBeUndefined();
  });

  it("rejects a comment selector naming an unknown language", async () => {
    const configurationPath = await writeConfiguration({
      custom: [{ comment: { language: "rust" }, label: "Rust Comment Budget" }],
    });

    await expect(
      service.loadConfiguration({ configurationPath }),
    ).rejects.toBeInstanceOf(InvalidConfigurationError);
  });

  it("rejects a comment selector naming an unknown declaration kind", async () => {
    const configurationPath = await writeConfiguration({
      custom: [{ comment: { kind: "sigil" }, label: "Sigil Comment Budget" }],
    });

    await expect(
      service.loadConfiguration({ configurationPath }),
    ).rejects.toBeInstanceOf(InvalidConfigurationError);
  });

  it("no longer accepts a top-level comments or documentation block", async () => {
    const configurationPath = await writeConfiguration({
      comments: { maximumWords: 128 },
      documentation: { maximumLines: 6 },
    });

    const configuration = await service.loadConfiguration({
      configurationPath,
    });

    expect(configuration).not.toHaveProperty("comments");
    expect(configuration).not.toHaveProperty("documentation");
  });

  it("no longer accepts a per-language comments override", async () => {
    const configurationPath = await writeConfiguration({
      css: { comments: { maximumWords: 40 } },
      shell: { comments: { maximumWords: 256 } },
      typescript: { comments: { maximumWords: 40 } },
      yaml: { comments: { maximumWords: 128 } },
    });

    const configuration = await service.loadConfiguration({
      configurationPath,
    });

    expect(configuration).not.toHaveProperty("css");
    expect(configuration).not.toHaveProperty("shell");
    expect(configuration).not.toHaveProperty("typescript");
    expect(configuration).not.toHaveProperty("yaml");
  });

  // 🚫 Config-as-function

  it("no longer calls a configuration exported as a function", async () => {
    const { nestedDirectory } = await writeConfigurationTree(
      "codometer.config.cjs",
      `module.exports = (context) => ({
        exclude: [context.configurationDirectory, context.directory],
        format: "markdown",
      });`,
    );

    // A factory export is not an object the schema recognizes, so it is
    // treated the same as any other export that is not a plain object — one
    // naming no format — and fails to resolve rather than being invoked.
    await expect(
      service.loadConfiguration({ searchDirectory: nestedDirectory }),
    ).rejects.toBeInstanceOf(InvalidConfigurationError);
  });

  it("no longer awaits a configuration factory that answers with a promise", async () => {
    const configurationPath = await writeConfigurationFile(
      "codometer.config.cjs",
      'module.exports = async () => ({ format: "markdown", python: { command: "awaited python" } });',
    );

    await expect(
      service.loadConfiguration({ configurationPath }),
    ).rejects.toBeInstanceOf(InvalidConfigurationError);
  });

  // 🎯 Limits

  it("defaults the limits and the default target to none", () => {
    const configuration = service.resolveConfiguration(BASE_CONFIGURATION);

    expect(configuration.limits).toStrictEqual([]);
    expect(configuration.defaultInput).toBeUndefined();
  });

  it("reads the default target a configuration file names", async () => {
    const configurationPath = await writeConfiguration({
      defaultInput: "codebase",
      limits: [{ metric: "typescript.interfaces", value: 500 }],
    });

    const configuration = await service.loadConfiguration({
      configurationPath,
    });

    expect(configuration.defaultInput).toBe("codebase");
  });

  it("defaults a limit's severity to failing and leaves its label unset", () => {
    const configuration = service.resolveConfiguration({
      ...BASE_CONFIGURATION,
      limits: [{ metric: "codebase.linesOfCode", value: 100_000 }],
    });

    expect(configuration.limits).toStrictEqual([
      {
        label: undefined,
        metric: "codebase.linesOfCode",
        severity: "fail",
        value: 100_000,
      },
    ]);
  });

  it("keeps a limit's declared severity and label", () => {
    const configuration = service.resolveConfiguration({
      ...BASE_CONFIGURATION,
      limits: [
        {
          label: "Compiled bundle",
          metric: "compiled.size",
          severity: "warn",
          value: 8000,
        },
      ],
    });

    expect(configuration.limits).toStrictEqual([
      {
        label: "Compiled bundle",
        metric: "compiled.size",
        severity: "warn",
        value: 8000,
      },
    ]);
  });

  // A warn short of a fail is how a repository watches a number approach the
  // one that would stop a change, so one metric may carry both.
  it("accepts two limits naming one metric", () => {
    const configuration = service.resolveConfiguration({
      ...BASE_CONFIGURATION,
      limits: [
        { metric: "compiled.size", severity: "warn", value: "8 KB" },
        { metric: "compiled.size", value: "10 KB" },
      ],
    });

    expect(configuration.limits.map((limit) => limit.value)).toStrictEqual([
      8000, 10_000,
    ]);
  });

  it.each([
    ["512 b", 512],
    ["8 KB", 8000],
    ["8kb", 8000],
    ["8 kB", 8000],
    ["1 MB", 1_000_000],
    ["2 GB", 2_000_000_000],
    ["1 TB", 1_000_000_000_000],
    // Rounded, because 0.1 * 1000 is 100.00000000000001 in binary floating
    // point, and a limit nobody can state exactly is one nobody can compare.
    ["1.5 KB", 1500],
    ["0.1 KB", 100],
    // A string carrying no unit at all is the plain number, which is how a
    // limit on a count of interfaces or files is written.
    ["200", 200],
    ["  8 KB  ", 8000],
  ])("reads %s as %i", (value, expected) => {
    const configuration = service.resolveConfiguration({
      ...BASE_CONFIGURATION,
      limits: [{ metric: "compiled.size", value }],
    });

    expect(configuration.limits[0]?.value).toBe(expected);
  });

  // Never coerced to zero, which is what the tool this replaces did before
  // failing every target holding a single byte.
  it.each([
    // The trailing `b` is what makes a unit a size.
    "8 K",
    "8 KiB",
    // Spells an inherited property of every object literal, and the only one
    // an all-lowercase unit can reach. Read from an object rather than a map
    // it would multiply the limit into NaN, which nothing ever exceeds.
    "8 constructor",
    "8 valueOf",
    "8 toString",
    "8 kilobytes",
    "KB",
    "",
    "eight",
    "-5",
    "8 KB gzipped",
    "1,000 KB",
    ">8 KB",
    Number.NaN,
    Number.POSITIVE_INFINITY,
    -1,
  ])("refuses to read %s as a limit", (value) => {
    expect(() =>
      service.resolveConfiguration({
        ...BASE_CONFIGURATION,
        limits: [{ metric: "compiled.size", value }],
      }),
    ).toThrow(InvalidLimitValueError);
  });

  it("rejects a limit naming a severity nobody reports", async () => {
    const configurationPath = await writeConfiguration({
      limits: [{ metric: "compiled.size", severity: "shout", value: 8000 }],
    });

    await expect(
      service.loadConfiguration({ configurationPath }),
    ).rejects.toBeInstanceOf(InvalidConfigurationError);
  });

  it("rejects a limit naming no metric", async () => {
    const configurationPath = await writeConfiguration({
      limits: [{ metric: "", value: 8000 }],
    });

    await expect(
      service.loadConfiguration({ configurationPath }),
    ).rejects.toBeInstanceOf(InvalidConfigurationError);
  });

  // 📄 Loading mechanics

  it("reads a JSONC configuration with comments", async () => {
    const configurationPath = await writeConfigurationFile(
      "codometer.config.jsonc",
      `{
        // Scratch notes are prose, not source.
        "exclude": ["notepads/**"],
        "format": "markdown",
      }`,
    );

    const configuration = await service.loadConfiguration({
      configurationPath,
    });

    expect(configuration.exclude).toContain("notepads/**");
  });

  it("reads a TypeScript configuration's default export", async () => {
    const configurationPath = await writeConfigurationFile(
      "codometer.config.ts",
      `interface Configuration {
        format: "markdown";
        outputs: { path: string; type: "markdown" }[];
      }

      const configuration: Configuration = {
        format: "markdown",
        outputs: [{ path: "README.md", type: "markdown" }],
      };

      export default configuration;
      `,
    );

    const configuration = await service.loadConfiguration({
      configurationPath,
    });
    const [markdown] = configuration.outputs;

    expect(markdown?.type === "markdown" && markdown.path).toBe("README.md");
  });

  it("unwraps a CommonJS module's nested default export", async () => {
    const configurationPath = await writeConfigurationFile(
      "codometer.config.cjs",
      'module.exports = { default: { format: "markdown", python: { command: "python3.13" } } };',
    );

    const configuration = await service.loadConfiguration({
      configurationPath,
    });

    expect(configuration.python.command).toBe("python3.13");
  });

  it("searches the process cwd when no directory is given", async () => {
    const configurationPath = await writeConfiguration({
      python: { command: "cwd python" },
    });
    const cwdSpy = vi
      .spyOn(process, "cwd")
      .mockReturnValue(path.dirname(configurationPath));

    const configuration = await service.loadConfiguration();

    expect(configuration.python.command).toBe("cwd python");

    cwdSpy.mockRestore();
  });

  it("fails to resolve when the module exports no object", async () => {
    const configurationPath = await writeConfigurationFile(
      "codometer.config.ts",
      "export default 42;",
    );

    await expect(
      service.loadConfiguration({ configurationPath }),
    ).rejects.toBeInstanceOf(InvalidConfigurationError);
  });

  it("rejects a malformed configuration", async () => {
    const configurationPath = await writeConfiguration({ exclude: "notepads" });

    await expect(
      service.loadConfiguration({ configurationPath }),
    ).rejects.toBeInstanceOf(InvalidConfigurationError);
  });

  it("throws a typed error for an unsupported extension", async () => {
    const configurationPath = await writeConfigurationFile(
      "codometer.config.yaml",
      "exclude: []",
    );

    await expect(
      service.loadConfiguration({ configurationPath }),
    ).rejects.toBeInstanceOf(UnknownConfigurationFileTypeError);
  });

  it("throws a typed error for a configuration path that does not exist", async () => {
    await expect(
      service.loadConfiguration({
        configurationPath: "configuration/missing.config.ts",
      }),
    ).rejects.toBeInstanceOf(ConfigurationFileNotFoundError);
  });

  it("throws when no repository root holds the relative path either", async () => {
    const searchDirectory = await mkdtemp(
      path.join(tmpdir(), "codometer-rootless-"),
    );
    const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(searchDirectory);

    await expect(
      service.loadConfiguration({
        configurationPath: "configuration/codometer.config.ts",
      }),
    ).rejects.toBeInstanceOf(ConfigurationFileNotFoundError);

    cwdSpy.mockRestore();
  });

  it("measures a folder carrying no configuration through its nearest ancestor's", async () => {
    const { nestedDirectory } = await writeConfigurationTree(
      "codometer.config.json",
      JSON.stringify({
        format: "markdown",
        python: { command: "inherited python" },
      }),
    );

    const configuration = await service.loadConfiguration({
      searchDirectory: nestedDirectory,
    });

    expect(configuration.python.command).toBe("inherited python");
  });

  it("lets a folder's own configuration replace an inherited one outright", async () => {
    const { nestedDirectory } = await writeConfigurationTree(
      "codometer.config.json",
      JSON.stringify({
        exclude: ["ancestor/**"],
        format: "markdown",
        python: { command: "ancestor python" },
      }),
    );

    await writeFile(
      path.join(nestedDirectory, "codometer.config.json"),
      JSON.stringify({ exclude: ["folder/**"], format: "markdown" }),
      "utf8",
    );

    const configuration = await service.loadConfiguration({
      searchDirectory: nestedDirectory,
    });

    // Nothing of the ancestor's survives: a merged configuration would leave a
    // limit that never applied looking exactly like one that did.
    expect(configuration.exclude).toContain("folder/**");
    expect(configuration.exclude).not.toContain("ancestor/**");
    expect(configuration.python.command).toBe(DEFAULT_PYTHON_COMMAND);
  });
  // 🚩 The command line, read through the layer's one public service

  // A consumer injects this service and nothing else from the package, so
  // every flag the run is configured by is answered here. What each one means
  // is asserted against `ConfigurationFlagsService` itself.
  describe("the command line it reads beside the file", () => {
    it("reads a written option as itself", () => {
      expect(service.parseOptionalOption("reports")).toBe("reports");
      expect(service.parseDefaultedOption(undefined, "markdown")).toBe(
        "markdown",
      );
      expect(service.parseDirectoryOption("packages/logging")).toBe(
        "packages/logging",
      );
    });

    it("reads --format, falling back to the configured one", () => {
      const errors: string[] = [];

      expect(service.resolveFormat("json", "markdown", errors)).toBe("json");
      expect(service.resolveFormat(undefined, "markdown", errors)).toBe(
        "markdown",
      );
      expect(errors).toStrictEqual([]);
    });

    it("reads what the run writes and what it fails on", () => {
      expect(service.selectMode({ check: "limits" })).toStrictEqual({
        errors: [],
        mode: {
          checksLimits: true,
          checksReports: false,
          writesJson: false,
          writesMarkdown: false,
        },
      });
    });
  });
});
