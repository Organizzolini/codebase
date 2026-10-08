// ♟️ Constants

/**
 * Thrown when a command line cannot be turned into a run.
 *
 * One class rather than one per cause: every cause is the same event to
 * whoever catches it — nothing was attempted, and the fix is to retype the
 * flags. Only the wording varies, which is what the factories below do.
 *
 * Sits beside the constants rather than in an `input.errors.ts`, the way
 * `UnknownConfigurationFileTypeError` sits in `configuration.constants.ts`.
 */
export class InputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InputError";
  }
}

/**
 * A required value that cannot be asked for, because stdin is not a terminal.
 *
 * `prompts` does not fail there — it draws its menu, never resolves, and the
 * process exits 0 having done nothing. This refuses to become that silent
 * green no-op.
 */
export const missingInputError = (subject: string): InputError =>
  new InputError(
    `${subject} is required, and stdin is not a terminal so it cannot be asked for.`,
  );

/**
 * A prompt someone dismissed without answering.
 *
 * Worded apart from a prompt that resolved to something unrecognized:
 * pressing escape is ordinary, and reporting it as a crash sends the reader
 * debugging for nothing.
 */
export const promptCancelledError = (subject: string): InputError =>
  new InputError(`${subject} was not answered.`);
