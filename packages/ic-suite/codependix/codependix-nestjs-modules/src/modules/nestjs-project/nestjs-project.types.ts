// 🏷️ Types

/** A module in an explored NestJS container. */
export interface NestjsExploredModule {
  /**
   * Path to the file declaring the module class, relative to the project
   * root. Undefined for a module the project imports rather than declares.
   */
  readonly declaringFile?: string | undefined;
  /** Class names of the modules this one imports, in the container's order. */
  readonly imports: string[];
  /** The module class name. */
  readonly name: string;
}

/** A workspace project tagged `framework:nestjs`. */
export interface NestjsProject {
  /** Absolute path of the project directory. */
  readonly absoluteRoot: string;
  /** Project directory name, which is also the Nx project name. */
  readonly name: string;
  /**
   * Absolute path of the project's root module file, when it has one.
   *
   * Undefined for a library package, whose container is rooted in a
   * synthetic module built from every module the package defines.
   */
  readonly rootModuleFile: string | undefined;
}
