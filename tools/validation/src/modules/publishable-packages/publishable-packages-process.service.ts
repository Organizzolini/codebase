import { spawnSync } from "node:child_process";
import path from "node:path";

import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logging";

import {
  ESCAPE_SEQUENCE_PATTERN,
  INHERITED_VARIABLE_PATTERN,
  REGISTRY_WRITE_ARGUMENTS,
} from "./publishable-packages-consumer.constants";

import type {
  ConsumerCommand,
  ConsumerCommandResult,
  ConsumerContext,
} from "./publishable-packages.types";

/**
 * Runs a command inside a consumer, isolated from the workspace that packed
 * its tarballs and unable to write to any registry.
 */
@Injectable()
export class PublishablePackagesProcessService {
  // 🏗 Dependency Injection

  constructor(private readonly logger: LoggerService) {
    this.logger.setContext(PublishablePackagesProcessService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Throws before a command that would publish, deprecate, or log in to a
   * registry can start.
   */
  private assertNoRegistryWrite(command: ConsumerCommand): void {
    for (const word of [path.basename(command.executable), ...command.args]) {
      if (REGISTRY_WRITE_ARGUMENTS.has(word)) {
        throw new Error(
          `Refusing to run "${word}": the publishable packages check never writes to a registry.`,
        );
      }
    }
  }

  /**
   * Builds the environment a consumer command runs under.
   *
   * Starts from this process's own, minus anything that would let the
   * consumer reach this workspace or a registry token: its `PATH` entries
   * such as `node_modules/.bin`, its Nx task variables, and its package
   * manager configuration. The user configuration is pointed at an empty file
   * inside the consumer, so a token in `~/.npmrc` is never even read.
   */
  private createEnvironment(context: ConsumerContext): NodeJS.ProcessEnv {
    const environment: NodeJS.ProcessEnv = {};
    for (const [name, value] of Object.entries(process.env)) {
      if (!INHERITED_VARIABLE_PATTERN.test(name)) {
        environment[name] = value;
      }
    }

    const workspacePrefix = `${context.workspaceRoot}${path.sep}`;
    const searchPath: string[] = [];
    for (const entry of (environment["PATH"] ?? "").split(path.delimiter)) {
      const insideWorkspace =
        entry === context.workspaceRoot || entry.startsWith(workspacePrefix);
      if (entry !== "" && !insideWorkspace) {
        searchPath.push(entry);
      }
    }

    return {
      ...environment,
      FORCE_COLOR: "0",
      NO_COLOR: "1",
      npm_config_userconfig: path.join(context.directory, ".npmrc-user"),
      NX_DAEMON: "false",
      NX_NO_CLOUD: "true",
      NX_TUI: "false",
      PATH: searchPath.join(path.delimiter),
    };
  }

  // 🌎 Public Methods

  /**
   * Runs one command in the consumer's directory and returns what it printed.
   *
   * @param context - The consumer to run inside, and the workspace to hide.
   * @param command - The executable, its arguments, and its time limit.
   * @returns The command's combined output, free of color codes, and its exit code.
   */
  public run(
    context: ConsumerContext,
    command: ConsumerCommand,
  ): ConsumerCommandResult {
    this.assertNoRegistryWrite(command);

    const result = spawnSync(command.executable, [...command.args], {
      cwd: context.directory,
      encoding: "utf8",
      env: this.createEnvironment(context),
      timeout: command.timeout,
    });
    const printed = [result.stdout, result.stderr]
      .filter((stream): stream is string => typeof stream === "string")
      .join("");
    const output = result.error ? `${printed}${String(result.error)}` : printed;

    return {
      output: output.replaceAll(ESCAPE_SEQUENCE_PATTERN, ""),
      status: result.status,
    };
  }
}
