import { z } from "zod";

/**
 * Config path used when `--config` is absent.
 *
 * Shared by every command that loads the configuration, so the default is
 * true in one place rather than once per command.
 */
export const DEFAULT_CONFIGURATION_PATH = "configuration/conformetry.config.ts";

/**
 * Indent width for machine-readable output.
 *
 * Shared by every command with a `--json` mode, so the two listings are
 * parseable the same way.
 */
export const JSON_INDENT = 2;

/**
 * Names a template no configuration answers to.
 *
 * Shared by `generate` and `validate` so both refuse an unknown name the same
 * way: silently dropping it would narrow a run further than asked and, with
 * nothing left, report a vacuous pass.
 */
export const unknownTemplateError = (args: {
  availableTemplateNames: readonly string[];
  templateName: string;
}): Error =>
  new Error(
    `Unknown template "${args.templateName}". Available: ${args.availableTemplateNames.join(", ")}`,
  );

/**
 * Rejects the flag `--template` replaced.
 *
 * `allowUnknownOptions` is on so a template's own inputs can be passed as
 * flags, which means commander accepts `--generator` rather than rejecting it
 * — it would be read as an input nothing declares, and the run would go on to
 * prompt for a template or refuse for the wrong reason. Naming the rename is
 * the loud failure a stale script needs.
 */
export const removedGeneratorOptionError = (): Error =>
  new Error(
    "--generator was removed. Pass --template instead: it is the word the configuration, the templates command, and the conformance report already use.",
  );

// 🌱 Add environment schema fields here
export const environmentSchema = z.object({});
