// 🏷️ Types

import type { PromptObject } from "prompts";

/**
 * The `--format` option every callidescope command shares.
 *
 * Stated as its own interface so `resolveFormatOption` can be generic over a
 * command's whole options object and carry its other flags through unchanged.
 *
 * Held as written rather than as one of the formats a run can print: which
 * values exist is `FlagResolutionService`'s to decide, and a type that
 * narrowed here would leave a misspelled `--format` no way to reach the one
 * place that refuses it.
 */
export interface CallidescopeFormatOptions {
  readonly format?: string | undefined;
}

/** Signature used to invoke interactive prompts, injectable for testing. */
export type PromptRunner = <PromptName extends string>(
  promptRequest: PromptObject<PromptName>,
) => Promise<Record<PromptName, unknown>>;
