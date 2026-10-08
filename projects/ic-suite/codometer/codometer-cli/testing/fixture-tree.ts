import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/**
 * Contents of the fixture tree, keyed by path relative to its root.
 *
 * Written to a real directory rather than mocked, because the behavior under
 * test is exactly what the filesystem reports: which entries a directory
 * holds, which of them are symlinks, and which ignore files sit beside them.
 */
const FIXTURE_FILES: Readonly<Record<string, string>> = {
  // `README.md` is not named here on purpose. Codometer splices into it, so
  // it excludes it from what it measures without being told.
  ".codometerignore": ["vendor/", ""].join("\n"),
  ".gitignore": ["build/", "*.log", "nested/generated/", ""].join("\n"),
  "AGENTS.md": "# Agents\n",
  "build/output.js": "export const built = 1;\n",
  "debug.log": "noise\n",
  "nested/.gitignore": ["*.md", "!keep.md", ""].join("\n"),
  "nested/deep/deeper.ts": "export const deeper = 1;\n",
  "nested/drop.md": "# Drop\n",
  "nested/generated/thing.ts": "export const generated = 1;\n",
  "nested/keep.md": "# Keep\n",
  "node_modules/library/index.ts": "export const library = 1;\n",
  "README.md":
    "# Readme\n\n<!-- codometer:start -->\n\nold\n<!-- codometer:end -->\n",
  "redistribute/index.ts": "export const redistributed = 1;\n",
  "src/app.ts": "export const app = 1;\n",
  "src/app.unit.test.ts": "export const appTest = 1;\n",
  "src/data.json": '{ "name": "fixture" }\n',
  "src/main.tf": 'variable "name" {}\n',
  "src/notebook.ipynb": '{ "cells": [], "nbformat": 4, "nbformat_minor": 5 }\n',
  "src/query.sql": "select 1;\n",
  "src/script.sh": "echo hello\n",
  "src/settings.toml": 'name = "fixture"\n',
  "src/styles.css": ".a { color: red; }\n",
  "src/utility.js": "export const utility = 1;\n",
  "src/values.yaml": "name: fixture\n",
  "vendor/vendored.ts": "export const vendored = 1;\n",
};

/**
 * Writes the fixture tree to a fresh temporary directory and returns its root.
 *
 * `CLAUDE.md` is a symlink to `AGENTS.md`, the shape the repository's own tree
 * has and the one that used to be counted twice.
 *
 * Every caller owes the tree a `removeFixtureTree` — a suite that forgets
 * leaves its trees behind in the system temporary directory for good.
 *
 * `parentDirectory` defaults to the system temporary directory; a caller that
 * spawns a real process pointed at the tree — which measures wherever its own
 * working directory is, with no flag to say otherwise — may need the tree
 * somewhere the spawned process's own module resolution already reaches, and
 * names that directory here instead.
 */
export function createFixtureTree(parentDirectory: string = tmpdir()): string {
  const root = mkdtempSync(path.join(parentDirectory, "codometer-fixture-"));

  for (const [relativePath, contents] of Object.entries(FIXTURE_FILES)) {
    const absolutePath = path.join(root, relativePath);
    mkdirSync(path.dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, contents);
  }

  symlinkSync(path.join(root, "AGENTS.md"), path.join(root, "CLAUDE.md"));

  return root;
}

/** Removes a fixture tree, whether or not the suite that made it succeeded. */
export function removeFixtureTree(root: string): void {
  rmSync(root, { force: true, recursive: true });
}
