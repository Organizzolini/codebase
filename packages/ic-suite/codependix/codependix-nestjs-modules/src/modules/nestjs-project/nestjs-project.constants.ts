// ♟️ Constants

/** Nx project tag that marks a project as one this package graphs. */
export const NESTJS_PROJECT_TAG = "framework:nestjs";

/** File suffix that marks a NestJS module definition. */
export const NESTJS_PROJECT_MODULE_FILE_SUFFIX = ".module.ts";

/**
 * Path, relative to a project root, of the module a project bootstraps.
 *
 * A project without one is a library rather than an application, and gets a
 * synthetic root built from every module it defines instead.
 */
export const NESTJS_PROJECT_ROOT_MODULE_FILE = "src/main.module.ts";

/** Export a root module file is expected to provide. */
export const NESTJS_PROJECT_ROOT_MODULE_EXPORT = "MainModule";

/**
 * Modules NestJS creates to host a dynamic module's providers.
 *
 * These are implementation details of `forRoot`/`forRootAsync` rather than
 * anything a project declares — `TypeOrmModule` is in a project's design and
 * stays in the graph, while the `TypeOrmCoreModule` it builds underneath is
 * not. The synthetic root belongs here for the same reason: this package
 * created it, so it is not part of the project. So does `InternalCoreModule`,
 * which NestJS adds to every container and imports into every module. It is
 * matched by name because NestJS 11 and 12 export it from different paths.
 */
export const NESTJS_PROJECT_IGNORED_MODULES: RegExp[] = [
  /^ConfigHostModule$/,
  /^InternalCoreModule$/,
  /^SyntheticRootModule$/,
  /^TypeOrmCoreModule$/,
];

/**
 * Additionally ignored when the root is synthetic.
 *
 * The synthetic root supplies a global `ConfigModule` so that a package whose
 * modules read configuration in a `useFactory` can be scanned at all. That
 * scaffolding is this package's, not the project's, so it stays out of the
 * graph.
 */
export const NESTJS_PROJECT_SYNTHETIC_IGNORED_MODULES: RegExp[] = [
  /^ConfigModule$/,
];
