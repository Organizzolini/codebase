import { rmSync } from "node:fs";
import path from "node:path";

import { MARKDOWN_SECTION_INTRO_LINE } from "@codependix/output";

import { anchorsService } from "./builders";
import { fence } from "./document";
import {
  createScratchProject,
  deliver,
  readReadme,
  SAMPLE_DIAGRAM,
} from "./export-delivery";
import { buildExampleAnchor } from "./paths";

import type { ExampleDocument, ExampleSection } from "./types";

// 🏷️ Types

/** One anchor placed into a file, with or without a subheading above it. */
interface AnchorPlacement {
  readonly anchorName: string;
  readonly subheading: string | undefined;
}

/**
 * One branch of the auto-creation rule, as a section to render.
 *
 * Held as data so the branches read as cases of one rule rather than as
 * hand-written sections: what varies between them is only the file being
 * spliced, whether a subheading is placed above the anchor, and what was
 * already spliced into that file first.
 */
interface AnchorPlacementCase {
  readonly anchorName: string;
  readonly fileContent: string;
  readonly heading: string;
  readonly note: string;
  /**
   * Placements applied to `fileContent` before this one.
   *
   * Non-empty for exactly one case: a second graph type landing under a
   * `## 🕸️ Codependix` section an earlier graph type already created.
   */
  readonly previousPlacements: AnchorPlacement[];
  readonly subheading: string | undefined;
}

// ♟️ Constants

/** Anchor the Nx Neighborhood block in every anchor example carries. */
const NX_ANCHOR = buildExampleAnchor("nx");

/** A second anchor in the same file, proving two named blocks never collide. */
const NESTJS_ANCHOR = buildExampleAnchor("nestjs");

/** Anchor the workspace-level example uses, which carries no subheading. */
const WORKSPACE_ANCHOR = buildExampleAnchor("workspace");

/** Subheading the Nx Neighborhood's anchor is placed under. */
const NX_SUBHEADING = "Nx Neighborhood";

/** Subheading the NestJS module graph's anchor is placed under. */
const NESTJS_SUBHEADING = "NestJS Module Graph";

/** A file that carries no `## 🕸️ Codependix` section at all. */
const PLAIN_README = ["# Atlas Service", "", "An example project.", ""].join(
  "\n",
);

/** A file whose `## 🕸️ Codependix` heading a human wrote by hand. */
const HAND_WRITTEN_SECTION_README = [
  "# Atlas Service",
  "",
  "An example project.",
  "",
  "## 🕸️ Codependix",
  "",
  "A heading a person placed here, with this exact text.",
  "",
  "## License",
  "",
  "MIT.",
  "",
].join("\n");

/** Every branch of the auto-creation rule, in the order the example walks them. */
const AUTO_CREATION_CASES: AnchorPlacementCase[] = [
  {
    anchorName: NX_ANCHOR,
    fileContent: PLAIN_README,
    heading: "A file with no such section",
    note: "The heading, the intro line, the `### <subheading>`, and the anchor block are appended to the end of the file. Nothing above them is touched.",
    previousPlacements: [],
    subheading: NX_SUBHEADING,
  },
  {
    anchorName: NESTJS_ANCHOR,
    fileContent: PLAIN_README,
    heading: "A second graph type, under a section that already exists",
    note: "The heading is not duplicated: the new `### <subheading>` and its anchor go at the end of the existing section. Two named anchors in one file never collide, which is the reason anchors are named at all.",
    previousPlacements: [{ anchorName: NX_ANCHOR, subheading: NX_SUBHEADING }],
    subheading: NESTJS_SUBHEADING,
  },
  {
    anchorName: NX_ANCHOR,
    fileContent: HAND_WRITTEN_SECTION_README,
    heading: "A heading a human wrote by hand",
    note: "`CODEPENDIX_SECTION_HEADING` is matched literally against a whole line, so a heading a person placed with that exact text is reused rather than duplicated — and the `## License` section after it stays where it was.",
    previousPlacements: [],
    subheading: NX_SUBHEADING,
  },
  {
    anchorName: WORKSPACE_ANCHOR,
    fileContent: PLAIN_README,
    heading: "The workspace README, which has no subheading",
    note: "The Workspace Graph's anchor sits directly under the heading: the root README carries no other graph type's section to disambiguate from.",
    previousPlacements: [],
    subheading: undefined,
  },
];

// ⚓ Placement

/** Applies a case's earlier placements, then the placement it demonstrates. */
export function applyCase(placementCase: AnchorPlacementCase): string {
  const seeded = placementCase.previousPlacements.reduce(
    (fileContent, placement) =>
      insert({
        anchorName: placement.anchorName,
        fileContent,
        subheading: placement.subheading,
      }),
    placementCase.fileContent,
  );

  return insert({
    anchorName: placementCase.anchorName,
    fileContent: seeded,
    subheading: placementCase.subheading,
  });
}

/** Builds every anchor-placement example document. */
export function buildAnchorDocuments(): ExampleDocument[] {
  return [buildModesDocument(), buildAutoCreationDocument()];
}

/** Describes a raised value, whether or not it was an `Error`. */
export function describeError(error: unknown): string {
  return error instanceof Error
    ? `${error.name}: ${error.message}`
    : String(error);
}

