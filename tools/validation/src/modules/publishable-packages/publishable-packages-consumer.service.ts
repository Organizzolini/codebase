import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logging";

import {
  COMMAND_TIMEOUT,
  CONSUMER_ALLOWED_BUILDS,
  CONSUMER_DIRECTORY_PREFIX,
  CONSUMER_MINIMUM_RELEASE_AGE,
  CONSUMER_ROOT_VARIABLE,
  CONSUMER_TOOLS,
  formatCommandFailure,
  INSTALL_TIMEOUT,
  TYPECHECK_CONFIGURATION,
  TYPECHECK_CONFIGURATION_CONTENT,
  TYPECHECK_DIRECTORY,
  WORKSPACE_MARKERS,
} from "./publishable-packages-consumer.constants";
import { CONSUMER_FIXTURE_FILES } from "./publishable-packages-fixtures.constants";
import { PublishablePackagesProcessService } from "./publishable-packages-process.service";

import type {
  ConsumerContext,
  ConsumerOptions,
} from "./publishable-packages.types";

/**
 * Writes and installs a throwaway consumer of the packed packages, somewhere
 * it cannot resolve anything from the workspace that packed them.
 */
@Injectable()
export class PublishablePackagesConsumerService {
  // 🏗 Dependency Injection

  constructor(
    private readonly logger: LoggerService,
    private readonly processService: PublishablePackagesProcessService,
  ) {
    this.logger.setContext(PublishablePackagesConsumerService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * The consumer's manifest: every package from its own tarball, and the
   * tools it runs pinned to the versions this workspace has installed, so the
   * two never drift apart.
   */
  private createManifest(options: ConsumerOptions): string {
    const tarballs = this.resolveTarballs(options);
    const tools = CONSUMER_TOOLS.map((name): [string, string] => [
      name,
      this.readToolVersion(options.workspaceRoot, name),
    ]);
    const { packageManager } = this.readManifest(options.workspaceRoot, ".");
    const manifest = {
      devDependencies: { ...tarballs, ...Object.fromEntries(tools) },
      name: "publishable-packages-consumer",
      packageManager,
      private: true,
      type: "module",
    };

    return `${JSON.stringify(manifest, undefined, 2)}\n`;
  }

  /**
   * One import of each package, and the configuration that typechecks them
   * together against what the consumer installed.
   */
  private createTypecheckFiles(
    options: ConsumerOptions,
  ): Record<string, string> {
    const imports = options.publishablePackages.map(
      (item): [string, string] => [
        `${TYPECHECK_DIRECTORY}/${item.tarball}.ts`,
        `import * as item from "${item.name}";\nexport { item };\n`,
      ],
    );

    return {
      ...Object.fromEntries(imports),
      [TYPECHECK_CONFIGURATION]: TYPECHECK_CONFIGURATION_CONTENT,
    };
  }

  /**
   * Overrides every package to its tarball, so a dependency between two of
   * them never falls through to the registry's copy. Written to
   * `pnpm-workspace.yaml` rather than `package.json`, where current pnpm
   * reads its settings. Each key and value is JSON, which is valid YAML.
   */
  private createWorkspaceConfiguration(options: ConsumerOptions): string {
    const builds = CONSUMER_ALLOWED_BUILDS.map(
      (name) => `  ${JSON.stringify(name)}: true`,
    );
    const overrides = Object.entries(this.resolveTarballs(options)).map(
      ([name, specifier]) =>
        `  ${JSON.stringify(name)}: ${JSON.stringify(specifier)}`,
    );

    return [
      "allowBuilds:",
      ...builds,
      `minimumReleaseAge: ${String(CONSUMER_MINIMUM_RELEASE_AGE)}`,
      "overrides:",
      ...overrides,
      "",
    ].join("\n");
  }

  /**
   * Returns the first directory, from this one up to the filesystem root,
   * holding a package or workspace marker.
   */
  private findWorkspaceAncestor(directory: string): null | string {
    for (let current = directory; ; current = path.dirname(current)) {
      const marker = WORKSPACE_MARKERS.map((name) =>
        path.join(current, name),
      ).find((candidate) => existsSync(candidate));

      if (marker !== undefined) {
        return marker;
      }
      if (path.dirname(current) === current) {
        return null;
      }
    }
  }

  /** Reads one manifest beneath the workspace root. */
  private readManifest(
    workspaceRoot: string,
    relativeDirectory: string,
  ): { packageManager?: string; version?: string } {
    const manifestPath = path.join(
      workspaceRoot,
      relativeDirectory,
      "package.json",
    );

    return JSON.parse(readFileSync(manifestPath, "utf8")) as {
      packageManager?: string;
      version?: string;
    };
  }

  /**
   * Reads the version of a tool this workspace installed, refusing to leave
   * it unpinned: an empty range would let the consumer drift silently.
   */
  private readToolVersion(workspaceRoot: string, name: string): string {
    const { version } = this.readManifest(
      workspaceRoot,
      `node_modules/${name}`,
    );

    if (version === undefined || version === "") {
      throw new Error(
        `Cannot pin ${name} in the consumer: the workspace has no installed version of it. Run pnpm install first.`,
      );
    }

    return version;
  }

  /**
   * Resolves the directory consumers are created beneath, refusing one that
   * sits inside any package or workspace.
   */
  private resolveConsumerParent(): string {
    const configured = process.env[CONSUMER_ROOT_VARIABLE];
    const parent =
      configured === undefined || configured === "" ? tmpdir() : configured;
    mkdirSync(parent, { recursive: true });

    const resolved = realpathSync(parent);
    const ancestor = this.findWorkspaceAncestor(resolved);

    if (ancestor !== null) {
      throw new Error(
        `Refusing to create a consumer beneath ${resolved}: ${ancestor} would let it resolve packages it never installed. Set ${CONSUMER_ROOT_VARIABLE} to a directory outside every package and workspace.`,
      );
    }

    return resolved;
  }

  /** Maps each package name to the `file:` specifier of its tarball. */
  private resolveTarballs(options: ConsumerOptions): Record<string, string> {
    const entries = options.publishablePackages.map(
      (item): [string, string] => [
        item.name,
        `file:${path.join(options.tarballsDirectory, `${item.tarball}-${item.version}.tgz`)}`,
      ],
    );

    return Object.fromEntries(entries);
  }

  /** Writes each file beneath the consumer, creating its directory first. */
  private writeFiles(
    directory: string,
    files: Readonly<Record<string, string>>,
  ): void {
    for (const [relativePath, content] of Object.entries(files)) {
      const target = path.join(directory, relativePath);
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, content, "utf8");
    }
  }

  // 🌎 Public Methods

  /**
   * Writes a consumer of the packed packages into a fresh directory.
   *
   * @param options - The packages, where their tarballs are, and the workspace they came from.
   * @returns Where the consumer was written, alongside the workspace it must not borrow from.
   */
  public createConsumer(options: ConsumerOptions): ConsumerContext {
    const files = {
      ...CONSUMER_FIXTURE_FILES,
      ...this.createTypecheckFiles(options),
      "package.json": this.createManifest(options),
      "pnpm-workspace.yaml": this.createWorkspaceConfiguration(options),
    };
    const parent = this.resolveConsumerParent();
    const directory = mkdtempSync(path.join(parent, CONSUMER_DIRECTORY_PREFIX));

    try {
      this.writeFiles(directory, files);
    } catch (error) {
      rmSync(directory, { force: true, recursive: true });
      throw error;
    }
    this.logger.log(
      `📦 Wrote a consumer of the packed packages to ${directory}`,
    );

    return { directory, workspaceRoot: options.workspaceRoot };
  }

  /**
   * Initializes the consumer's repository and installs its dependencies.
   *
   * @param context - The consumer to install.
   * @returns One failure message, or none when the install succeeded.
   */
  public installConsumer(context: ConsumerContext): string[] {
    const steps = [
      {
        args: ["init", "--quiet"],
        description: "Failed to run git init in the consumer",
        executable: "git",
        timeout: COMMAND_TIMEOUT,
      },
      {
        args: ["install", "--reporter=append-only"],
        description: "Failed to install the packed packages into the consumer",
        executable: "pnpm",
        timeout: INSTALL_TIMEOUT,
      },
    ];

    for (const { description, ...command } of steps) {
      const result = this.processService.run(context, command);

      if (result.status !== 0) {
        return [formatCommandFailure(description, result)];
      }
    }

    return [];
  }

  /**
   * Deletes the consumer.
   *
   * @param context - The consumer to delete.
   */
  public removeConsumer(context: ConsumerContext): void {
    rmSync(context.directory, { force: true, recursive: true });
  }
}
