// ♟️ Constants

/**
 * Builds the opening marker of a named anchor block.
 *
 * codependix's own comment-marker syntax, independent of conformetry's marker
 * mechanism by design — see issue #242. Named anchors let one Markdown file
 * hold more than one block, such as an `nx` block today and an `nestjs` block
 * once `codependix-nestjs-modules` ships, without the blocks colliding.
 */
export const buildStartMarker = (anchorName: string): string =>
  `<!-- codependix:start name="${anchorName}" -->`;

/** Builds the closing marker of a named anchor block. */
export const buildEndMarker = (anchorName: string): string =>
  `<!-- codependix:end name="${anchorName}" -->`;

/**
 * The single heading every project's (and the workspace's) auto-created
 * Codependix section is placed under.
 *
 * Matched literally against a whole line, so a heading a human wrote by hand
 * with this exact text is recognized and reused rather than duplicated — see
 * `AnchorsService.insertAnchorSection`.
 */
export const CODEPENDIX_SECTION_HEADING = "## 🕸️ Codependix";

// 🚨 Errors

/**
 * Raised when a named anchor block is not present in a Markdown file.
 *
 * `AnchorsService.checkAnchor` and `replaceAnchorContent` still raise this for
 * any missing anchor — they are low-level primitives that know nothing about
 * auto-creation. `DeliveryService` is what decides whether this ever reaches a
 * caller: it only lets it surface when the file itself does not exist at all
 * (a project with no `README.md` is a genuinely more serious problem), and
 * intercepts a missing-but-creatable anchor before calling into these
 * primitives — auto-creating the `## 🕸️ Codependix` section on `--write` (see
 * `AnchorsService.insertAnchorSection`) and reporting it as stale on
 * `--check` instead.
 */
export class AnchorNotFoundError extends Error {
  constructor(anchorName: string, filePath: string) {
    super(`Anchor "${anchorName}" not found in ${filePath}`);
    this.name = "AnchorNotFoundError";
  }
}
