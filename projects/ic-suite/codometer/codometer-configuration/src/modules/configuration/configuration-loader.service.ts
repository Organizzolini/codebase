import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  ConfigurationFileNotFoundError,
  UnknownConfigurationFileTypeError,
} from "@codometer/core";
import { Injectable } from "@nestjs/common";
import { createJiti } from "jiti";
import { parse as parseJsonc } from "jsonc-parser";

import {
  CONFIGURATION_FILE_NAMES,
  REPOSITORY_ROOT_MARKERS,
  SUPPORTED_CONFIGURATION_EXTENSIONS,
} from "./configuration.constants";

import type { LoadedConfigurationModule } from "./configuration-loader.types";
import type { LoadConfigurationArguments } from "./configuration.types";

/**
 * Finds and reads a codometer configuration file.
 *
 * Owns locating the file and turning whatever it exports into a plain,
 * unvalidated configuration object — parsing JSON/JSONC by hand, everything
 * else through `jiti`. What the object means is `ConfigurationService`'s to
 * validate and resolve, kept apart so a file finding no configuration reads
 * exactly like one that found an empty object.
 */
@Injectable()
export class ConfigurationLoaderService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Walks upward from a directory looking for a configuration file.
   *
   * Returns `undefined` when the search reaches the filesystem root without
   * finding one: a repository that never wrote a configuration file is
   * measured with the defaults rather than told to write one.
   */
  private findConfigurationFile(searchDirectory: string): string | undefined {
    let candidateDirectory = path.resolve(searchDirectory);

    for (;;) {
      for (const fileName of CONFIGURATION_FILE_NAMES) {
        const candidatePath = path.join(candidateDirectory, fileName);

        if (existsSync(candidatePath)) {
          return candidatePath;
        }
      }

      const parentDirectory = path.dirname(candidateDirectory);

      if (parentDirectory === candidateDirectory) {
        return undefined;
      }

      candidateDirectory = parentDirectory;
    }
  }

  /**
   * Walks upward from the process cwd looking for the repository root.
   *
   * Used to resolve a configuration path given relative to that root even when
   * the command was invoked from a nested directory, which is what a task
   * runner does whenever it sets the cwd to the project rather than the
   * workspace.
   */
  private findRepositoryRoot(): string | undefined {
    let candidateDirectory = path.resolve(process.cwd());

    for (;;) {
      const directory = candidateDirectory;
      const isRoot = REPOSITORY_ROOT_MARKERS.some((marker) =>
        existsSync(path.join(directory, marker)),
      );

      if (isRoot) {
        return candidateDirectory;
      }

      const parentDirectory = path.dirname(candidateDirectory);

      if (parentDirectory === candidateDirectory) {
        return undefined;
      }

      candidateDirectory = parentDirectory;
    }
  }

  /** Loads a configuration module, choosing the reader by extension. */
  private async loadConfigurationModule(args: {
    configurationPath: string;
    extension: string;
  }): Promise<unknown> {
    if (args.extension === ".json" || args.extension === ".jsonc") {
      return this.loadJsonConfiguration(args);
    }

    const jiti = createJiti(fileURLToPath(import.meta.url));

    return this.readDefaultExport(
      await jiti.import(args.configurationPath, { default: true }),
    );
  }

  /** Reads a JSON or JSONC configuration file. */
  private async loadJsonConfiguration(args: {
    configurationPath: string;
    extension: string;
  }): Promise<unknown> {
    const configurationContent = await readFile(args.configurationPath, "utf8");

    return args.extension === ".jsonc"
      ? parseJsonc(configurationContent)
      : JSON.parse(configurationContent);
  }

  /**
   * Reads what a configuration module exported, through either interop shape.
   *
   * Anything that is not a plain object — including a function, since a
   * configuration file authored as one is no longer supported — falls back to
   * an empty object, the same way a configuration file exporting `42` does:
   * the schema then applies to that empty object exactly as it would to a
   * genuinely empty configuration file.
   */
  private readDefaultExport(importedModule: unknown): unknown {
    if (typeof importedModule !== "object" || importedModule === null) {
      return {};
    }

    const defaultExport = (importedModule as { default?: unknown }).default;

    return typeof defaultExport === "object" && defaultExport !== null
      ? defaultExport
      : importedModule;
  }

  /**
   * Resolves a configuration path against the cwd, then the repository root.
   */
  private resolveConfigurationPath(configurationPath: string): string {
    const absolutePath = path.resolve(configurationPath);

    if (existsSync(absolutePath)) {
      return absolutePath;
    }

    const repositoryRoot = this.findRepositoryRoot();

    if (repositoryRoot === undefined) {
      throw new ConfigurationFileNotFoundError(absolutePath);
    }

    const repositoryRelativePath = path.resolve(
      repositoryRoot,
      configurationPath,
    );

    if (!existsSync(repositoryRelativePath)) {
      throw new ConfigurationFileNotFoundError(absolutePath);
    }

    return repositoryRelativePath;
  }

  // 🌎 Public Methods

  /**
   * Loads a configuration file's raw export, or `undefined` when none exists.
   *
   * Unvalidated on purpose: the caller runs the result through the schema
   * before trusting any of it, so this service never has to know the shape a
   * configuration is supposed to have.
   */
  async load(
    args: LoadConfigurationArguments = {},
  ): Promise<LoadedConfigurationModule | undefined> {
    const searchDirectory = path.resolve(args.searchDirectory ?? process.cwd());
    const resolvedPath =
      args.configurationPath === undefined
        ? this.findConfigurationFile(searchDirectory)
        : this.resolveConfigurationPath(args.configurationPath);

    if (resolvedPath === undefined) {
      return undefined;
    }

    const extension = path.extname(resolvedPath).toLowerCase();

    if (!SUPPORTED_CONFIGURATION_EXTENSIONS.has(extension)) {
      throw new UnknownConfigurationFileTypeError(resolvedPath);
    }

    const configuration = await this.loadConfigurationModule({
      configurationPath: resolvedPath,
      extension,
    });

    return { configuration, path: resolvedPath };
  }
}