/** Reports what `--check` says about a `README.md` that carries no anchor. */
export function describeMissingAnchor(): string {
  const project = createScratchProject(PLAIN_README);
  const result = deliver({
    content: SAMPLE_DIAGRAM,
    mode: "check",
    project,
  });

  return `isCurrent: ${String(result.isCurrent)}\nstalePaths: ${result.stalePaths.join(", ")}`;
}

/** Reports what happens when the file a destination names does not exist. */
export function describeMissingReadme(mode: "check" | "write"): string {
  const project = createScratchProject();

  rmSync(path.join(project.absoluteRoot, "README.md"));

  try {
    deliver({ content: SAMPLE_DIAGRAM, mode, project });

    /* v8 ignore next -- a destination with no file always raises */
    return "delivered";
  } catch (error) {
    return redactRoot(describeError(error), project.absoluteRoot);
  }
}

/** Auto-creates one anchor's section in a file that does not carry it. */
export function insert(args: {
  anchorName: string;
  fileContent: string;
  subheading: string | undefined;
}): string {
  return anchorsService.insertAnchorSection({
    anchorName: args.anchorName,
    content: SAMPLE_DIAGRAM,
    fileContent: args.fileContent,
    introLine: MARKDOWN_SECTION_INTRO_LINE,
    subheading: args.subheading,
  });
}

/**
 * Replaces a throwaway directory with a stable placeholder.
 *
 * A committed example carrying the temporary path of whichever machine
 * rendered it would fail `examples --check` everywhere else.
 */
export function redactRoot(message: string, absoluteRoot: string): string {
  return message.replaceAll(absoluteRoot, "<project>");
}

// 📄 Documents

/** Builds the auto-created-section example. */
function buildAutoCreationDocument(): ExampleDocument {
  return {
    id: "auto-created-sections",
    jsonExports: [],
    sections: [...buildAutoCreationSections(), ...buildMissingReadmeSections()],
    summary:
      "A missing anchor used to be an error. It is now auto-created on `--write` — at the end of the file, or at the end of an existing section, and nowhere else.",
    title: "Auto-creating the `## 🕸️ Codependix` section",
  };
}

/** Builds the four branches of the auto-creation rule. */
function buildAutoCreationSections(): ExampleSection[] {
  return AUTO_CREATION_CASES.map((placementCase) => ({
    body: fenceMarkdown(applyCase(placementCase)),
    heading: placementCase.heading,
    note: placementCase.note,
  }));
}

/** Builds the two sections covering a project with no `README.md` at all. */
function buildMissingReadmeSections(): ExampleSection[] {
  return [
    {
      body: fence(describeMissingReadme("write")),
      heading: "A project with no `README.md`, on `--write`",
      note: "Fails outright, in either mode. The file itself not existing is a more serious problem than a missing anchor — there is nothing to splice into and nothing safe to create.",
    },
    {
      body: fence(describeMissingAnchor()),
      heading: "A `README.md` with no anchor, on `--check`",
      note: "Reported as stale rather than raising, consistent with every other kind of drift this tool reports. A project that has never had codependix output simply shows up as needing a write.",
    },
  ];
}

/** Builds the two-Markdown-modes example. */
function buildModesDocument(): ExampleDocument {
  const project = createScratchProject();

  deliver({ content: SAMPLE_DIAGRAM, mode: "write", project });

  return {
    id: "markdown-modes",
    jsonExports: [],
    sections: [
      {
        body: fenceMarkdown(readReadme(project)),
        heading: "Anchored: spliced into a named block in an existing file",
        note: "Naming an `anchor` places the export inside that block in the file at `path`, which defaults to `README.md` — the rest of the document is left exactly as it was.",
      },
      {
        body: fenceMarkdown(`${SAMPLE_DIAGRAM}\n`),
        heading: "Standalone: the whole contents of its own file",
        note: "Leaving `anchor` unset writes the export as the entire file. `path` must then be given explicitly, since there is no default worth guessing for a file codependix is creating outright.",
      },
      {
        body: fence(
          [
            'markdown: { anchor: "codependix-nx-projects" }                       // → README.md',
            'markdown: { anchor: "codependix-nx-projects", path: "docs/graphs.md" } // → docs/graphs.md',
            'markdown: { path: "docs/atlas-service-graph.md" }            // → a standalone file',
            "markdown: {}                                                 // → refused",
          ].join("\n"),
          "ts",
        ),
        heading: "The four shapes a Markdown destination can take",
        note: "The last one names nowhere for the export to go, and is refused by the schema — see [refusals](../refusals).",
      },
    ],
    summary:
      "An anchored splice into a named block inside a file somebody else is authoring, and a standalone file whose entire contents are the export.",
    title: "Both Markdown modes",
  };
}

/**
 * Wraps rendered Markdown in a fence so the document shows it verbatim.
 *
 * Fenced with four backticks rather than three: the content being shown is a
 * spliced export, which contains a fenced mermaid diagram of its own, and a
 * three-backtick fence would close on it.
 */
function fenceMarkdown(content: string): string {
  return `\`\`\`\`markdown\n${content.trimEnd()}\n\`\`\`\``;
}
