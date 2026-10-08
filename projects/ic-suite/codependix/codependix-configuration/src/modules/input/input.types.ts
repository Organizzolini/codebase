// 🏷️ Types

import type { PromptObject } from "prompts";

/** Signature used to invoke interactive prompts, injectable for testing. */
export type PromptRunner = <PromptName extends string>(
  promptRequest: PromptObject<PromptName>,
) => Promise<Record<PromptName, unknown>>;
