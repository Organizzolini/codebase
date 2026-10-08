import path from "node:path";

import { pythonService } from "./builders";
import { fence, table } from "./document";
import { resolveExample } from "./paths";

import type { ExampleDocument } from "./types";
import type {
  PythonImportGraph,
  PythonProject,
} from "@codependix/file-imports";

// 🏷️ Types

/**
 * A row in one of the example's two scanner tables.
 *
 * The tables are built from these lists so a case is named in exactly one
 * place, and a source file that stops demonstrating one fails the example
 * rather than leaving the table quietly wrong.
 */
interface ScannerCase {
  readonly description: string;
  readonly file: string;
}

// ♟️ Constants

/** Nx tag a project must carry for the Python pass to discover it at all. */
const PYTHON_PROJECT_TAG = "language:python";

/** Path segment every Python example sits under, inside `examples/`. */
const PYTHON_SEGMENT = "python-scanner";

/** Project exercising every case the hand-rolled statement scanner handles. */
const SCANNER_PROJECT = "scanner";

/** The scanner cases the example demonstrates, and the file each lives in. */
const SCANNER_CASES: ScannerCase[] = [
  {
    description: "A `#` inside a string literal, and a quote inside a comment",
    file: "catalog.py",
  },
  {
    description:
      "A parenthesized `from ... import (first, second)` over several lines",
    file: "parenthesized.py",
  },
  { description: "A backslash continuation", file: "continued.py" },
  {
    description: "A comma-separated `import package.first, package.second`",
    file: "main.py",
  },
  {
    description:
      "`from . import sibling` — only the module imported _from_ is kept, so this resolves the package's own `__init__.py` and never `sibling.py`",
    file: "main.py",
  },
  {
    description: "`from ..constants import FIRST` — one level further up",
    file: "shared/deep/cousin.py",
  },
  {
    description: "A directory made importable by `__init__.py`",
    file: "shared/__init__.py",
  },
];

/** The statements the scanner deliberately does not walk. */
const SCANNER_NON_CASES: ScannerCase[] = [
  { description: "An import indented inside a function", file: "nested.py" },
  {
    description: "An import inside an `if TYPE_CHECKING:` block",
    file: "nested.py",
  },
  {
    description:
      "`from third_party_package import Missing` — resolves to no file this project owns",
    file: "main.py",
  },
];

// 🕸️ Graphs

/** Builds one project's import graph, given its root on disk. */
export function buildGraphAt(absoluteRoot: string): PythonImportGraph {
  return pythonService.buildGraph(describeProjectAt(absoluteRoot));
}

/** Builds one example project's import graph. */
export function buildProjectGraph(name: string): PythonImportGraph {
  return buildGraphAt(resolveExample(PYTHON_SEGMENT, name));
}

/** Builds the Python import-graph example document. */
export function buildPythonDocuments(): ExampleDocument[] {
  const graph = buildProjectGraph(SCANNER_PROJECT);

  return [
    {
      id: "python-scanner",
      jsonExports: [],
      sections: [
        {
          body: renderProject(SCANNER_PROJECT),
          heading: "The scanned graph",
          note: "Every edge here came out of the hand-rolled statement scanner, resolved against the filesystem the way `ts.resolveModuleName` resolves against a compiler host.",
        },
        {
          body: renderCases(SCANNER_CASES),
          heading: "Every case the scanner handles",
          note: "Each one is a real file in `examples/python/scanner/`, and each one contributes an edge to the diagram above.",
        },
        {
          body: renderCases(SCANNER_NON_CASES),
          heading: "The statements deliberately not walked",
          note: "Choices rather than gaps. Only statements starting at column zero are considered, and an edge is kept only when it resolves to a file the project owns.",
        },
        {
          body: fence(graph.isolatedFileNames.join("\n")),
          heading: "Files left with no edge in either direction",
          note: "`nested.py` is here precisely because its two imports are not walked, which is the claim made visible rather than asserted.",
        },
        {
          body: "`.git`, `.mypy_cache`, `.pytest_cache`, `.ruff_cache`, `.venv`, `__pycache__`, and `node_modules` are walked past rather than into. None of them can be committed here — this repository's `.gitignore` claims every one — so the exclusion is proved by a unit test that creates a `__pycache__` directory at run time and checks it never reaches the graph.",
          heading: "Directories the walk never enters",
          note: "`PYTHON_PROJECT_EXCLUDED_DIRECTORY_NAMES` names them.",
        },
      ],
      summary:
        "Python imports are scanned, not compiled — so every case the scanner handles, and every case it deliberately refuses, has a source file.",
      title: "The whole surface of the Python statement scanner",
    },
  ];
}

/**
 * Describes a project rooted anywhere on disk, through real discovery.
 *
 * `tags` defaults to the `language:python` tag an Nx project would have
 * brought with it, since an example project is not an Nx project. Passing tags
 * without it is how a caller sees the gate refuse: discovery returns nothing
 * at all.
 */
export function describeProjectAt(
  absoluteRoot: string,
  tags: string[] = [PYTHON_PROJECT_TAG],
): PythonProject {
  const name = path.basename(absoluteRoot);
  const [project] = pythonService.discoverProjects([
    { absoluteRoot, name, tags },
  ]);

  if (project === undefined) {
    throw new Error(`No ${PYTHON_PROJECT_TAG} project at ${absoluteRoot}`);
  }

  return project;
}

/** Renders one project's import graph, given its root on disk. */
export function renderGraphAt(absoluteRoot: string): string {
  return pythonService.renderMermaid(buildGraphAt(absoluteRoot));
}

// 📄 Documents

/** Renders one example project's import graph as a mermaid diagram. */
export function renderProject(name: string): string {
  return pythonService.renderMermaid(buildProjectGraph(name));
}

/** Renders one of the two scanner tables. */
function renderCases(cases: ScannerCase[]): string {
  return table(
    ["File", "Case"],
    cases.map((scannerCase) => [
      `\`${scannerCase.file}\``,
      scannerCase.description,
    ]),
  );
}
