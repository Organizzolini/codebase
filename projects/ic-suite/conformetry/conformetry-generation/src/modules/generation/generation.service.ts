import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { ConfigurationService } from "@conformetry/configuration";
import { Injectable } from "@nestjs/common";

import type {
  DirectoryEntry,
  FileSystemAdapter,
  FormatterAdapter,
  GeneratorHookContext,
  RunGeneratorArguments,
  RunGeneratorResult,
} from "./generation.types";
import type { Substitutions } from "@conformetry/configuration";

/* v8 ignore start -- the decorator helper emits a branch no test can reach */
/**
 * Runs conformetry generators: walks a template tree, renders every path and
 * file through the configuration layer, and writes the result.
 *
 * Filesystem and formatter access go through adapters so a host with a virtual
 * filesystem (an Nx generator `Tree`) can reuse this runtime unchanged.
 * Rendering deliberately is *not* an adapter — validation must substitute
 * exactly as generation does, so both render through one service.
 */
@Injectable()
/* v8 ignore stop */
export class GenerationService {
  // 🏗 Dependency Injection

  constructor(private readonly configurationService: ConfigurationService) {}

  // 🔐 Private Fields

  /** Reads and writes directly to disk. Used when no adapter is supplied. */
  private readonly defaultFileSystem: FileSystemAdapter = {
    listDirectory: async (directoryPath: string): Promise<DirectoryEntry[]> => {
      const entries = await readdir(directoryPath, { withFileTypes: true });

      return entries.map((entry) => {
        return { isDirectory: entry.isDirectory(), name: entry.name };
      });
    },
    makeDirectory: async (directoryPath: string): Promise<void> => {
      await mkdir(directoryPath, { recursive: true });
    },
    readFile: async (filePath: string): Promise<string> => {
      return readFile(filePath, "utf8");
    },
    writeFile: async (filePath: string, content: string): Promise<void> => {
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, content, "utf8");
    },
  };

  /** Leaves formatting to the workspace formatter unless a host overrides it. */
  private readonly defaultFormatter: FormatterAdapter = {
    formatFiles: async (_filePaths: string[]): Promise<void> => {
      await Promise.resolve();
    },
  };

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Merges the derived name variants with the caller's inputs.
   *
   * Inputs are spread last so an explicit value always wins over the variant
   * derived from the same name.
   */
  private buildSubstitutions(args: {
    definitionName: string;
    inputs: Substitutions;
  }): Substitutions {
    return {
      ...this.configurationService.buildNameSubstitutions(
        args.inputs["name"] ?? args.definitionName,
      ),
      ...args.inputs,
    };
  }

  /** Drops unset inputs so they never shadow a derived name substitution. */
  private normalizeInputs(
    inputs: Record<string, string | undefined>,
  ): Substitutions {
    const normalizedInputs: Substitutions = {};

    for (const [key, value] of Object.entries(inputs)) {
      if (value !== undefined) {
        normalizedInputs[key] = value;
      }
    }

    return normalizedInputs;
  }

  /**
   * Recursively renders a template tree, returning every generated file path.
   */
  private async renderDirectory(args: {
    filesystem: FileSystemAdapter;
    instanceDirectoryPath: string;
    substitutions: Substitutions;
    templateDirectoryPath: string;
  }): Promise<string[]> {
    const entries = await args.filesystem.listDirectory(
      args.templateDirectoryPath,
    );
    const generatedFilePaths: string[] = [];

    for (const entry of entries) {
      const templatePath = path.join(args.templateDirectoryPath, entry.name);
      const instancePath = path.join(
        args.instanceDirectoryPath,
        this.configurationService.renderPath({
          subject: templatePath,
          substitutions: args.substitutions,
          templatePath: entry.name,
        }),
      );

      if (entry.isDirectory) {
        await args.filesystem.makeDirectory(instancePath);
        generatedFilePaths.push(
          ...(await this.renderDirectory({
            filesystem: args.filesystem,
            instanceDirectoryPath: instancePath,
            substitutions: args.substitutions,
            templateDirectoryPath: templatePath,
          })),
        );
        continue;
      }

      generatedFilePaths.push(
        await this.renderFile({
          filesystem: args.filesystem,
          instancePath,
          substitutions: args.substitutions,
          templatePath,
        }),
      );
    }

    return generatedFilePaths;
  }

  /** Renders one template file and writes it, returning the written path. */
  private async renderFile(args: {
    filesystem: FileSystemAdapter;
    instancePath: string;
    substitutions: Substitutions;
    templatePath: string;
  }): Promise<string> {
    const templateContent = await args.filesystem.readFile(args.templatePath);

    await args.filesystem.writeFile(
      args.instancePath,
      this.configurationService.renderContent({
        subject: args.templatePath,
        substitutions: args.substitutions,
        templateContent,
      }),
    );

    return args.instancePath;
  }

  /** Falls back to the disk filesystem and no-op formatter when unset. */
  private resolveAdapters(args: RunGeneratorArguments): {
    filesystem: FileSystemAdapter;
    formatter: FormatterAdapter;
  } {
    return {
      filesystem: args.filesystem ?? this.defaultFileSystem,
      formatter: args.formatter ?? this.defaultFormatter,
    };
  }

  // 🌎 Public Methods

  /**
   * Runs the generator lifecycle — `preGenerate`, render, `postGenerate`,
   * format — and returns the sorted list of generated file paths.
   */
  public async runGenerator(
    args: RunGeneratorArguments,
  ): Promise<RunGeneratorResult> {
    const { filesystem, formatter } = this.resolveAdapters(args);
    const inputs = this.normalizeInputs(args.inputs ?? {});
    const substitutions = this.buildSubstitutions({
      definitionName: args.definition.name,
      inputs,
    });
    const context: GeneratorHookContext = {
      definition: args.definition,
      generatedFilePaths: [],
      input: inputs,
      outputDirectoryPath: args.instancePath,
      substitutions,
    };

    await args.definition.hooks?.preGenerate?.(context);

    const generatedFilePaths = await this.renderDirectory({
      filesystem,
      instanceDirectoryPath: args.instancePath,
      substitutions,
      templateDirectoryPath: args.definition.templateDirectoryPath,
    });
    context.generatedFilePaths = generatedFilePaths.toSorted();

    await args.definition.hooks?.postGenerate?.(context);
    await formatter.formatFiles(context.generatedFilePaths);

    return {
      generatedFilePaths: context.generatedFilePaths,
      outputDirectoryPath: args.instancePath,
    };
  }
}
