import { ConfigurationService } from "@callidescope/configuration";
import { Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import { LoggerService } from "@codebase/logging";

import { readRefusalHeadline } from "../callidescope/callidescope.constants";

import { LimitsService } from "./limits.service";
import { RenderLimitsService } from "./render-limits.service";

import type { LimitsCommandOptions } from "./limits.types";
import type { LogData } from "@codebase/logging";

/**
 * CLI entry point that lists what every project in scope is gated by.
 *
 * A reading command, like `depth` and `breadth`: it touches no destination,
 * fails on no limit, and would have nothing to fail on anyway, since it
 * resolves configuration without measuring a single stack. What it restores is
 * the one thing per-project limits cost — a ratchet written one file per
 * project is no longer reviewable in the single file it used to live in, and
 * this is where it is reviewable as a set instead.
 *
 * `codometer configuration --limits` is the same command for the same reason,
 * and this matches its shape: a markdown table on standard output, one row per
 * limit, naming the file each number is declared in.
 */
@Command({
  description:
    "List every project's resolved depth and breadth limits, and the file each came from",
  name: "limits",
})
@Injectable()
export class LimitsCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly limitsService: LimitsService,
    private readonly renderLimitsService: RenderLimitsService,
    private readonly configurationService: ConfigurationService,
    private readonly logger: LoggerService,
  ) {
    super();
    this.logger.setContext(LimitsCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Logs one refusal under its own headline, and fails the run.
   *
   * A message rather than a stack trace: every refusal here names the project
   * and the field, and each is about a file a person wrote. Nothing has been
   * printed by the time this runs, so a refused listing prints a reason and
   * nothing that looks like an answer.
   */
  private reject(headline: string, data: LogData): void {
    this.logger.error(headline, undefined, data);
    process.exitCode = 1;
  }

  // 🌎 Public Methods

  /** Parses `--config`. */
  @Option({
    description: "Path to a callidescope configuration file",
    flags: "--config [config]",
  })
  public parseConfig(value: string | undefined): string | undefined {
    return this.configurationService.parseOptionalOption(value);
  }

  /**
   * Prints every project's resolved limits.
   *
   * Written to standard output rather than to a file: the listing is something
   * a reader looks at or pipes onward, and unlike a report there is nothing
   * downstream that consumes it.
   */
  public async run(
    _passedParameters: string[],
    options: LimitsCommandOptions = {},
  ): Promise<void> {
    try {
      const rows = await this.limitsService.list(options);

      process.stdout.write(`${this.renderLimitsService.render(rows)}\n`);
    } catch (error) {
      const headline = readRefusalHeadline(error);

      if (headline === undefined || !(error instanceof Error)) {
        throw error;
      }

      this.reject(headline, { reason: error.message });
    }
  }
}
