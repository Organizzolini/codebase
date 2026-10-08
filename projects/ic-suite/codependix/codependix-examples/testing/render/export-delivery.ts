import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { missingInputError, RUN_MODE_SUBJECT } from "@codependix/configuration";
import { MARKDOWN_SECTION_INTRO_LINE } from "@codependix/output";

import {
  anchorsService,
  deliveryService,
  getConfigurationService,
} from "./builders";
import { fence, fenceJson, table } from "./document";
import { buildJsonExports } from "./graph-levels";
import { buildExampleAnchor } from "./paths";

import type { ExampleDocument, ExampleSection } from "./types";
import type {
  CodependixExportTarget,
  MapCommandOptions,
} from "@codependix/configuration";
import type { CodependixRunMode, ProjectRunResult } from "@codependix/core";

// 🏷️ Types

/**
 * A throwaway project directory one delivery example writes into.
 *
 * Delivery is file I/O, so an example that demonstrates it has to write
 * somewhere. Writing into a temporary directory rather than into `output/`
 * keeps the committed output to what a reader should read, and keeps every
 * `<!-- codependix:start -->` marker this package produces out of any file the
 * real `codebase:codependix:write` could ever claim.
 */
export interface ScratchProject {
  readonly absoluteRoot: string;
  readonly name: string;
}

// ♟️ Constants

/** Prefix the scratch directories every delivery example writes into carry. */
const SCRATCH_PREFIX = "codependix-examples-";

/** The graph every export-target example delivers, so only the target varies. */
export const SAMPLE_DIAGRAM = [
  "```mermaid",
  "graph LR",
  '  atlas_core["atlas-core"]',
  '  atlas_service["atlas-service"]',
  "  atlas_service --> atlas_core",
  "```",
].join("\n");

/** Anchor the export-target and Markdown-mode examples splice into. */
export const SAMPLE_ANCHOR = buildExampleAnchor("nx");

/** Relative path the JSON destination of every target example names. */
const SAMPLE_JSON_PATH = "codependix-nx-graph.json";

/** The four export targets, in the order the example walks them. */
const EXPORT_TARGETS = ["none", "json", "markdown", "both"] as const;

// 💾 Delivery

/** Builds every delivery example document. */
export async function buildDeliveryDocuments(): Promise<ExampleDocument[]> {
  return [
    buildTargetsDocument(),
    await buildModesDocument(),
    await buildJsonDocument(),
  ];
}

/** Builds one section per export target. */
export function buildTargetSections(): ExampleSection[] {
  return EXPORT_TARGETS.map((target) => {
    const changed = deliverAtTarget(target);

    return {
      body: fence(
        changed.length === 0 ? "(nothing written)" : changed.join("\n"),
      ),
      heading: `\`target: "${target}"\``,
      note: `Files created or changed, against a scratch project that already held a \`README.md\` carrying the \`${SAMPLE_ANCHOR}\` anchor.`,
    };
  });
}

/** Creates a throwaway project directory holding a seeded `README.md`. */
export function createScratchProject(seed?: string): ScratchProject {
  const absoluteRoot = mkdtempSync(path.join(tmpdir(), SCRATCH_PREFIX));

  writeFileSync(
    path.join(absoluteRoot, "README.md"),
    seed ?? seedReadme(),
    "utf8",
  );

  return { absoluteRoot, name: "atlas-service" };
}

/** Delivers one Markdown export into a scratch project. */
export function deliver(args: {
  content: string;
  mode: CodependixRunMode;
  project: ScratchProject;
}): ProjectRunResult {
  return deliveryService.deliverGraphOutput({
    jsonContent: undefined,
    markdownContent: args.content,
    markdownSection: {
      introLine: MARKDOWN_SECTION_INTRO_LINE,
      subheading: "Nx Neighborhood",
    },
    mode: args.mode,
    project: args.project,
    resolvedOutput: {
      json: undefined,
      markdown: { anchor: SAMPLE_ANCHOR, path: "README.md" },
      target: "markdown",
    },
  });
}

/** Delivers with a JSON destination configured and a Markdown-only target. */
export function deliverUnwrittenJson(): string[] {
  const project = createScratchProject();
  const before = snapshot(project);

  deliveryService.deliverGraphOutput({
    jsonContent: deliveryService.renderJson({ unwritten: true }),
    markdownContent: SAMPLE_DIAGRAM,
    markdownSection: {
      introLine: MARKDOWN_SECTION_INTRO_LINE,
      subheading: "Nx Neighborhood",
    },
    mode: "write",
    project,
    resolvedOutput: {
      json: { path: SAMPLE_JSON_PATH },
      markdown: { anchor: SAMPLE_ANCHOR, path: "README.md" },
      target: "markdown",
    },
  });

  return listChangedPaths(project, before);
}

