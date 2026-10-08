import path from "node:path";

import { typescriptService } from "./builders";
import { fence, table } from "./document";
import { resolveExample } from "./paths";

import type { ExampleDocument } from "./types";
import type {
  TypescriptImportGraph,
  TypescriptProject,
} from "@codependix/file-imports";

// 🏷️ Types

/**
 * One statement in the resolution example that deliberately draws no edge.
 *
 * Kept as data rather than prose so the guide's table and the example cannot
 * drift apart: the table is rendered from this list, and the files it names are
 * read by the same run.
 */
interface NonEdgeCase {
  readonly file: string;
  readonly reason: string;
  readonly statement: string;
}

/** One example project's outcome from building its program. */
type ProgramOutcome =
  | { readonly error: string; readonly outcome: "failed" }
  | { readonly fileCount: number; readonly outcome: "built" };

// ♟️ Constants

/** Path segment every TypeScript example sits under, inside `examples/`. */
const TYPESCRIPT_SEGMENT = "typescript-resolution";

/** Project exercising every resolution case and every deliberate non-case. */
const RESOLUTION_PROJECT = "resolution";

/** Project whose `tsconfig.json` the compiler refuses to parse. */
const BROKEN_PROJECT = "broken";

/**
 * The specifiers the resolution project declares that draw no edge.
 *
 * Named here so the guide can list them without a reader opening every file,
 * and so a resolver change that started drawing one of them fails the example
 * rather than quietly widening what the graph claims.
 */
const NON_EDGE_CASES: NonEdgeCase[] = [
  {
    file: "src/re-exported.ts",
    reason: "an ExportDeclaration, not an ImportDeclaration",
    statement: 'export * from "./settings.js"',
  },
  {
    file: "src/deferred.ts",
    reason: "a call expression, not a declaration",
    statement: 'import("./settings.js")',
  },
  {
    file: "src/required.ts",
    reason: "a call expression, not a declaration",
    statement: 'require("./settings.js")',
  },
  {
    file: "src/external.ts",
    reason: "resolves outside the project",
    statement: 'import ts from "typescript"',
  },
];

// 🕸️ Graphs

/**
 * Graphs already built, keyed by the project root they were built from.
 *
 * `ts.createProgram` parses the whole default library before it resolves a
 * single specifier, and the same two projects are asked for repeatedly.
 * Nothing under `examples/` changes while the process runs, so the second
 * request is answered from here — which is what keeps a shared CI runner from
 * spending that parse a dozen times over.
 */
const graphsByRoot = new Map<string, TypescriptImportGraph>();

/** Builds one project's import graph, given its root on disk. */
export function buildGraphAt(absoluteRoot: string): TypescriptImportGraph {
  const cached = graphsByRoot.get(absoluteRoot);

  if (cached !== undefined) return cached;

  const graph = typescriptService.buildGraph(
    typescriptService.buildProgram(describeProjectAt(absoluteRoot)),
  );

  graphsByRoot.set(absoluteRoot, graph);

  return graph;
}

/** Builds a program, reporting a configuration failure rather than raising. */
export function buildOutcome(name: string): ProgramOutcome {
  try {
    return {
      fileCount: buildProjectGraph(name).fileNames.length,
      outcome: "built",
    };
  } catch (error) {
    return { error: redactPath(describeError(error)), outcome: "failed" };
  }
}

/** Builds one example project's import graph. */
export function buildProjectGraph(name: string): TypescriptImportGraph {
  return buildGraphAt(resolveExample(TYPESCRIPT_SEGMENT, name));
}

/** Builds the TypeScript import-graph example document. */
export function buildTypescriptDocuments(): ExampleDocument[] {
  const graph = buildProjectGraph(RESOLUTION_PROJECT);

  return [
    {
      id: "typescript-resolution",
      jsonExports: [],
      sections: [
        {
          body: renderProject(RESOLUTION_PROJECT),
          heading: "The resolved graph",
          note: "`src/index.ts` reaches `src/catalog.ts` through a NodeNext `.js` specifier, and `src/catalog.ts` reaches `src/settings.ts` through the `@atlas/*` path alias declared in a `tsconfig.json` that extends a shared base config.",
        },
        {
          body: fence(graph.fileNames.join("\n")),
          heading: "Every file the graph knows",
          note: "`src/ambient.d.ts` is a root file of the program and never a node: declaration files are filtered out before the graph is built.",
        },
        {
          body: table(
            ["File", "Statement", "Why no edge"],
            NON_EDGE_CASES.map((nonEdgeCase) => [
              `\`${nonEdgeCase.file}\``,
              `\`${nonEdgeCase.statement}\``,
              nonEdgeCase.reason,
            ]),
          ),
          heading: "The statements that deliberately draw no edge",
          note: "Every one of these is a choice rather than a gap, and every one is a claim a resolver change could silently reverse.",
        },
        {
          body: fence(describeOutcome(buildOutcome(BROKEN_PROJECT))),
          heading: "A project whose `tsconfig.json` cannot be parsed",
          note: "`TypescriptProjectConfigurationError` carries the compiler's own diagnostics. Parsing failures are fatal rather than skipped, because a project silently dropped makes `--check` unable to tell a genuinely empty graph from one it never built.",
        },
      ],
      summary:
        "TypeScript imports resolve through the compiler, not through a heuristic — and only an import declaration with a string-literal specifier counts.",
      title: "Imports resolve through the compiler",
    },
  ];
}

/** Describes a raised value, whether or not it was an `Error`. */
export function describeError(error: unknown): string {
  return error instanceof Error
    ? `${error.name}: ${error.message}`
    : String(error);
}

/** Reports an outcome as the one line a run would log for it. */
export function describeOutcome(outcome: ProgramOutcome): string {
  return outcome.outcome === "built"
    ? `built — ${outcome.fileCount} file(s)`
    : outcome.error;
}

/**
 * Describes a project through the real discovery entry point.
 *
 * `TypescriptService.discoverProjects` reads no Nx tag — every project
 * carrying its own `tsconfig.json` is a candidate, since a file-level import
 * graph is meaningful for any TypeScript project.
 */
export function describeProjectAt(absoluteRoot: string): TypescriptProject {
  const [project] = typescriptService.discoverProjects([
    { absoluteRoot, name: path.basename(absoluteRoot) },
  ]);

  if (project === undefined) {
    throw new Error(`No tsconfig.json under ${absoluteRoot}`);
  }

  return project;
}

/**
 * Replaces an absolute path with a repository-relative one.
 *
 * The compiler reports diagnostics against the real file it read, so a
 * committed example carrying the absolute path of whichever machine rendered
 * it would fail `examples --check` everywhere else.
 */
export function redactPath(message: string): string {
  return message.replaceAll(
    resolveExample(TYPESCRIPT_SEGMENT),
    "<examples>/typescript-resolution",
  );
}

/** Renders one project's import graph, given its root on disk. */
export function renderGraphAt(absoluteRoot: string): string {
  return typescriptService.renderMermaid(buildGraphAt(absoluteRoot));
}

// 📄 Documents

/** Renders one example project's import graph as a mermaid diagram. */
export function renderProject(name: string): string {
  return typescriptService.renderMermaid(buildProjectGraph(name));
}
