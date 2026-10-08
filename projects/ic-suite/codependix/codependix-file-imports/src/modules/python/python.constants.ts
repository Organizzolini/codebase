// ♟️ Constants

/** File name a directory carries when it is itself an importable package. */
export const PYTHON_PACKAGE_INIT_FILE_NAME = "__init__.py";

/** Extension a Python source file carries. */
export const PYTHON_FILE_EXTENSION = ".py";

/** Header declaring the mermaid diagram type and its default layout direction. */
export const PYTHON_IMPORT_GRAPH_MERMAID_HEADER = "graph LR";

/** Rendered in place of a diagram for a project with no internal file imports. */
export const PYTHON_IMPORT_GRAPH_UNCONNECTED =
  "_This project has no internal file imports._";

/** Directory names walked past rather than into when discovering source files. */
export const PYTHON_PROJECT_EXCLUDED_DIRECTORY_NAMES = new Set([
  ".git",
  ".mypy_cache",
  ".pytest_cache",
  ".ruff_cache",
  ".venv",
  "__pycache__",
  "node_modules",
]);

/** Nx tag a project must carry to be discovered as a Python project. */
export const PYTHON_PROJECT_TAG = "language:python";
