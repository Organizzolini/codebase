import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { SYNC_CONVENTIONAL_CONFIG_MARKDOWN_FILES } from "./conventional-config.constants";

// 🎯 Fixtures

const workspaceRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../..",
);

const SCOPES_START_MARKER = "<!-- scopes-start -->";

const MARKER_PAIRS = [
  ["<!-- types-start -->", "<!-- types-end -->"],
  [SCOPES_START_MARKER, "<!-- scopes-end -->"],
] as const;

/**
 * Every markdown file a reader could plausibly put the tables in: the
 * workspace root, and each skill's own `SKILL.md`. Deliberately not a
 * recursive walk of the whole repository — `node_modules` and `coverage`
 * dwarf it, and no other directory has ever carried these markers.
 */
function findMarkerBearingFiles(): string[] {
  const rootMarkdownFiles = fs
    .readdirSync(workspaceRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name);

  const githubDirectory = path.join(workspaceRoot, ".github");
  const githubMarkdownFiles = fs.existsSync(githubDirectory)
    ? fs
        .readdirSync(githubDirectory, { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
        .map((entry) => path.join(".github", entry.name))
    : [];

  const skillsDirectory = path.join(workspaceRoot, ".agents/skills");
  const skillMarkdownFiles = fs
    .readdirSync(skillsDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(".agents/skills", entry.name, "SKILL.md"))
    .filter((file) => fs.existsSync(path.join(workspaceRoot, file)));

  return [
    ...rootMarkdownFiles,
    ...githubMarkdownFiles,
    ...skillMarkdownFiles,
  ].filter((file) =>
    fs
      .readFileSync(path.join(workspaceRoot, file), "utf8")
      .includes(SCOPES_START_MARKER),
  );
}

// 🧪 Tests

describe("sYNC_CONVENTIONAL_CONFIG_MARKDOWN_FILES", () => {
  it.each(SYNC_CONVENTIONAL_CONFIG_MARKDOWN_FILES)(
    "gives the synchronizer somewhere to write in %s",
    (markdownFile) => {
      const contents = fs.readFileSync(
        path.join(workspaceRoot, markdownFile),
        "utf8",
      );

      for (const [startMarker, endMarker] of MARKER_PAIRS) {
        expect(contents).toContain(startMarker);
        expect(contents).toContain(endMarker);
      }
    },
  );

  it("registers exactly the marker-bearing markdown files", () => {
    expect(findMarkerBearingFiles().toSorted()).toStrictEqual(
      SYNC_CONVENTIONAL_CONFIG_MARKDOWN_FILES.toSorted(),
    );
  });

  it("declares every registered file as a task input", () => {
    // A registered file missing from `inputs` lets Nx replay a cached result
    // after that file drifts, so the gate passes green with the drift present.
    const projectConfiguration = JSON.parse(
      fs.readFileSync(
        path.join(workspaceRoot, "projects/synchronization/project.json"),
        "utf8",
      ),
    ) as { targets: Record<string, { inputs: unknown[] }> };

    const declaredInputs = new Set(
      projectConfiguration.targets["conventional-config"]?.inputs.filter(
        (input): input is string => typeof input === "string",
      ),
    );

    const undeclared = SYNC_CONVENTIONAL_CONFIG_MARKDOWN_FILES.filter(
      (file) => !declaredInputs.has(`{workspaceRoot}/${file}`),
    );

    expect(undeclared).toStrictEqual([]);
  });
});
