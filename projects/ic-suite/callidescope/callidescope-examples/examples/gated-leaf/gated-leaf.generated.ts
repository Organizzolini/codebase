/**
 * Output a generator writes into this project, which the project keeps out of
 * its own trace.
 *
 * The `callidescope.config.ts` beside this file excludes `*.generated.ts`, and
 * that glob is read relative to this project's own root: three files are
 * written here and the committed report counts two, which is the proof.
 * `README.md` works through it in full.
 */
export function listGatedLeafKeys(): string[] {
  return ["one", "two"];
}
