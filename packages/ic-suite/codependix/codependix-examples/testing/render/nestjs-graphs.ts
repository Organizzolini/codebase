import path from "node:path";

import { moduleGraphService, nestjsProjectService } from "./builders";
import { fence } from "./document";
import { resolveExample } from "./paths";

import type { ExampleDocument, ExampleSection } from "./types";
import type {
  NestjsModuleGraph,
  NestjsProject,
} from "@codependix/nestjs-modules";

// 🏷️ Types

/**
 * One example project's exploration outcome.
 *
 * Modelled on `codependix-cli`'s split between `ProjectRunResult` and
 * `ProjectRunFailure`: a project either produced a graph or never got that
 * far, and the two must not be representable at once — which is what lets a
 * run report exactly which projects failed while completing every other one.
 */
type Exploration =
  | {
      readonly error: string;
      readonly name: string;
      readonly outcome: "failed";
    }
  | {
      readonly moduleCount: number;
      readonly name: string;
      readonly outcome: "explored";
    };

// ♟️ Constants

/** Container holding four modules, one of them `@Global()`. */
const GLOBAL_CONTAINER = ["ambient-modules", "global-container"];

/** Container holding three modules — below the ambient minimum. */
const SMALL_CONTAINER = ["ambient-modules", "small-container"];

/** Container with a plain module every other module imports. */
const BOUNDARY_CONTAINER = ["ambient-modules", "boundary-container"];

/** A source directory that defines no modules at all. */
const EMPTY_CONTAINER = ["ambient-modules", "empty-container"];

/** Container whose options factory refuses to run if it is ever called. */
const PREVIEW_CONTAINER = ["preview-mode", "container"];

/** Project that bootstraps a real `src/main.module.ts`. */
const ROOTED_APPLICATION = ["container-rooting", "rooted-application"];

/** Package that bootstraps nothing, rooted in a synthetic module. */
const LIBRARY_PACKAGE = ["container-rooting", "library-package"];

/** Container whose module file throws the moment it is loaded. */
const FAILING_CONTAINER = ["container-rooting", "failing-container"];

// 🕸️ Graphs

/**
 * Module graphs already built, keyed by the project root they came from.
 *
 * Exploring a container boots it, and the same containers are asked for
 * repeatedly. Nothing under `examples/` changes while the process runs, so the
 * second request is answered from here. Only a successful exploration is
 * cached: a container that refuses to load raises every time it is asked for,
 * which is what the container-rooting example shows.
 */
const graphsByRoot = new Map<string, Promise<NestjsModuleGraph>>();

/** Builds one example container's module graph. */
export async function buildContainerGraph(
  segments: string[],
): Promise<NestjsModuleGraph> {
  return buildGraphAt(resolveExample(...segments));
}

/** Builds one project's module graph, given its root on disk. */
export async function buildGraphAt(
  absoluteRoot: string,
): Promise<NestjsModuleGraph> {
  const cached = graphsByRoot.get(absoluteRoot);

  if (cached !== undefined) return cached;

  const promise = (async () => {
    const project = describeProjectAt(absoluteRoot);
    const tree = await nestjsProjectService.exploreProject(project);

    return moduleGraphService.buildGraph(tree, project.name);
  })();

  graphsByRoot.set(absoluteRoot, promise);

  try {
    return await promise;
  } catch (error) {
    graphsByRoot.delete(absoluteRoot);
    throw error;
  }
}

/** Builds every NestJS module-graph example document. */
export async function buildNestjsDocuments(): Promise<ExampleDocument[]> {
  return [
    await buildAmbientDocument(),
    await buildPreviewDocument(),
    await buildRootingDocument(),
  ];
}

/** Describes a raised value, whether or not it was an `Error`. */
export function describeError(error: unknown): string {
  return error instanceof Error
    ? `${error.name}: ${error.message}`
    : String(error);
}

/**
 * Describes a project the way discovery would have described it.
 *
 * `NestjsProjectService.discoverProjects` filters an Nx project graph by the
 * `framework:nestjs` tag, and an example project is not an Nx project — so the
 * descriptor discovery would have produced is built directly instead.
 */
export function describeProjectAt(absoluteRoot: string): NestjsProject {
  return nestjsProjectService.describeProject(
    absoluteRoot,
    path.basename(absoluteRoot),
  );
}

/** Explores several containers, isolating each one's failure from the rest. */
export async function exploreAll(
  containers: string[][],
): Promise<Exploration[]> {
  const explorations: Exploration[] = [];

  for (const segments of containers) {
    const name = path.basename(resolveExample(...segments));

    try {
      const graph = await buildContainerGraph(segments);

      explorations.push({
        moduleCount: graph.nodes.length,
        name,
        outcome: "explored",
      });
    } catch (error) {
      explorations.push({
        error: describeError(error),
        name,
        outcome: "failed",
      });
    }
  }

  return explorations;
}

/** Renders one example container's module graph as a mermaid diagram. */
export async function renderContainer(segments: string[]): Promise<string> {
  return moduleGraphService.renderMermaid(await buildContainerGraph(segments));
}

