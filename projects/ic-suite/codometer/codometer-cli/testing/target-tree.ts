import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/** Words the generated source cycles through to keep its symbols distinct. */
const SOURCE_WORDS = [
  "alpha",
  "beta",
  "gamma",
  "delta",
  "epsilon",
  "zeta",
  "eta",
  "theta",
] as const;

/**
 * Builds source whose compressed size depends on the deflate level.
 *
 * Deliberately varied rather than repetitive: a file that compresses to almost
 * nothing does so at every level, and would pin the algorithm without pinning
 * the level. This one is 782 gzip bytes at level 9 and 881 at zlib's default,
 * so a level left unstated cannot pass the assertions that read it.
 */
function createGeneratedSource(functionCount: number): string {
  const lines: string[] = [];

  for (let index = 0; index < functionCount; index++) {
    const word = SOURCE_WORDS[(index * 7) % SOURCE_WORDS.length] ?? "alpha";
    lines.push(
      `export function ${word}${index}(value) { return value * ${(index * 13) % 97}; }`,
    );
  }

  return `${lines.join("\n")}\n`;
}

/**
 * Contents of the target fixture tree, keyed by path relative to its root.
 *
 * A build directory rather than a source tree, because that is what a target
 * exists to name: every ignore file in every repository claims it, so nothing
 * but an outright glob can measure it.
 */
export const TARGET_FIXTURE_FILES: Readonly<Record<string, string>> = {
  ".hidden/secret.js": "export const secret = 1;\n",
  "dist/index.js": createGeneratedSource(128),
  "dist/nested/deep.js": "export const deep = 1;\n",
  "dist/nested/deep.min.js": "export const deep=1;\n",
  "dist/notes.md": "# Built\n",
  "dist/vendor/bundled.js": "export const bundled = 1;\n",
  "other/index.js": "export const other = 1;\n",
};

/**
 * Writes the target fixture tree to a fresh temporary directory.
 *
 * `dist/link.js` points at a file and `dist/loop` points at its own ancestor —
 * the first is followed the way every glob library follows links, the second
 * is what makes following directories forever a bad idea. `dist/broken.js`
 * points at nothing at all, which a build directory left half-cleaned holds.
 *
 * Every caller owes the tree a `removeTargetTree`.
 */
export function createTargetTree(): string {
  const root = mkdtempSync(path.join(tmpdir(), "codometer-target-"));

  for (const [relativePath, contents] of Object.entries(TARGET_FIXTURE_FILES)) {
    const absolutePath = path.join(root, relativePath);
    mkdirSync(path.dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, contents);
  }

  symlinkSync(
    path.join(root, "dist/nested/deep.js"),
    path.join(root, "dist/link.js"),
  );
  symlinkSync(path.join(root, "dist"), path.join(root, "dist/loop"));
  symlinkSync(
    path.join(root, "dist/missing.js"),
    path.join(root, "dist/broken.js"),
  );

  return root;
}

/** Removes a target fixture tree, whether or not the suite that made it passed. */
export function removeTargetTree(root: string): void {
  rmSync(root, { force: true, recursive: true });
}
