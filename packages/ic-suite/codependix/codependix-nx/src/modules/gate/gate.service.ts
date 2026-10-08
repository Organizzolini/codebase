import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import { Injectable } from "@nestjs/common";

import { PluginService } from "../plugin/plugin.service";

import {
  CLI_ENTRY_SPECIFIER,
  LOADER_SPECIFIER,
  NX_CONFIGURATION_FILENAME,
} from "./gate.constants";

import type {
  BuildCommandArguments,
  GateOptions,
  GateSelection,
  RunGateArguments,
} from "./gate.types";

/**
 * Runs `codependix map --check boundaries` for the projects one gate judges.
 *
 * The command line runs as a child process rather than in this one, because
 * its boundary check boots the workspace's NestJS containers by importing
 * their TypeScript sources, and constructor injection there needs the
 * decorator metadata the `@swc-node/register` loader emits. Nx loads this
 * plugin under no such loader, so only a fresh `node --import` can provide it.
 */
@Injectable()
export class GateService {
  // 🏗 Dependency Injection

  constructor(private readonly pluginService: PluginService) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Reads a list of names out of an executor's options.
   *
   * Entries are split on commas, trimmed, and the blanks dropped, so
   * `--projects="a, b,"` names two projects rather than three — and the list
   * reaches the command line joined by commas, where a blank would read as a
   * project named nothing.
   */
  private readNameList(value: readonly string[] | undefined): string[] {
    return (value ?? [])
      .flatMap((entry) => entry.split(","))
      .map((entry) => entry.trim())
      .filter((entry) => entry !== "");
  }

  /**
   * Reads the workspace's `nx.json`, or nothing when it cannot be read.
   *
   * Unreadable or malformed is not an error: the caller falls back to the
   * conventional paths, which a workspace with no registration gets anyway.
   */
  private readNxConfiguration(workspaceRoot: string): unknown {
    try {
      return JSON.parse(
        readFileSync(
          path.join(workspaceRoot, NX_CONFIGURATION_FILENAME),
          "utf8",
        ),
      ) as unknown;
    } catch {
      return undefined;
    }
  }

  /**
   * Starts the command line and settles on whether it exited zero.
   *
   * Its output is forwarded as it arrives rather than collected, so a long
   * container boot shows progress and a finding reaches the task log even
   * when the run is interrupted. Killed by a signal counts as a failure: no
   * verdict was reached, so none may be recorded as a pass.
   */
  private async spawnCommandLine(args: {
    argv: string[];
    workspaceRoot: string;
  }): Promise<boolean> {
    return await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, args.argv, {
        cwd: args.workspaceRoot,
        stdio: ["ignore", "pipe", "pipe"],
      });

      child.stdout.on("data", (chunk: Buffer) => process.stdout.write(chunk));
      child.stderr.on("data", (chunk: Buffer) => process.stderr.write(chunk));
      child.on("error", reject);
      child.on("close", (exitCode: null | number) => {
        resolve(exitCode === 0);
      });
    });
  }

  // 🌎 Public Methods

  /**
   * Builds the `node` arguments one gate runs.
   *
   * `--projects` and `--tags` name what is judged; the command line builds
   * over their dependency closure and fails only on a finding charged to one
   * of them, which is what lets a dependency's broken boundary fail that
   * dependency's own gate rather than every gate downstream of it.
   */
  public buildCommandArguments(args: BuildCommandArguments): string[] {
    return [
      "--import",
      args.loaderSpecifier,
      args.cliEntryPath,
      "map",
      "--directory",
      args.workspaceRoot,
      "--config",
      args.configurationPath,
      "--check",
      "boundaries",
      ...(args.projects.length > 0
        ? ["--projects", args.projects.join(",")]
        : []),
      ...(args.tags.length > 0 ? ["--tags", args.tags.join(",")] : []),
      ...(args.dependencies ? [] : ["--no-dependencies"]),
    ];
  }

  /**
   * Resolves the configuration path one gate runs with.
   *
   * A path the target was given wins. Otherwise the one this plugin was
   * registered with is read back out of `nx.json`, and resolved exactly as
   * inference resolved it — so the file a gate reads is always the file its
   * cache inputs named.
   */
  public resolveConfigurationPath(args: {
    configurationPath?: string | undefined;
    workspaceRoot: string;
  }): string {
    if (args.configurationPath !== undefined && args.configurationPath !== "") {
      return args.configurationPath;
    }

    return this.pluginService.resolvePluginOptions({
      exists: (candidatePath) =>
        existsSync(path.join(args.workspaceRoot, candidatePath)),
      options: this.pluginService.readRegisteredOptions(
        this.readNxConfiguration(args.workspaceRoot),
      ),
    }).configurationPath;
  }

  /**
   * Resolves which projects one gate judges.
   *
   * With neither `projects` nor `tags` given, it is the project the target
   * belongs to. Throws rather than judging nothing, because Nx turns a thrown
   * executor into a failed task with the message attached, and a gate that
   * judged nothing has no verdict to record.
   */
  public resolveSelection(args: {
    options: GateOptions;
    projectName: string | undefined;
  }): GateSelection {
    const projects = this.readNameList(args.options.projects);
    const tags = this.readNameList(args.options.tags);

    if (projects.length > 0 || tags.length > 0) {
      return { projects, tags };
    }

    if (args.projectName === undefined) {
      throw new Error(
        "The codependix gate executor must be run against a project, or given `projects` or `tags`.",
      );
    }

    return { projects: [args.projectName], tags };
  }

  /** Runs one gate, and settles on whether it passed. */
  public async run(args: RunGateArguments): Promise<boolean> {
    const argv = this.buildCommandArguments({
      ...this.resolveSelection(args),
      cliEntryPath: createRequire(import.meta.url).resolve(CLI_ENTRY_SPECIFIER),
      configurationPath: this.resolveConfigurationPath({
        configurationPath: args.options.configurationPath,
        workspaceRoot: args.workspaceRoot,
      }),
      dependencies: args.options.dependencies !== false,
      loaderSpecifier: LOADER_SPECIFIER,
      workspaceRoot: args.workspaceRoot,
    });

    return await this.spawnCommandLine({
      argv,
      workspaceRoot: args.workspaceRoot,
    });
  }
}
