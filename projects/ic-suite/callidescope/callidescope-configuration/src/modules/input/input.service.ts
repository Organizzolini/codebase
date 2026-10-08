import { Injectable } from "@nestjs/common";
import prompts from "prompts";

import { missingInputError, promptCancelledError } from "./input.constants";

import type { PromptRunner } from "./input.types";

/**
 * Parses CLI option values and asks for the ones a command still needs.
 *
 * Shared by `callidescope`, `depth`, and `breadth` so the parsing rules for
 * flags they hold in common — `--config`, `--directories`, `--format` — are
 * stated once rather than duplicated per command. Mirrors
 * `@codependix/configuration`'s `InputService`.
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
   * reads as one that succeeded.
   */
  private assertCanPrompt(subject: string): void {
    if (!this.isAtTerminal()) {
      throw missingInputError(subject);
    }
  }

  /**
   * Narrows a suggestion list to what has been typed so far.
   *
   * A method of its own rather than a closure inside the prompt, because this
   * is the whole of the completion rule and it is worth stating — and testing
   * — without a terminal anywhere near it.
   *
   * Matches on a substring rather than a prefix: a callable is addressed
   * `<file>#<name>`, and the name is far more often what someone remembers
   * than the path in front of it.
   */
  public completeSuggestions(args: {
    input: string;
    suggestions: readonly string[];
  }): string[] {
    const written = args.input.trim();
    const matches = args.suggestions.filter((suggestion) =>
      suggestion.toLowerCase().includes(written.toLowerCase()),
    );

    // The typed text stands in only when the list has nothing to offer.
    // Alongside real matches it would put a half-typed query at the top of
    // every list, ahead of the completions that were the point of asking.
    return matches.length === 0 && written.length > 0 ? [written] : matches;
  }

  // 🌎 Public Methods

  /**
   * Whether anybody is there to answer a question.
   *
   * The one place this is decided, so the value that refuses to be asked for
   * and the value that is merely offered cannot drift apart on what counts as
   * a terminal. `isTTY` is read as falsy rather than coerced: `@types/node`
   * calls it a `boolean` while it is `undefined` off a terminal, so lint
   * rejects the coercion that would say so.
   *
   * Public so that `ConfigurationService.resolveFormatOption` can ask it: the
   * facade owns the policy of whether to offer a prompt, and this class owns
   * the question it is deciding on. Package-internal all the same — nothing
   * outside this package can reach this class at all.
   */
  public isAtTerminal(): boolean {
    return process.stdin.isTTY;
  }

  /**
   * Splits `--directories`, a comma-separated list of project directories.
   *
   * Kept relative rather than resolved here: each entry is later resolved
   * against the workspace root, which is always the working directory, so
   * resolving here as well would only make a relative entry ambiguous about
   * which root it was ever relative to.
   */
  public parseCommaDelimitedOption(value: string | undefined): string[] {
    return value === undefined
      ? []
      : value
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean);
  }

  /** Trims an optional string option, treating blank as absent. */
  public parseOptionalOption(value: string | undefined): string | undefined {
    const trimmed = value?.trim();

    return trimmed === undefined || trimmed.length === 0 ? undefined : trimmed;
  }

  /**
   * Prompts for several values at once, completing the list as it is typed.
   *
   * The multiselect sibling of `promptForAutocomplete`, and it shares that
   * method's completion rule so a name typed here narrows the list the same
   * way it would there.
   *
   * Selecting nothing is refused rather than read as an empty list: the
   * caller asked because it needs at least one value, and `prompts` returns
   * `[]` both for a deliberate empty selection and for a prompt escaped out
   * of, which are the same thing to whoever has to act on it.
   */
  public async promptForAutocompleteMultiselect(args: {
    message: string;
    subject: string;
    suggestions: readonly string[];
  }): Promise<string[]> {
    this.assertCanPrompt(args.subject);

    const response = await this.promptRunner({
      choices: args.suggestions.map((value) => ({ title: value, value })),
      message: args.message,
      name: "value",
      suggest: async (input: string) =>
        await Promise.resolve(
          this.completeSuggestions({
            input,
            suggestions: args.suggestions,
          }).map((value) => ({ title: value, value })),
        ),
      type: "autocompleteMultiselect",
    });
    const value: unknown = response.value;

    if (!Array.isArray(value)) {
      throw promptCancelledError(args.subject);
    }

    // Restated as `unknown[]` rather than used as narrowed: `Array.isArray`
    // narrows an `unknown` to `any[]`, which would leave every entry below
    // unchecked and cost the package its type coverage.
    const entries: unknown[] = value;

    if (entries.length === 0) {
      throw promptCancelledError(args.subject);
    }

    const chosen = entries.filter(
      (entry): entry is string => typeof entry === "string",
    );

    if (chosen.length !== entries.length) {
      throw new Error(
        "Prompt resolved to something other than a list of text.",
      );
    }

    return chosen;
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