/** Renders one project's module graph, given its root on disk. */
export async function renderGraphAt(absoluteRoot: string): Promise<string> {
  return moduleGraphService.renderMermaid(await buildGraphAt(absoluteRoot));
}

// 📄 Documents

/** Builds the ambient-module heuristic example. */
async function buildAmbientDocument(): Promise<ExampleDocument> {
  return {
    id: "ambient-modules",
    jsonExports: [],
    sections: await buildAmbientSections(),
    summary:
      "`NestjsProjectService.exploreProject` reports the container's view rather than the decorators', so a `@Global()` module arrives as an import of every other module. Drawn literally it would bury the structure worth reading, so its edges are left out and it is drawn as a rounded node.",
    title: "The ambient-module heuristic",
  };
}

/** Builds the four sections of the ambient-module example. */
async function buildAmbientSections(): Promise<ExampleSection[]> {
  return [
    {
      body: await renderContainer(GLOBAL_CONTAINER),
      heading: "A container with a global module",
      note: "`SettingsModule` is `@Global()`, so NestJS registers it into all three other modules. Four modules meets `MODULE_GRAPH_AMBIENT_MINIMUM_MODULES`, so it is drawn as a rounded node with its edges left out, and `MODULE_GRAPH_AMBIENT_LEGEND` is appended.",
    },
    {
      body: await renderContainer(SMALL_CONTAINER),
      heading: "The same global module in a three-module container",
      note: "`MODULE_GRAPH_AMBIENT_MINIMUM_MODULES` is 4, and this container has three modules — below that, a module imported by everything else is just a small graph, so the edges are drawn.",
    },
    {
      body: await renderContainer(BOUNDARY_CONTAINER),
      heading: "A plain module imported by every other module",
      note: "`SettingsModule` here carries no `@Global()` decorator at all. The rule counts inbound edges rather than reading decorators, so four inbound edges in a five-module container reaches the same threshold — the heuristic at its boundary.",
    },
    {
      body: await renderContainer(EMPTY_CONTAINER),
      heading: "A project defining no modules",
      note: "`MODULE_GRAPH_UNCONNECTED` is rendered in place of a diagram.",
    },
  ];
}

/** Builds the preview-mode example. */
async function buildPreviewDocument(): Promise<ExampleDocument> {
  return {
    id: "preview-mode",
    jsonExports: [],
    sections: [
      {
        body: await renderContainer(PREVIEW_CONTAINER),
        heading:
          "A container whose options factory would reach outside the process",
        note: "`CatalogModule` imports `ConnectionModule.forRootAsync({ useFactory })`, and that factory throws if it is ever called. This diagram exists, so it never was.",
      },
      {
        body: "`NestjsProjectService.exploreProject` calls `NestFactory.createApplicationContext(rootModule, { abortOnError: false, logger: false, preview: true })`. Preview mode registers every module and provider and instantiates none of them, so a `TypeOrmModule.forRootAsync` options factory never has a database contacted — from a workstation or from a CI runner alike.",
        heading: "Why the factory never ran",
        note: "This is the question anyone deciding whether to point codependix at their own application is actually asking.",
      },
    ],
    summary:
      "Preview mode is what makes exploring an unfamiliar container safe: a module whose options factory would contact something is graphed without that factory ever running.",
    title: "Preview mode, and why exploration is safe",
  };
}

/** Builds the container-rooting example. */
async function buildRootingDocument(): Promise<ExampleDocument> {
  const explorations = await exploreAll([
    ROOTED_APPLICATION,
    LIBRARY_PACKAGE,
    FAILING_CONTAINER,
  ]);

  return {
    id: "container-rooting",
    jsonExports: [],
    sections: [
      {
        body: await renderContainer(ROOTED_APPLICATION),
        heading: "A project that bootstraps a root module",
        note: "`src/main.module.ts` exists, so its `MainModule` export is the root and the container is explored outward from it. `OrphanModule` is defined in the same directory and never imported, so it is absent.",
      },
      {
        body: await renderContainer(LIBRARY_PACKAGE),
        heading: "A package that bootstraps nothing",
        note: "No `src/main.module.ts`, so every `*.module.ts` under `src/` is loaded and rooted under a synthetic module. That synthetic root, and the global `ConfigModule` it supplies so a module reading configuration in a `useFactory` can be scanned at all, are both kept out of the graph.",
      },
      {
        body: renderExplorations(explorations),
        heading: "One project failing stops no other",
        note: "`failing-container` throws the moment its module file is imported. It is collected as a failure and the other two projects still complete — the guarantee `codependix map --write` makes: either it fully succeeds, or it names exactly which projects failed.",
      },
    ],
    summary:
      "How a container is rooted when a project bootstraps one, when it bootstraps nothing, and when it refuses to load at all.",
    title: "Rooting a container, including one that bootstraps nothing",
  };
}

/** Renders a list of explorations as a fenced report. */
function renderExplorations(explorations: Exploration[]): string {
  return fence(
    explorations
      .map((exploration) =>
        exploration.outcome === "explored"
          ? `explored ${exploration.name} — ${exploration.moduleCount} module(s)`
          : `failed   ${exploration.name}: ${exploration.error}`,
      )
      .join("\n"),
  );
}
