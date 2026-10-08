import {
  BoundariesService,
  BoundaryCheckService,
  BoundaryCyclesService,
  BoundaryFailureService,
  BoundaryGraphService,
  BoundaryOutcomeReportService,
  BoundaryReportService,
  BoundarySelectorService,
} from "@codependix/boundaries";
import {
  ConfigurationModule,
  ConfigurationService,
} from "@codependix/configuration";
import {
  FileImportsWorkspaceGraphService,
  PythonImportGraphService,
  PythonImportParserService,
  PythonProjectService,
  PythonService,
  TypescriptImportGraphService,
  TypescriptProjectService,
  TypescriptService,
} from "@codependix/file-imports";
import {
  ModuleGraphService,
  NestjsModulesWorkspaceGraphService,
  NestjsProjectService,
} from "@codependix/nestjs-modules";
import {
  NeighborhoodService,
  WorkspaceGraphService,
} from "@codependix/nx-projects";
import {
  AnchorsService,
  DeliveryService,
  PathQueryService,
} from "@codependix/output";
import { NestFactory } from "@nestjs/core";

import { LoggerService } from "@codebase/logging";

import type { INestApplicationContext } from "@nestjs/common";

// ♟️ Constants

/**
 * The codependix builders every example renders through.
 *
 * These are the same classes `@codependix/cli` wires into its own container.
 * This package runs a script rather than an application, so all but one are
 * constructed by hand rather than resolved from a container. The exception is
 * `ConfigurationService` — see `getConfigurationService`, which boots the one
 * module it is exported from.
 */
const logger = new LoggerService();

/** Reads the Nx project graph and renders a one-hop Neighborhood. */
export const neighborhoodService = new NeighborhoodService();

/** Renders the whole-workspace Nx graph. */
export const workspaceGraphService = new WorkspaceGraphService(
  neighborhoodService,
);

/** Explores a NestJS project's container in preview mode. */
export const nestjsProjectService = new NestjsProjectService(logger);

/** Reduces an explored container to a module graph and renders it. */
export const moduleGraphService = new ModuleGraphService();

/** Discovers TypeScript projects and builds each one's `ts.Program`. */
export const typescriptProjectService = new TypescriptProjectService();

/** Builds and renders a project's TypeScript file-level import graph. */
export const typescriptService = new TypescriptService(
  new TypescriptImportGraphService(typescriptProjectService),
  typescriptProjectService,
);

/** Discovers Python projects and lists each one's source files. */
export const pythonProjectService = new PythonProjectService();

/** Builds and renders a project's Python file-level import graph. */
export const pythonService = new PythonService(
  new PythonImportGraphService(
    new PythonImportParserService(),
    pythonProjectService,
  ),
  pythonProjectService,
);

/**
 * The booted `ConfigurationModule` promise, or `undefined` until something
 * asks for it. Held so repeated calls share one container rather than booting a
 * fresh one per example or racing during concurrent initialization.
 */
let configurationContextPromise: Promise<INestApplicationContext> | undefined;

/**
 * Closes the container `getConfigurationService` booted, if it booted one.
 *
 * Called once the render run is over — a context left open holds the process
 * open with it, which a script that is expected to exit cannot afford.
 */
export async function closeConfigurationService(): Promise<void> {
  if (configurationContextPromise !== undefined) {
    const context = await configurationContextPromise;
    await context.close();
    configurationContextPromise = undefined;
  }
}

/**
 * Resolves what a configuration file says about where an export goes, and
 * what the command line says over it.
 *
 * Resolved from `ConfigurationModule` rather than constructed by hand, unlike
 * every builder in this file: `@codependix/configuration` makes exactly one
 * service public, so its loader, override resolver, option parser, and flag
 * resolver are providers nothing outside the package can name.
 *
 * A function rather than a top-level `await`, which would make this shared
 * module async for the sake of one of its eighteen builders and boot a
 * container for callers that never touch configuration at all.
 */
export async function getConfigurationService(): Promise<ConfigurationService> {
  configurationContextPromise ??= NestFactory.createApplicationContext(
    ConfigurationModule,
    { logger: false },
  );

  const context = await configurationContextPromise;

  return context.get(ConfigurationService);
}

/** Reads and rewrites codependix's own named anchor blocks. */
export const anchorsService = new AnchorsService();

/** Turns a resolved export configuration into file I/O. */
export const deliveryService = new DeliveryService(anchorsService);

/** Judges a built graph against declared boundary rules. */
export const boundariesService = new BoundariesService(
  new BoundaryCyclesService(),
  new BoundarySelectorService(),
);

/** Renders boundary violations into the lines a run prints. */
export const boundaryReportService = new BoundaryReportService();

/** Reports what a boundary pass found, charged to projects and judged. */
export const boundaryOutcomeReportService = new BoundaryOutcomeReportService(
  boundaryReportService,
);

/**
 * Judges every level against its rules and charges what it finds to projects.
 *
 * The same class `codependix map --check boundaries` runs, wired by hand with
 * the builders above rather than resolved from a container.
 */
export const boundaryCheckService = new BoundaryCheckService(
  boundariesService,
  new BoundaryFailureService(neighborhoodService),
  new BoundaryGraphService(),
  moduleGraphService,
  nestjsProjectService,
  pythonService,
  typescriptService,
  workspaceGraphService,
);

/** Combines project-level file imports into a workspace graph. */
export const fileImportsWorkspaceGraphService =
  new FileImportsWorkspaceGraphService();

/** Combines NestJS module graphs into a workspace graph. */
export const nestjsModulesWorkspaceGraphService =
  new NestjsModulesWorkspaceGraphService();

/** Finds shortest paths across codependix graph levels and renders results. */
export const pathQueryService = new PathQueryService(
  fileImportsWorkspaceGraphService,
  moduleGraphService,
  nestjsModulesWorkspaceGraphService,
  nestjsProjectService,
  pythonService,
  typescriptService,
  workspaceGraphService,
);
