import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  ConfigurationFileNotFoundError,
  UnknownConfigurationFileTypeError,
} from "@codometer/core";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { ConfigurationLoaderService } from "./configuration-loader.service";

/** Writes a configuration file of the given name into a fresh temp directory. */
async function writeConfigurationFile(
  fileName: string,
  contents: string,
): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), "codometer-loader-"));
  const configurationPath = path.join(directory, fileName);

  await writeFile(configurationPath, contents, "utf8");

  return configurationPath;
}

describe(ConfigurationLoaderService, () => {
  let service: ConfigurationLoaderService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [ConfigurationLoaderService],
    }).compile();

    service = await module.resolve(ConfigurationLoaderService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("finds nothing in a directory with no configuration file", async () => {
    const searchDirectory = await mkdtemp(
      path.join(tmpdir(), "codometer-loader-empty-"),
    );

    await expect(service.load({ searchDirectory })).resolves.toBeUndefined();
  });

  it("loads a JSON configuration file", async () => {
    const configurationPath = await writeConfigurationFile(
      "codometer.config.json",
      JSON.stringify({ defaultInput: "codebase" }),
    );

    const loaded = await service.load({ configurationPath });

    expect(loaded).toStrictEqual({
      configuration: { defaultInput: "codebase" },
      path: configurationPath,
    });
  });

  it("loads a JSONC configuration file, comments and all", async () => {
    const configurationPath = await writeConfigurationFile(
      "codometer.config.jsonc",
      `{
        // a comment JSON.parse would reject
        "defaultInput": "codebase",
      }`,
    );

    const loaded = await service.load({ configurationPath });

    expect(loaded).toStrictEqual({
      configuration: { defaultInput: "codebase" },
      path: configurationPath,
    });
  });

  it("no longer invokes a configuration exported as a function", async () => {
    const configurationPath = await writeConfigurationFile(
      "codometer.config.cjs",
      `module.exports = (context) => ({
        exclude: [context.configurationDirectory, context.directory],
      });`,
    );

    // A bare function is not an object the loader recognizes, so it falls
    // back to an empty configuration rather than being called with a context
    // nobody builds anymore.
    const loaded = await service.load({ configurationPath });

    expect(loaded?.configuration).toStrictEqual({});
  });

  it("throws a typed error for an unsupported configuration file extension", async () => {
    const configurationPath = await writeConfigurationFile(
      "codometer.config.txt",
      "",
    );

    await expect(service.load({ configurationPath })).rejects.toBeInstanceOf(
      UnknownConfigurationFileTypeError,
    );
  });

  it("throws a typed error for a configuration path that does not exist", async () => {
    await expect(
      service.load({
        configurationPath: "configuration/missing.config.ts",
      }),
    ).rejects.toBeInstanceOf(ConfigurationFileNotFoundError);
  });

  it("throws when no repository root holds the relative path either", async () => {
    const searchDirectory = await mkdtemp(
      path.join(tmpdir(), "codometer-loader-rootless-"),
    );
    const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(searchDirectory);

    await expect(
      service.load({
        configurationPath: "configuration/codometer.config.ts",
      }),
    ).rejects.toBeInstanceOf(ConfigurationFileNotFoundError);

    cwdSpy.mockRestore();
  });

  it("resolves a configuration path relative to the repository root", async () => {
    // A configuration path written relative to a repository root, read from a
    // nested working directory — which is what a task runner leaves behind
    // whenever it sets the cwd to the project rather than the workspace. The
    // fixture is a temporary repository rather than this one so that loading
    // it never evaluates this package's own sources a second time.
    const repositoryRoot = await mkdtemp(
      path.join(tmpdir(), "codometer-loader-repository-"),
    );
    await writeFile(
      path.join(repositoryRoot, "pnpm-workspace.yaml"),
      "",
      "utf8",
    );
    const configurationDirectory = path.join(repositoryRoot, "configuration");
    await mkdir(configurationDirectory, { recursive: true });
    const configurationPath = path.join(
      configurationDirectory,
      "codometer.config.json",
    );
    await writeFile(
      configurationPath,
      JSON.stringify({ defaultInput: "codebase" }),
      "utf8",
    );
    const nestedDirectory = path.join(repositoryRoot, "packages", "project");
    await mkdir(nestedDirectory, { recursive: true });
    const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(nestedDirectory);

    const loaded = await service.load({
      configurationPath: "configuration/codometer.config.json",
    });

    cwdSpy.mockRestore();

    expect(loaded).toStrictEqual({
      configuration: { defaultInput: "codebase" },
      path: configurationPath,
    });
  });

  it("no longer invokes a factory's default export through interop", async () => {
    const configurationPath = await writeConfigurationFile(
      "codometer.config.mjs",
      `export default (context) => ({ exclude: [context.directory] });`,
    );

    const loaded = await service.load({ configurationPath });

    expect(loaded?.configuration).toStrictEqual({});
  });

  it("finds a configuration file by walking up from a nested directory", async () => {
    const configurationPath = await writeConfigurationFile(
      "codometer.config.json",
      JSON.stringify({ defaultInput: "codebase" }),
    );
    const rootDirectory = path.dirname(configurationPath);
    const nestedDirectory = path.join(rootDirectory, "packages", "project");
    await mkdir(nestedDirectory, { recursive: true });

    const loaded = await service.load({ searchDirectory: nestedDirectory });

    expect(loaded).toStrictEqual({
      configuration: { defaultInput: "codebase" },
      path: configurationPath,
    });
  });
});
