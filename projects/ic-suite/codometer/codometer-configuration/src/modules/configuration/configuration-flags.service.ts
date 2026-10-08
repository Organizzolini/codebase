import { Injectable } from "@nestjs/common";

import {
  CHECK_LIMITS,
  CHECK_NAMES,
  CHECK_REPORTS,
  CHECK_SEPARATOR,
  FORMAT_MARKDOWN,
  FORMAT_NAMES,
} from "./configuration-flags.constants";

import type {
  CodometerFormat,
  MeasureCommandOptions,
  MeasureFormat,
  ModeSelection,
  RunMode,
} from "./configuration.types";

/**
 * Reads the command line `ConfigurationService` answers a run from.
 *
 * Not exported. The configuration layer has one public entry point, and this
 * is the half of it that reads flags rather than files.
 *
 * `codometer`, `changes` and `configuration` share the rules for the flags
 * they hold in common, and those rules are subtle enough to be worth stating
 * once: commander hands a valueless flag through as `true` without ever
 * calling its parser, so a command that narrows text and one that does not
 * disagree about what `--flag "$UNSET"` meant. A flag only one command takes
 * keeps its own parser.
 */
@Injectable()
export class ConfigurationFlagsService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** States what `--check` accepts, in front of whatever went wrong. */
  private describeAcceptedCheckNames(problem: string): string {
    return `${problem}. It takes a comma-separated set drawn from ${CHECK_NAMES.map((name) => `"${name}"`).join(" and ")}, as in "--check ${CHECK_NAMES.join(CHECK_SEPARATOR)}".`;
  }

  /**
   * Reads the `--check` value into the set of things the run fails on.
   *
   * A flag passed without a value arrives as `true` and is a mistake rather
   * than a shorthand: it used to mean "check everything", and a set with
   * nothing in it looks exactly like the flag having been left off.
   */
  private readCheckNames(
    value: string | true | undefined,
    errors: string[],
  ): Set<string> {
    if (value === undefined) {
      return new Set();
    }

    if (value === true) {
      errors.push(this.describeAcceptedCheckNames("--check needs a value"));
      return new Set();
    }

    const names = value
      .split(CHECK_SEPARATOR)
      .map((name) => name.trim())
      .filter((name) => name !== "");

    // An empty or comma-only value is the same mistake as a valueless flag and
    // is refused the same way. Read as "gate nothing" it would be a gate that
    // cannot fail — `--check "$GATES"` with the variable unset would pass
    // forever against a stale report, which is worse than no gate at all
    // because it looks like protection.
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
   * Reads an option that carries a default when it was left off.
   *
   * The fallback belongs to the command rather than here: two commands that
   * share the parsing rule for `--format` need not share what they render
   * when nobody said.
   */
  public parseDefaultedOption(value: unknown, fallback: string): string {
    return this.parseOptionalOption(value) ?? fallback;
  }

  /**
   * Reads a directory option, falling back to the working directory.
   *
   * The fallback is the process's working directory as it stands when the
   * option is read, which is what every command means by "here" — no command
   * changes it mid-run, and one that did would want the new one.
   */
  public parseDirectoryOption(value: unknown): string {
    return this.parseDefaultedOption(value, process.cwd());
  }

  /**
   * Reads an option that carries text, or nothing at all.
   *
   * A flag written `--baseline-url "$EMPTY"` can reach commander with no
   * value at all, which it reports as `true` without calling the option's
   * parser. So anything but a non-empty string counts as absent — passing
   * that boolean through renders a link to the word `true`.
   *
   * Deliberately does not trim, unlike `callidescope`'s same-named method: a
   * codometer option is a path, and a path whose surrounding spaces were
   * silently dropped is a different path from the one that was asked for.
   */
  public parseOptionalOption(value: unknown): string | undefined {
    return typeof value === "string" && value !== "" ? value : undefined;
  }

  /**
   * Reads `--format` into what the run prints, falling back to the resolved
   * configuration's own `format` when the flag was left off.
   *
   * The fallback never infers from which other flags are present — omitting
   * `--format` always reads the same value the configuration declares,
   * whether or not this run also writes a file.
   */
  public resolveFormat(
    value: string | undefined,
    configuredFormat: CodometerFormat,
    errors: string[],
  ): MeasureFormat | undefined {
    if (value === undefined) {
      return configuredFormat;
    }

    const matched = FORMAT_NAMES.find((name) => name === value);

    if (matched === undefined) {
      errors.push(
        `--format does not accept "${value}". It takes one of ${FORMAT_NAMES.map((name) => `"${name}"`).join(" and ")}, as in "--format ${FORMAT_MARKDOWN}".`,
      );
    }

    return matched;
  }

  /**
   * Reads the flags into what the run writes and what it fails on.
   *
   * Writing is answered per output, by whether that output's own
   * `--output-*` flag was passed at all. `--output-json`/`--output-markdown`
   * together with `--check reports` is refused rather than obeyed: nothing
   * can be stale immediately after being written, so a run asking for both on
   * the same output has misunderstood one of them and would silently compare
   * instead of writing.
   */
  public selectMode(options: MeasureCommandOptions): ModeSelection {
    const errors: string[] = [];
    const names = this.readCheckNames(options.check, errors);
    const mode: RunMode = {
      checksLimits: names.has(CHECK_LIMITS),
      checksReports: names.has(CHECK_REPORTS),
      writesJson: options.outputJson !== undefined,
      writesMarkdown: options.outputMarkdown !== undefined,
    };

    if (mode.checksReports && (mode.writesJson || mode.writesMarkdown)) {
      errors.push(
        `--output-json or --output-markdown cannot be combined with --check ${CHECK_REPORTS}: a report cannot be stale in the run that just wrote it. Drop --check ${CHECK_REPORTS}, or run it separately from the run that writes.`,
      );
    }

    return { errors, mode };
  }
}
