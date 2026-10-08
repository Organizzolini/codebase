import { Injectable } from "@nestjs/common";

import { InputService } from "../input/input.service";

import {
  CHECK_BOUNDARIES,
  CHECK_NAMES,
  CHECK_REPORTS,
  CHECK_SEPARATOR,
  RUN_MODE_CHOICES,
  RUN_MODE_SUBJECT,
} from "./configuration.constants";

import type { MapCommandOptions } from "./configuration.types";
import type { RunMode, RunModeSelection } from "@codependix/core";

/**
 * Reads the command line into what the run will do.
 *
 * Internal to the `configuration` module rather than a module of its own:
 * resolving the command line is half of answering "what is this run actually
 * configured to do", and `ConfigurationService` is the one public way to ask.
 * `codometer-cli` and `callidescope-cli` still carry a `run-plan` module of
 * this shape inside their hosts — and, deliberately, the same `--check
 * reports` spelling, since a stale configured destination is one finding
 * across all three.
 */
@Injectable()
export class FlagResolutionService {
  // 🏗 Dependency Injection

  constructor(private readonly inputService: InputService) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** States what `--check` accepts, in front of whatever went wrong. */
  private describeAcceptedCheckNames(problem: string): string {
    return `${problem}. It takes a comma-separated set drawn from ${CHECK_NAMES.map((name) => `"${name}"`).join(" and ")}, as in "--check ${CHECK_NAMES.join(CHECK_SEPARATOR)}".`;
  }

  /** The mode nothing was selected for, so an error path has one to return. */
  private emptyMode(): RunMode {
    return { checksBoundaries: false, checksReports: false, writes: false };
  }

  /**
   * Asks which of the three things a run with no flags at all should do.
   *
   * Nothing is inferred: a session that cannot be asked fails rather than
   * defaulting to a write nobody requested, and a run that quietly did
   * nothing and exited 0 is worse than either.
   */
  private async promptForMode(): Promise<RunModeSelection> {
    const choice = await this.inputService.promptForSelect({
      choices: RUN_MODE_CHOICES,
      message:
        "Check declared boundaries, check every configured export is current, or write them?",
      subject: RUN_MODE_SUBJECT,
    });

    return {
      errors: [],
      mode: {
        checksBoundaries: choice === CHECK_BOUNDARIES,
        checksReports: choice === CHECK_REPORTS,
        writes: choice === "write",
      },
    };
  }

  /**
   * Reads the `--check` value into the set of things the run fails on.
   *
   * A flag passed without a value arrives as `true` and is a mistake rather
   * than a shorthand: read as "gate nothing" it would be a gate that cannot
   * fail, and `--check "$GATES"` with the variable unset would pass forever
   * over a workspace whose every rule was broken — worse than no gate at all,
   * because it looks like protection.
   */
  private readCheckNames(
    value: string | true | undefined,
    errors: string[],
  ): Set<string> {
    if (value === undefined) {
      return new Set();
    }

    const names =
      value === true
        ? []
        : value
            .split(CHECK_SEPARATOR)
            .map((name) => name.trim())
            .filter((name) => name !== "");

    if (names.length === 0) {
      errors.push(this.describeAcceptedCheckNames("--check needs a value"));
      return new Set();
    }

    return this.validateCheckNames(names, errors);
  }

  /** Keeps the names `--check` knows and complains about the rest. */
  private validateCheckNames(names: string[], errors: string[]): Set<string> {
    const accepted = new Set<string>();

    for (const name of names) {
      if (CHECK_NAMES.includes(name)) {
        accepted.add(name);
        continue;
      }

      errors.push(
        this.describeAcceptedCheckNames(`--check does not accept "${name}"`),
      );
    }

    return accepted;
  }

  // 🌎 Public Methods

  /**
   * Reads the flags into what the run writes and what it fails on.
   *
   * `--write --check reports` is refused rather than obeyed: nothing can be
   * stale immediately after being written, so a run asking for both has
   * misunderstood one of them and would pass whatever it was meant to catch.
   * `--write --check boundaries` is legal for the mirror-image reason — a
   * boundary has no destination to be stale, so writing every export and
   * judging every graph in one run is two independent things, not a
   * contradiction.
   */
  public async selectMode(
    options: MapCommandOptions,
  ): Promise<RunModeSelection> {
    const errors: string[] = [];
    const names = this.readCheckNames(options.check, errors);
    const writes = options.write === true;

    if (errors.length > 0) {
      return { errors, mode: this.emptyMode() };
    }

    if (names.size === 0 && !writes) {
      return this.promptForMode();
    }

    if (writes && names.has(CHECK_REPORTS)) {
      errors.push(
        `--write cannot be combined with --check ${CHECK_REPORTS}: an export cannot be stale in the run that just wrote it. Drop one of them, or run --write and --check ${CHECK_REPORTS} separately.`,
      );
    }

    return {
      errors,
      mode: {
        checksBoundaries: names.has(CHECK_BOUNDARIES),
        checksReports: names.has(CHECK_REPORTS),
        writes,
      },
    };
  }

  /**
   * Whether a run reads or rewrites the files its exports live in.
   *
   * `--check boundaries` alone reads no destination and writes nothing, so it
   * leaves every committed export exactly as it found it — which is what
   * makes it safe on a branch, where the exports are expected to be behind.
   */
  public touchesFiles(mode: RunMode): boolean {
    return mode.checksReports || mode.writes;
  }
}
