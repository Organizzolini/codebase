import { spawnSync } from "node:child_process";

import { Injectable } from "@nestjs/common";

import { GITHUB_CLI_BINARY } from "./issue-metadata.constants";

import type {
  GithubCliResult,
  IssueSummary,
  ListIssuesResult,
} from "./issue-metadata.types";

/**
 * Runs the `gh` command-line client and reports what it produced.
 *
 * The `gh` client rather than an HTTP client on purpose: it already resolves
 * the repository from the checkout and the token from the environment, so a
 * workflow, a fork, and a developer's terminal all authenticate the same way
 * with nothing to configure.
 *
 * Near-identical helpers live beside the pull request checks in this same
 * project and beside the label synchronizer in `projects/synchronization`. That
 * duplication is deliberate: the Nx tag constraints and this repository's
 * preference for small self-contained modules make a shared abstraction with
 * a handful of callers a package to maintain in exchange for forty lines.
 *
 * Nothing here throws. This command reports on an issue rather than changing
 * one, so a `gh` that is missing, unauthorized, or rate-limited is a fact to
 * report, not an exception to propagate.
 */
@Injectable()
export class IssueMetadataGithubService {
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

  /** Lists all open issues with their number, title, body, and labels. */
  public listOpenIssues(): ListIssuesResult {
    const result = this.run([
      "issue",
      "list",
      "--state",
      "open",
      "--limit",
      "500",
      "--json",
      "number,title,body,labels",
    ]);

    if (!result.succeeded) {
      return { error: this.describeFailure(result), success: false };
    }

    try {
      const issues = JSON.parse(result.standardOutput) as IssueSummary[];
      return { issues, success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        error: `Unable to parse gh issue list output: ${message}`,
        success: false,
      };
    }
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
