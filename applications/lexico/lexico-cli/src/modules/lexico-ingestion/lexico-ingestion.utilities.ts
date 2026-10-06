import prompts from "prompts";

import { NO_SELECTION_CHOICE } from "./lexico-ingestion.constants";

import type {
  CommandOptionChoice,
  CommandOptionValue,
  SelectChoiceArguments,
} from "./lexico-ingestion.types";

/**
 * Returns the text given to a flag, or `undefined` when the flag was omitted,
 * passed bare, or passed an empty value.
 */
export function getOptionText(value: CommandOptionValue): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  return text === "" ? undefined : text;
}

/**
 * Whether standard input is a terminal, so an interactive prompt can be answered.
 */
export function isInteractiveTerminal(): boolean {
  return process.stdin.isTTY;
}

/**
 * Validates a flag's text against the choices a command offers.
 *
 * @throws When `text` is not one of `choices`, with `notFoundMessage`.
 */
export function requireChoice(
  text: string,
  choices: CommandOptionChoice[],
  notFoundMessage: string,
): string {
  if (choices.some((choice) => choice.value === text)) return text;
  throw new Error(notFoundMessage);
}

/**
 * Asks the user to pick one of `choices`, with a leading `noSelectionTitle`
 * entry that means "no filter". Returns `undefined` for that entry, and
 * without asking at all when standard input is not a terminal, so a piped or
 * scheduled run takes the documented default instead of hanging or aborting.
 *
 * @throws When the prompt is cancelled or aborted, so the command fails loudly.
 */
export async function selectChoice({
  choices,
  message,
  noSelectionTitle,
}: SelectChoiceArguments): Promise<string | undefined> {
  if (!isInteractiveTerminal()) return undefined;

  const response: unknown = await prompts({
    choices: [
      { title: noSelectionTitle, value: NO_SELECTION_CHOICE },
      ...choices,
    ],
    message,
    name: "choice",
    type: "autocomplete",
  });
  const choice =
    typeof response === "object" && response !== null && "choice" in response
      ? response.choice
      : undefined;

  if (typeof choice !== "string") {
    throw new TypeError(`Prompt cancelled: ${message}`);
  }

  return choice === NO_SELECTION_CHOICE ? undefined : choice;
}
