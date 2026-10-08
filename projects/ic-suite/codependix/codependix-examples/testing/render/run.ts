import { closeConfigurationService } from "./builders";
import { collectDocuments } from "./catalog";
import { deliverDocuments } from "./document";
import { EXAMPLES_DIRECTORY } from "./paths";

import type { ExampleRunMode } from "./types";

// ♟️ Constants

/** Usage message shown when the command line names neither or both modes. */
export const USAGE_MESSAGE =
  "💡 Usage: render-examples --check (or render-examples --write)";

// 🏃 Running

/**
 * Renders every example, writing it or reporting what drifted.
 *
 * Returns the lines to print and the exit code to set, rather than printing and
 * exiting itself, so the whole run is exercised by a test.
 */
export async function run(
  args: string[],
  outputDirectory: string = EXAMPLES_DIRECTORY,
): Promise<{ exitCode: number; lines: string[] }> {
  const mode = selectMode(args);

  if (mode === undefined) return { exitCode: 1, lines: [USAGE_MESSAGE] };

  const documents = await collectDocuments();

  // Every document is rendered by now, so the container the configuration
  // builder booted has nothing left to answer — and a context left open holds
  // the process open with it.
  await closeConfigurationService();

  const outcome = deliverDocuments({ documents, mode, outputDirectory });

  if (outcome.stalePaths.length > 0) {
    return {
      exitCode: 1,
      lines: [
        `🕸️ Found ${outcome.stalePaths.length} stale codependix example(s):`,
        ...outcome.stalePaths.map((stalePath) => `   ${stalePath}`),
        "💡 Run `nx run codependix-examples:examples:write`.",
      ],
    };
  }

  return {
    exitCode: 0,
    lines: [`🕸️ Rendered ${outcome.writtenCount} codependix example files.`],
  };
}

/**
 * Reads exactly one run mode from the command line.
 *
 * Two modes and no default, mirroring `codependix` itself — both because the
 * shape is worth demonstrating and because it is the right shape: silently
 * defaulting to a write nobody asked for would rewrite committed documentation
 * on a check run.
 */
export function selectMode(args: string[]): ExampleRunMode | undefined {
  const check = args.includes("--check");
  const write = args.includes("--write");

  if (check === write) return undefined;

  return check ? "check" : "write";
}
