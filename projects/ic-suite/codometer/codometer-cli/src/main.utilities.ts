// 🛠️ Utilities

/**
 * Inserts the default `measure` subcommand when the command line names no
 * registered command.
 *
 * Measuring is what the bare invocation has always meant: `codometer
 * --directory .` is documented and scripted, and predates there being more
 * than one command to choose between. Commander only infers a default among
 * several registered commands when told to, so without this a flag-only
 * command line would print the top-level help instead of measuring. A bare
 * `-h`/`--help` is left alone so it still lists every command.
 */
export function withDefaultCommand(argv: readonly string[]): string[] {
  const commandNames = new Set(["changes", "configuration", "help", "measure"]);
  const helpFlags = new Set(["--help", "-h"]);
  const [firstArgument] = argv;

  if (
    firstArgument !== undefined &&
    (commandNames.has(firstArgument) || helpFlags.has(firstArgument))
  ) {
    return [...argv];
  }

  return ["measure", ...argv];
}
