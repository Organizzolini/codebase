import { Injectable } from "@nestjs/common";

import type ts from "typescript";

/**
 * Decides whether a declaration lives outside the code being traced.
 *
 * This is the filter the whole tool rests on. Most call sites in any real file
 * resolve into `lib.es5.d.ts` or a dependency; without this, every `.map()` and
 * `.trim()` becomes a frame, and the deepest stack in the repository turns out
 * to be somewhere inside a standard-library type declaration.
 *
 * The verdict is memoized per source file rather than per call site because it
 * is asked tens of thousands of times per run and the answer only ever depends
 * on the file.
 */
@Injectable()
export class ExternalService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  private ownedFilePaths: ReadonlySet<string> = new Set();

  private readonly verdicts = new WeakMap<ts.SourceFile, boolean>();

  private workspaceRoot = "";

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Works out whether a file is outside the traced set. */
  private computeVerdict(sourceFile: ts.SourceFile): boolean {
    if (sourceFile.isDeclarationFile) {
      return true;
    }

    const { fileName } = sourceFile;

    // A path segment rather than a substring: a project legitimately named
    // something like `node_modules-inspector` is not a dependency.
    if (fileName.split("/").includes("node_modules")) {
      return true;
    }

    return !fileName.startsWith(this.workspaceRoot);
  }

  // 🌎 Public Methods

  /** Points the predicate at one run's workspace and owned-file set. */
  public configure(args: {
    ownedFilePaths: ReadonlySet<string>;
    workspaceRoot: string;
  }): void {
    this.ownedFilePaths = args.ownedFilePaths;
    this.workspaceRoot = args.workspaceRoot;
  }

  /** True when a declaration's file is not part of the traced code. */
  public isExternal(sourceFile: ts.SourceFile): boolean {
    const cached = this.verdicts.get(sourceFile);

    if (cached !== undefined) {
      return cached;
    }

    const verdict = this.computeVerdict(sourceFile);
    this.verdicts.set(sourceFile, verdict);

    return verdict;
  }

  /** True when a file is one this run walks declarations in. */
  public isOwned(realPath: string): boolean {
    return this.ownedFilePaths.has(realPath);
  }
}
