import { Injectable } from "@nestjs/common";
import ts from "typescript";

/**
 * Builds compiler hosts that share parsed source files across programs.
 *
 * Every project's program pulls in the same lib files and the same workspace
 * dependencies, so without sharing, one run re-reads `lib.es2023.d.ts` once per
 * project and the shared packages roughly one and a half times over. Caching is
 * the difference between a ten-second run and a five-second one, and it costs
 * nothing in correctness as long as the cache key names the script target.
 */
@Injectable()
export class CompilerHostService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  private readonly moduleResolutionCaches = new Map<
    string,
    ts.ModuleResolutionCache
  >();

  /**
   * Keyed on file name and script target together.
   *
   * The target has to be part of the key. A source file parsed at ES2023 has a
   * different tree from the same text parsed at ES5, so handing a cached one to
   * a program that asked for another target is silently wrong.
   */
  private readonly sourceFileCache = new Map<string, ts.SourceFile>();

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Returns the module resolution cache for one working directory. */
  private resolveModuleCache(
    options: ts.CompilerOptions,
    workspaceRoot: string,
  ): ts.ModuleResolutionCache {
    const existing = this.moduleResolutionCaches.get(workspaceRoot);

    if (existing !== undefined) {
      return existing;
    }

    const created = ts.createModuleResolutionCache(
      workspaceRoot,
      (fileName) => fileName,
      options,
    );
    this.moduleResolutionCaches.set(workspaceRoot, created);

    return created;
  }

  // 🌎 Public Methods

  /** Drops every cached source file, for a host that outlives one run. */
  public clear(): void {
    this.sourceFileCache.clear();
    this.moduleResolutionCaches.clear();
  }

  /**
   * Creates a compiler host that reuses already-parsed source files.
   *
   * `setParentNodes` is on because the rest of the package reads `node.parent`
   * and `node.getStart()`, neither of which works on a tree parsed without it,
   * and neither of which `createProgram` turns on by itself for files it pulls
   * in rather than files it was handed.
   */
  public createHost(args: {
    options: ts.CompilerOptions;
    workspaceRoot: string;
  }): ts.CompilerHost {
    const host = ts.createCompilerHost(args.options, true);
    const readSourceFile = host.getSourceFile.bind(host);

    this.resolveModuleCache(args.options, args.workspaceRoot);

    // Two parameters rather than the four the signature allows: `onError` and
    // `shouldCreateNewSourceFile` are only meaningful on a cache miss that this
    // host never produces differently, and taking all four would put the
    // callback over the repository's parameter limit for no gain.
    const readCached = (
      fileName: string,
      languageVersion: ts.CreateSourceFileOptions | ts.ScriptTarget,
    ): ts.SourceFile | undefined => {
      const target =
        typeof languageVersion === "object"
          ? languageVersion.languageVersion
          : languageVersion;
      const cacheKey = `${fileName} ${String(target)}`;
      const cached = this.sourceFileCache.get(cacheKey);

      if (cached !== undefined) {
        return cached;
      }

      const parsed = readSourceFile(fileName, languageVersion);

      if (parsed !== undefined) {
        this.sourceFileCache.set(cacheKey, parsed);
      }

      return parsed;
    };

    host.getSourceFile = readCached;

    return host;
  }
}
