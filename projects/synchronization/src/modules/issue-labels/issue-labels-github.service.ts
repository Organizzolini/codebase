import { spawnSync } from "node:child_process";

import { Injectable } from "@nestjs/common";

import { GITHUB_CLI_BINARY } from "./issue-labels.constants";

import type { GithubCliResult } from "./issue-labels.types";

/**
 * Runs the `gh` command-line client and reports what it produced.
 *
 * The `gh` client rather than an HTTP client on purpose: it already resolves
 * the repository from the checkout and the token from the environment, so a
 * workflow, a fork, and a developer's terminal all authenticate the same way
 * with nothing to configure. Near-identical helpers live beside the other
 * `gh`-backed checks in this repository; that duplication is deliberate, in
 * keeping with this codebase's preference for small self-contained modules.
 *
 * Nothing here throws. A `gh` that is missing, unauthorized, or rate-limited
 * is a fact this reconciliation reports and moves on from, never an exception
 * that stops it.
 */
@Injectable()
export class IssueLabelsGithubService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Whatever `gh` said about why it could not do the thing.
   *
   * Both streams, because which one carries the reason varies by subcommand,
   * and a failure reported with nothing to read is worse than a clumsy line.
   */
  public describeFailure(result: GithubCliResult): string {
    const output = [result.standardError, result.standardOutput.trim()]
      .filter((part) => part !== "")
      .join(" ");

    return output === "" ? "no output" : output;
  }

  /** Whether the `gh` binary can be executed at all. */
  public isAvailable(): boolean {
    return this.run(["--version"]).available;
  }

  /** Invokes `gh` with these arguments, capturing each stream on its own. */
  public run(commandArguments: readonly string[]): GithubCliResult {
    const completion = spawnSync(GITHUB_CLI_BINARY, [...commandArguments], {
      encoding: "utf8",
    });

    if (completion.error !== undefined) {
      return {
        available: false,
        standardError: completion.error.message,
        standardOutput: "",
        succeeded: false,
      };
    }

    return {
      available: true,
      standardError: completion.stderr.trim(),
      standardOutput: completion.stdout,
      succeeded: completion.status === 0,
    };
  }
}
