// 🏷️ Types

/**
 * One module a Python `import`/`from ... import` statement names.
 *
 * Only the module being imported from is kept — which names a `from`
 * statement pulls out of it is irrelevant to a file-level import graph, the
 * same way `codependix-file-imports` resolves only a TypeScript import
 * declaration's `moduleSpecifier` and never looks at what it binds.
 */
export interface PythonImportSpecifier {
  /**
   * How many leading dots a `from` statement's module carried.
   *
   * `0` for an absolute import (`import`, or `from x import y`); `1` for
   * `from . import y` or `from .x import y`; `2` for `from .. import y`;
   * and so on.
   */
  readonly level: number;
  /**
   * The dotted module path, with dots left in (`"src.grammars"`), or an
   * empty string for a bare relative import (`from . import y`).
   */
  readonly modulePath: string;
}