/** Reads a scratch project's `README.md` back. */
export function readReadme(project: ScratchProject): string {
  return readFileSync(path.join(project.absoluteRoot, "README.md"), "utf8");
}

/** Builds the `README.md` every scratch project starts from. */
export function seedReadme(): string {
  return [
    "# Atlas Service",
    "",
    "An example project.",
    "",
    "## 🕸️ Codependix",
    "",
    MARKDOWN_SECTION_INTRO_LINE,
    "",
    "### Nx Neighborhood",
    "",
    anchorsService.wrapInAnchors(SAMPLE_ANCHOR, "_Not yet exported._"),
    "",
  ].join("\n");
}

/** Builds the JSON-export example. */
async function buildJsonDocument(): Promise<ExampleDocument> {
  return {
    id: "json-exports",
    jsonExports: await buildJsonExports(),
    sections: [
      {
        body: table(
          ["Graph", "Committed as"],
          [
            [
              "Nx Neighborhood",
              "[`codependix-neighborhood-graph.json`](codependix-neighborhood-graph.json)",
            ],
            [
              "Nx Workspace Graph",
              "[`codependix-workspace-graph.json`](codependix-workspace-graph.json)",
            ],
            [
              "NestJS module graph",
              "[`codependix-module-graph.json`](codependix-module-graph.json)",
            ],
            [
              "TypeScript file imports",
              "[`codependix-imports-graph.json`](codependix-imports-graph.json)",
            ],
            [
              "Python file imports",
              "[`codependix-python-imports-graph.json`](codependix-python-imports-graph.json)",
            ],
          ],
        ),
        heading: "Every graph type's JSON shape, committed",
        note: "Each one is rendered by `DeliveryService.renderJson`, so it is byte-identical to what a real `codependix map --write` would produce — two-space indentation and a trailing newline.",
      },
      {
        body: "Two workspace-level rules are switched off for `**/codependix-*graph.json`, for the same reason. `configuration/eslint.config.ts` turns `jsonc/sort-array-values` **off**: these arrays come out of the Nx project graph, a NestJS container, or a `ts.Program`, in whichever order each source discovers its projects, modules, or files — not alphabetical order. And `configuration/.oxfmtignore` and `.prettierignore` exclude the files outright: codependix renders them with `JSON.stringify(…, 2)`, which puts one array element per line, while oxfmt collapses a short array onto one. Either rule left on would rewrite what codependix had just written, and the very next `--check` would fail against the tool itself. It is the same reformatting-versus-drift conflict `.oxfmtignore` already resolves for `.conformetry/**`.",
        heading: "Why two workspace rules are switched off for these files",
        note: "The five files beside this guide are named to match that glob, so both carve-outs cover them too rather than being described from a distance — which is how the second one was found in the first place.",
      },
    ],
    summary:
      "The JSON shape of every graph type, committed beside this guide so a reader sees it without running anything — and why two workspace-wide rules are switched off for exactly these files.",
    title: "The JSON exports",
  };
}

/** Builds the `--check` versus `--write` example. */
async function buildModesDocument(): Promise<ExampleDocument> {
  return {
    id: "check-and-write",
    jsonExports: [],
    sections: [
      {
        body: fenceJson(deliverTwice()),
        heading: "A current export, and the same export after it drifts",
        note: "The first result is what `--check` reports for an export nothing has moved. The second names the exact paths that went stale, which is what a reader is given to act on.",
      },
      {
        body: fence(missingInputError(RUN_MODE_SUBJECT).message),
        heading: "A command line naming no mode at all",
        note: "At a terminal, a command line naming neither `--check` nor `--write` is asked which was meant, as a three-item menu — `boundaries`, `reports`, `write`. Where stdin is not a terminal the run fails with this instead: `prompts` would otherwise draw a menu nobody can answer, never resolve, and let the process exit 0 having done nothing.",
      },
      {
        body: await refuse({ check: true }),
        heading: "A `--check` carrying no value",
        note: '`--check` names which finding fails the run, so a bare one is a mistake rather than a shorthand. Read as "gate nothing" it would be a gate that cannot fail — `--check "$GATES"` with the variable unset would pass forever over a workspace whose every rule was broken, which is worse than no gate at all because it looks like protection. A value of only separators is refused the same way.',
      },
      {
        body: await refuse({ check: "limits,depth" }),
        heading: "A `--check` naming something it does not know",
        note: "Every mistake on one command line is collected before any of them is reported, so two typos are two lines to fix rather than two runs. `limits` is codometer\u2019s word and `depth` is callidescope\u2019s; `reports` is deliberately the same word in all three, because a configured destination going stale is one finding rather than three.",
      },
      {
        body: await refuse({ check: "reports", write: true }),
        heading: "`--write` together with `--check reports`",
        note: "Refused, because an export cannot be stale in the run that just wrote it. `--write --check boundaries` is legal for the mirror-image reason: a boundary has no destination to be stale, so writing every export and judging every graph in one run is two independent things rather than a contradiction.",
      },
      {
        body: "`GraphRunService.run` attempts every project regardless of whether an earlier one failed, collecting each failure as a `ProjectRunFailure` rather than aborting the loop. `MapCommand.reportOutcome` then reports the failures and the stale exports together, and fails the run if either list is non-empty. That is the whole of the guarantee: `--write` either fully succeeds, or names exactly which projects failed while still completing every other one.",
        heading: "One project failing names itself and stops nothing",
        note: "[container-rooting](../container-rooting) shows the same guarantee acting on three real containers, one of which refuses to load.",
      },
    ],
    summary:
      "What each `--check` name gates, what `--write` acts on, the command line codependix asks about, and the four it refuses outright.",
    title: "`--check` versus `--write`",
  };
}

