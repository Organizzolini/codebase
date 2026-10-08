import { deliveryService } from "./builders";
import * as nestjsGraphs from "./nestjs-graphs";
import {
  ATLAS_CHAIN,
  buildNeighborhood,
  buildWorkspaceGraph,
  renderNeighborhood,
  renderWorkspaceGraph,
  SUBJECT_PROJECT_NAME,
} from "./nx-graphs";
import { resolveExample } from "./paths";
import * as pythonImports from "./python-imports";
import * as typescriptImports from "./typescript-imports";

import type { ExampleDocument, ExampleJsonExport } from "./types";

// ♟️ Constants

/** Path segment the shared example workspace sits under, inside `examples/`. */
const ATLAS_SEGMENT = "graph-levels";

/** The example workspace directory inside it. */
const ATLAS_WORKSPACE = "atlas";

/** The project every one of the four graph levels is built from. */
const ATLAS_SERVICE_ROOT = "packages/atlas-service";

/** Subdirectory of that project holding its Python package. */
const ATLAS_PYTHON_ROOT = "packages/atlas-service/python";

/** File names the committed JSON exports are written under. */
const JSON_FILE_NAMES = {
  imports: "codependix-imports-graph.json",
  module: "codependix-module-graph.json",
  neighborhood: "codependix-neighborhood-graph.json",
  pythonImports: "codependix-python-imports-graph.json",
  workspace: "codependix-workspace-graph.json",
} as const;

// 🕸️ Graphs

/** Builds the example that puts all four graph levels side by side. */
export async function buildGraphLevelDocuments(): Promise<ExampleDocument[]> {
  return [
    {
      id: "graph-levels",
      jsonExports: [],
      sections: [
        {
          body: renderNeighborhood(ATLAS_CHAIN, SUBJECT_PROJECT_NAME),
          heading: "Nx Neighborhood",
          note: "Which workspace projects `atlas-service` sits between. It says nothing about what is inside the project.",
        },
        {
          body: renderWorkspaceGraph(ATLAS_CHAIN),
          heading: "Nx Workspace Graph",
          note: "The same edges, drawn once for the whole repository rather than once per project, with no project highlighted.",
        },
        {
          body: await nestjsGraphs.renderGraphAt(resolveServiceRoot()),
          heading: "NestJS module graph",
          note: "How the project's own NestJS container is wired. Only modules are nodes — `CatalogService` is a provider and never appears.",
        },
        {
          body: typescriptImports.renderGraphAt(resolveServiceRoot()),
          heading: "TypeScript file imports",
          note: "Which of the project's own TypeScript files import which. `settings.ts` is invisible to the module graph above and central here.",
        },
        {
          body: pythonImports.renderGraphAt(resolvePythonRoot()),
          heading: "Python file imports",
          note: "The same question asked of the project's Python package, answered by a statement scanner rather than by a compiler.",
        },
      ],
      summary:
        "One example project, `atlas-service`, graphed at all four levels codependix builds — so a reader sees what each level does and does not say about the same code.",
      title: "The four graph levels, side by side",
    },
  ];
}

/** Builds the JSON export of each of the five graphs, as a run would write it. */
export async function buildJsonExports(): Promise<ExampleJsonExport[]> {
  return [
    {
      content: renderJson(buildNeighborhood(ATLAS_CHAIN, SUBJECT_PROJECT_NAME)),
      fileName: JSON_FILE_NAMES.neighborhood,
    },
    {
      content: renderJson(buildWorkspaceGraph(ATLAS_CHAIN)),
      fileName: JSON_FILE_NAMES.workspace,
    },
    {
      content: renderJson(
        await nestjsGraphs.buildGraphAt(resolveServiceRoot()),
      ),
      fileName: JSON_FILE_NAMES.module,
    },
    {
      content: renderJson(typescriptImports.buildGraphAt(resolveServiceRoot())),
      fileName: JSON_FILE_NAMES.imports,
    },
    {
      content: renderJson(pythonImports.buildGraphAt(resolvePythonRoot())),
      fileName: JSON_FILE_NAMES.pythonImports,
    },
  ];
}

/** Renders a value the way `codependix map --write` renders every JSON export. */
function renderJson(value: unknown): string {
  return deliveryService.renderJson(value);
}

/** Resolves the shared example project's Python package root. */
function resolvePythonRoot(): string {
  return resolveExample(ATLAS_SEGMENT, ATLAS_WORKSPACE, ATLAS_PYTHON_ROOT);
}

// 📄 Documents

/** Resolves the shared example project's root on disk. */
function resolveServiceRoot(): string {
  return resolveExample(ATLAS_SEGMENT, ATLAS_WORKSPACE, ATLAS_SERVICE_ROOT);
}
