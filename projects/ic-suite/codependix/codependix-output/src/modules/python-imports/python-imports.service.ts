import path from "node:path";

import { ConfigurationService } from "@codependix/configuration";
import { PythonService } from "@codependix/file-imports";
import { Injectable } from "@nestjs/common";

import { DeliveryService } from "../delivery/delivery.service";
import {
  FILE_IMPORTS_GRAPH_TYPE,
  MARKDOWN_SECTION_INTRO_LINE,
  PYTHON_IMPORTS_MARKDOWN_SUBHEADING,
} from "../graph-run/graph-run.constants";

import type { PythonImportGraphExport } from "../graph-run/graph-run.types";
import type { GraphRunContext } from "@codependix/boundaries";
import type { ResolvedCodependixGraphOutput } from "@codependix/configuration";
import type {
  CodependixRunMode,
  GraphRunOutcome,
  MarkdownSectionArguments,
  ProjectRunFailure,
  ProjectRunResult,
} from "@codependix/core";
import type { PythonProject } from "@codependix/file-imports";

/**
 * Builds and delivers every configured Python file-level import graph
 * export.
 *
 * Split out of `GraphRunService` — which owns the same pass for every
 * other graph type — purely to keep that file under this repository's
 * per-file line limit; the pass itself follows
 * `GraphRunService.runImportGraphs` exactly, one collaborator per language
 * instead of one compiler-backed `ts.Program` per project.
 */
@Injectable()
export class PythonImportsService {
  // 🏗 Dependency Injection

  constructor(
    private readonly configurationService: ConfigurationService,
    private readonly deliveryService: DeliveryService,
    private readonly pythonService: PythonService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Builds the section heading a missing anchor auto-creates. */
  private buildMarkdownSection(): MarkdownSectionArguments {
    return {
      introLine: MARKDOWN_SECTION_INTRO_LINE,
      subheading: PYTHON_IMPORTS_MARKDOWN_SUBHEADING,
    };
  }

  /** Turns a raised error into a `ProjectRunFailure` for the given project. */
  private collectProjectFailure(
    projectName: string,
    error: unknown,
  ): ProjectRunFailure {
    return {
      error: error instanceof Error ? error.message : String(error),
      projectName,
    };
  }

  /**
   * Resolves one project's export target for this graph type, including its
   * workspace-relative root and its Nx tags, so `include`/`exclude` globs may
   * match either and `--tags` reaches the tags — the same resolution
   * `GraphRunService.resolveProjectOutput` performs for every other graph type.
   */
  private resolveProjectOutput(args: {
    context: GraphRunContext;
    project: { absoluteRoot: string; name: string };
  }): ResolvedCodependixGraphOutput {
    const { context, project } = args;

    return this.configurationService.resolveForProject({
      configuration: context.configuration,
      graphType: FILE_IMPORTS_GRAPH_TYPE,
      projectConfiguration: context.projectConfigurations.get(project.name),
      projectName: project.name,
      projectRoot: path.relative(
        context.workingDirectory,
        project.absoluteRoot,
      ),
      projectTags: context.projects.find(
        (candidate) => candidate.name === project.name,
      )?.tags,
    });
  }

  /** Builds, renders, and delivers one project's Python import graph. */
  private runProject(args: {
    mode: CodependixRunMode;
    project: PythonProject;
    resolvedOutput: ResolvedCodependixGraphOutput;
  }): ProjectRunResult {
    const { mode, project, resolvedOutput } = args;
    const pythonImportGraph = this.pythonService.buildGraph(project);
    const jsonExport: PythonImportGraphExport = pythonImportGraph;

    return this.deliveryService.deliverGraphOutput({
      jsonContent:
        resolvedOutput.json === undefined
          ? undefined
          : this.deliveryService.renderJson(jsonExport),
      markdownContent:
        resolvedOutput.markdown === undefined
          ? undefined
          : this.pythonService.renderMermaid(pythonImportGraph),
      markdownSection: this.buildMarkdownSection(),
      mode,
      project,
      resolvedOutput,
    });
  }

  // 🌎 Public Methods

  /**
   * Builds and delivers every configured Python file-level import graph
   * export.
   *
   * Only `language:python`-tagged projects participate, discovered from the
   * tags `context.projects` carry — see `PythonService`. A project that
   * raises while its own export is being resolved is recorded as a failure
   * rather than aborting the pass, the same rule `runImportGraphs` follows.
   */
  runGraphs(context: GraphRunContext): GraphRunOutcome {
    const pythonProjects = this.pythonService.discoverProjects(
      context.projects,
    );
    const results: GraphRunOutcome["results"] = [];
    const failures: ProjectRunFailure[] = [];

    for (const project of pythonProjects) {
      const resolvedOutput = this.resolveProjectOutput({ context, project });

      if (resolvedOutput.target === "none") {
        continue;
      }

      try {
        results.push(
          this.runProject({ mode: context.mode, project, resolvedOutput }),
        );
      } catch (error) {
        failures.push(this.collectProjectFailure(project.name, error));
      }
    }

    return { failures, results };
  }
}