/** Builds the export-target example. */
function buildTargetsDocument(): ExampleDocument {
  return {
    id: "export-targets",
    jsonExports: [],
    sections: [
      ...buildTargetSections(),
      {
        body: fence(deliverUnwrittenJson().join("\n")),
        heading: "A configured destination the target leaves unwritten",
        note: "The `json` destination is configured and the target is `markdown`, so nothing is written to it. This is why `both` is a named target rather than something inferred from which destinations are present: a project can keep a destination in place without writing it yet.",
      },
    ],
    summary:
      "The same graph delivered at each of the four export targets, and the property that explains why `both` is named rather than inferred.",
    title: "All four export targets",
  };
}

// 📄 Documents

/** Delivers the sample graph at one target and lists what changed. */
function deliverAtTarget(target: CodependixExportTarget): string[] {
  const project = createScratchProject();
  const before = snapshot(project);

  deliveryService.deliverGraphOutput({
    jsonContent: deliveryService.renderJson({ target }),
    markdownContent: SAMPLE_DIAGRAM,
    markdownSection: {
      introLine: MARKDOWN_SECTION_INTRO_LINE,
      subheading: "Nx Neighborhood",
    },
    mode: "write",
    project,
    resolvedOutput: {
      json: { path: SAMPLE_JSON_PATH },
      markdown: { anchor: SAMPLE_ANCHOR, path: "README.md" },
      target,
    },
  });

  return listChangedPaths(project, before);
}

/** Delivers the sample graph, then checks it twice — current, then drifted. */
function deliverTwice(): ProjectRunResult[] {
  const project = createScratchProject();

  deliver({ content: SAMPLE_DIAGRAM, mode: "write", project });

  return [
    deliver({ content: SAMPLE_DIAGRAM, mode: "check", project }),
    deliver({
      content: SAMPLE_DIAGRAM.replace("atlas_core", "atlas_kernel"),
      mode: "check",
      project,
    }),
  ];
}

/**
 * Lists the files a delivery created or changed, project-relative.
 *
 * Compared against a snapshot taken before the delivery rather than simply
 * listed: every scratch project is seeded with a `README.md` already carrying
 * the anchor, so a bare listing would report that file for a `none` target
 * that wrote nothing at all.
 */
function listChangedPaths(
  project: ScratchProject,
  before: Map<string, string>,
): string[] {
  return [...snapshot(project)]
    .filter(([relativePath, content]) => before.get(relativePath) !== content)
    .map(([relativePath]) => relativePath)
    .toSorted((first, second) => first.localeCompare(second));
}

/** Runs the real run plan and renders whatever it refused the command line with. */
async function refuse(options: MapCommandOptions): Promise<string> {
  const configurationService = await getConfigurationService();
  const { errors } = await configurationService.selectMode(options);

  return fence(errors.join("\n"));
}

/** Records every file a scratch project holds, keyed by relative path. */
function snapshot(project: ScratchProject): Map<string, string> {
  const entries = readdirSync(project.absoluteRoot, { recursive: true })
    .map(String)
    .filter((entry) => path.extname(entry).length > 0);

  return new Map(
    entries.map((relativePath) => [
      relativePath,
      readFileSync(path.join(project.absoluteRoot, relativePath), "utf8"),
    ]),
  );
}
