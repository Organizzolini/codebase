import { pathQueryService } from "./builders";
import { fence } from "./document";
import { ATLAS_CHAIN, buildProjectGraph, readProjects } from "./nx-graphs";

import type { ExampleDocument, ExampleSection } from "./types";
import type { GraphRunContext } from "@codependix/boundaries";

// ♟️ Constants

/** Builds the path-queries example document. */
export async function buildPathQueriesDocuments(): Promise<ExampleDocument[]> {
  return [
    {
      id: "path-queries",
      jsonExports: [],
      sections: [
        await buildFoundPathSection(),
        await buildNoPathSection(),
        await buildJsonFormatSection(),
        await buildMermaidFormatSection(),
      ],
      summary:
        "How `codependix path <from> <to>` finds connecting paths between nodes across graph levels and formats the result as Markdown, JSON, or Mermaid.",
      title: "Finding paths between nodes",
    },
  ];
}

// 🛤️ Sections

/** Section showing a found connecting path between two Nx projects in Markdown format. */
async function buildFoundPathSection(): Promise<ExampleSection> {
  const context = buildNxContext();
  const results = await pathQueryService.query({
    context,
    from: "atlas-application",
    to: "atlas-core",
  });
  const output = pathQueryService.render({
    format: "markdown",
    results,
  });

  return {
    body: output,
    heading: "Nx projects: connecting path found",
    note: "How codependix path traces the shortest route between two Nx projects in the dependency graph.",
  };
}

/** Section showing the JSON output format. */
async function buildJsonFormatSection(): Promise<ExampleSection> {
  const context = buildNxContext();
  const results = await pathQueryService.query({
    context,
    from: "atlas-application",
    to: "atlas-core",
  });
  const output = pathQueryService.render({
    format: "json",
    results,
  });

  return {
    body: fence(output, "json"),
    heading: "Structured JSON format",
    note: "With `--format json`, the shortest path is rendered as machine-readable JSON for tooling and CI checks.",
  };
}

/** Section showing the Mermaid diagram output format. */
async function buildMermaidFormatSection(): Promise<ExampleSection> {
  const context = buildNxContext();
  const results = await pathQueryService.query({
    context,
    from: "atlas-application",
    to: "atlas-core",
  });
  const output = pathQueryService.render({
    format: "mermaid",
    results,
  });

  return {
    body: output,
    heading: "Mermaid diagram format",
    note: "With `--format mermaid`, the path is rendered as a directed flowchart diagram for documentation.",
  };
}

/** Section showing behavior when no connecting path exists between two nodes. */
async function buildNoPathSection(): Promise<ExampleSection> {
  const context = buildNxContext();
  const results = await pathQueryService.query({
    context,
    from: "atlas-core",
    to: "atlas-application",
  });
  const output = pathQueryService.render({
    format: "markdown",
    results,
  });

  return {
    body: output,
    heading: "Nx projects: no connecting path",
    note: "When no path connects the two nodes, codependix exits cleanly with code 0 and reports plainly that no path connects them.",
  };
}

// 📄 Documents

/** Builds a run context for Nx projects graph queries over the atlas chain. */
function buildNxContext(): GraphRunContext {
  const projects = readProjects(ATLAS_CHAIN);

  return {
    configuration: {
      boundaries: {
        fileImports: { python: [], typescript: [] },
        nestjsModules: [],
        nxProjects: [],
      },
      exclude: [],
      include: ["**"],
      projectGraph: undefined,
      selection: { projects: [], tags: [] },
      workspace: {},
    },
    enabledGraphTypes: new Set(["nxProjects"]),
    graph: buildProjectGraph(ATLAS_CHAIN),
    mode: "check",
    projectConfigurations: new Map(),
    projects,
    selectedProjects: projects,
    workingDirectory: "/atlas",
  };
}
