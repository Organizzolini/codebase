import { Injectable } from "@nestjs/common";
import prompts from "prompts";

import { missingInputError, promptCancelledError } from "./input.constants";

import type { PromptRunner } from "./input.types";

/**
 * Parses CLI option values and asks for the ones a command still needs.
 *
 * Lives here rather than in `codependix-cli` so the shared flag rules are
 * stated once, beside the configuration those flags select. Mirrors
 * `@callidescope/configuration`'s `InputService`.
 */
@Injectable()
export class InputService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  /** Overridable so tests never touch a real terminal. */
  private readonly promptRunner: PromptRunner = prompts;

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Refuses to draw a prompt nobody can answer.
   *
   * `prompts` does not fail on a non-terminal stdin — it renders the menu,
   * never resolves, and lets the process exit 0, so a run that did nothing
   * reads as one that succeeded. `isTTY` is read as falsy rather than
   * coerced: `@types/node` calls it a `boolean`, so lint rejects a coercion.
   */
  private assertCanPrompt(subject: string): void {
    if (!process.stdin.isTTY) {
      throw missingInputError(subject);
    }
  }

  // 🌎 Public Methods

  /**
   * Parses a comma-separated list option, dropping blank entries.
   *
   * Mirrors `@callidescope/configuration`'s `InputService` exactly: an absent
   * flag resolves to an empty list rather than `undefined`, so a caller
   * overriding a configured list treats "the flag was left off" and "the flag
   * named nothing" the same way.
   */
  public parseCommaDelimitedOption(value: string | undefined): string[] {
    return value === undefined
      ? []
      : value
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean);
  }

  /**
   * Parses a valueless boolean flag, which is present or it is not.
   *
   * Commander passes `undefined` for a flag carrying no value, so the flag
   * appearing at all is what makes it true; reading that as false would turn
   * every such flag permanently off.
   */
  public parseFlagOption(value: boolean | undefined): boolean {
    return value ?? true;
  }

  /** Trims an optional string option, treating blank as absent. */
  public parseOptionalOption(value: string | undefined): string | undefined {
    const trimmed = value?.trim();

    return trimmed === undefined || trimmed.length === 0 ? undefined : trimmed;
  }

  /**
   * Parses a path option that falls back to the working directory.
   *
   * Left unresolved: the caller resolves it against its own root, and
   * resolving twice makes a relative path ambiguous about which it meant.
   */
  public parsePathOption(value: string | undefined): string {
    return this.parseOptionalOption(value) ?? process.cwd();
  }

  /** Prompts for one value out of a fixed set of choices. */
  public async promptForSelect<Choice extends string>(args: {
    choices: readonly Choice[];
    message: string;
    subject: string;
  }): Promise<Choice> {
    this.assertCanPrompt(args.subject);

    const response = await this.promptRunner({
      choices: args.choices.map((choice) => ({ title: choice, value: choice })),
      message: args.message,
      name: "value",
      type: "select",
    });
    const value: unknown = response.value;

    if (value === undefined) {
      throw promptCancelledError(args.subject);
    }

    const matched = args.choices.find((choice) => choice === value);

    if (matched === undefined) {
      throw new Error(
        `Prompt did not resolve to one of: ${args.choices.join(", ")}.`,
      );
    }

    return matched;
  }
}
