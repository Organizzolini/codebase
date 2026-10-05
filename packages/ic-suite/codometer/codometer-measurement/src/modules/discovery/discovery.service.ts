import { type Dirent, readdirSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logging";

import {
  CSS_EXTENSIONS,
  GIT_DIRECTORY_NAME,
  GITIGNORE_FILE_NAME,
  HCL_EXTENSIONS,
  JS_EXTENSIONS,
  JSON_EXTENSIONS,
  MARKDOWN_EXTENSIONS,
  NOTEBOOK_EXTENSIONS,
  RECURSIVE_GLOB_SUFFIX,
  SHELL_EXTENSIONS,
  SQL_EXTENSIONS,
  TEST_FILE_REGEX,
  TOML_EXTENSIONS,
  TS_EXTENSIONS,
  YAML_EXTENSIONS,
} from "./discovery.constants";
import { IgnoreRulesService } from "./ignore-rules.service";

import type {
  DiscoverFilesArguments,
  DiscoveryResult,
  WalkDirectoryArguments,
  WalkSubdirectoryArguments,
} from "./discovery.types";
import type { IgnoreScope } from "./ignore-rules.types";

/** Discovers and categorizes the files of a codebase directory. */
@Injectable()
export class DiscoveryService {
  // 🏗 Dependency Injection

  constructor(
    private readonly ignoreRulesService: IgnoreRulesService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(DiscoveryService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Folds a directory's own `.gitignore` into the rule sets already in force.
   *
   * Appended last so its patterns outrank the ones above it, which is how git
   * resolves a nested ignore file: the closest one to the file wins.
   */
  private applyDirectoryIgnoreFile(
    args: WalkDirectoryArguments,
  ): WalkDirectoryArguments {
    const scope = this.ignoreRulesService.readScope({
      directory: args.relativeDirectory,
      filePath: path.join(args.absoluteDirectory, GITIGNORE_FILE_NAME),
    });

    if (scope === undefined) {
      return args;
    }

    return { ...args, ignoreScopes: [...args.ignoreScopes, scope] };
  }

  /** Selects the discovered files whose extension belongs to a category. */
  private filterByExtension(
    files: string[],
    extensions: Set<string>,
  ): string[] {
    return files.filter((filePath) =>
      extensions.has(path.extname(filePath).toLowerCase()),
    );
  }

  /**
   * Whether any exclusion glob claims the given repository-relative path.
   *
   * Matched with `path.matchesGlob` rather than by substring, so a glob naming
   * a `dist` directory removes build output and leaves a `redistribute`
   * directory alone.
   */
  private isExcluded(filePath: string, exclude: string[]): boolean {
    return exclude.some((pattern) => path.matchesGlob(filePath, pattern));
  }

  /**
   * Whether every file beneath a directory is excluded by a glob already.
   *
   * A pattern ending in `/**` claims every descendant without exception, so a
   * directory matching the pattern with that suffix removed cannot contribute
   * a single file and never has to be read. This is a shortcut and not a rule
   * of its own: the same files would be dropped one by one afterwards either
   * way. It matters in a directory with no `.gitignore` to prune
   * `node_modules`, where reading it dwarfs reading the codebase.
   */
  private isExhaustivelyExcluded(
    directoryPath: string,
    exclude: string[],
  ): boolean {
    return exclude.some(
      (pattern) =>
        pattern.endsWith(RECURSIVE_GLOB_SUFFIX) &&
        path.matchesGlob(
          directoryPath,
          pattern.slice(0, -RECURSIVE_GLOB_SUFFIX.length),
        ),
    );
  }

  /**
   * Whether either set of ignore rules claims a path.
   *
   * The two sets are answered independently and the answers combined, rather
   * than merged into one set. A configured ignore file subtracts from what the
   * repository's own `.gitignore` files leave behind, exactly as the two git
   * invocations this replaced did; a negation in one cannot resurrect a file
   * the other removed.
   */
  private isIgnoredPath(
    args: WalkDirectoryArguments,
    relativePath: string,
  ): boolean {
    return (
      this.ignoreRulesService.isIgnored(args.ignoreScopes, relativePath) ||
      this.ignoreRulesService.isIgnored(args.excludeFromScopes, relativePath)
    );
  }

  /**
   * Lists every measurable file in the given directory, in sorted order.
   *
   * Sorted because the walk visits directories in whatever order the
   * filesystem reports them, and every consumer downstream deserves the same
   * list from the same tree on any machine.
   */
  private listDiscoveredFiles(args: DiscoverFilesArguments): string[] {
    const files = this.walkDirectory({
      absoluteDirectory: args.workingDirectory,
      exclude: args.exclude,
      excludeFromScopes: this.readExcludeFromScopes(args),
      ignoreScopes: [],
      relativeDirectory: "",
    });

    return files
      .filter((filePath) => !this.isExcluded(filePath, args.exclude))
      .toSorted();
  }

  /**
   * Reads a directory's entries, or none when the directory cannot be read.
   *
   * A directory can vanish or refuse to open partway through a walk — one
   * being cleaned up by another process, a mount the caller has no permission
   * on. Shelling out to git never failed for either reason, so letting one
   * unreadable directory abort the whole measurement would be a regression:
   * warn, skip it, and keep counting the rest.
   */
  private readDirectoryEntries(args: WalkDirectoryArguments): Dirent[] {
    try {
      return readdirSync(args.absoluteDirectory, { withFileTypes: true });
    } catch (error: unknown) {
      this.logger.warn(`📂 Skipped unreadable directory`, undefined, {
        path: args.absoluteDirectory,
        reason: String(error),
      });
      return [];
    }
  }

  /**
   * Reads the configured ignore files into rule sets anchored at the root.
   *
   * A missing file is a warning rather than a failure: a repository that has
   * renamed its ignore file should hear about it, but a report is still worth
   * more than a crash.
   */
  private readExcludeFromScopes(args: DiscoverFilesArguments): IgnoreScope[] {
    const scopes: IgnoreScope[] = [];

    for (const ignoreFilePath of args.excludeFrom) {
      const scope = this.ignoreRulesService.readScope({
        directory: "",
        filePath: path.resolve(args.workingDirectory, ignoreFilePath),
      });

      if (scope === undefined) {
        this.logger.warn(`🙈 Skipped missing ignore file`, undefined, {
          path: ignoreFilePath,
        });
        continue;
      }

      scopes.push(scope);
    }

    return scopes;
  }

  /**
   * Collects every measurable file under one directory.
   *
   * Walked directory by directory rather than matched by a single recursive
   * glob, because an ignored directory then costs one decision instead of an
   * enumeration: `node_modules/` is pruned where it is named, not discovered
   * in full and thrown away.
   */
  private walkDirectory(args: WalkDirectoryArguments): string[] {
    const entries = this.readDirectoryEntries(args);
    const walkArguments = this.applyDirectoryIgnoreFile(args);
    const files: string[] = [];

    for (const entry of entries) {
      // Symlinks are skipped rather than followed: following one counts its
      // target a second time, and `CLAUDE.md` pointing at `AGENTS.md` is not a
      // second document.
      if (entry.isSymbolicLink() || entry.name === GIT_DIRECTORY_NAME) {
        continue;
      }

      const absolutePath = path.join(args.absoluteDirectory, entry.name);
      const relativePath =
        args.relativeDirectory === ""
          ? entry.name
          : `${args.relativeDirectory}/${entry.name}`;

      if (entry.isDirectory()) {
        files.push(
          ...this.walkSubdirectory({
            ...walkArguments,
            absolutePath,
            relativePath,
          }),
        );
      } else if (
        entry.isFile() &&
        !this.isIgnoredPath(walkArguments, relativePath)
      ) {
        files.push(relativePath);
      }
    }

    return files;
  }

  /**
   * Descends into one subdirectory, or skips it when nothing there counts.
   *
   * The trailing slash is what makes a `coverage/` pattern claim the directory
   * itself: without it the pattern only ever matches a file of that name.
   */
  private walkSubdirectory(args: WalkSubdirectoryArguments): string[] {
    if (
      this.isExhaustivelyExcluded(args.relativePath, args.exclude) ||
      this.isIgnoredPath(args, `${args.relativePath}/`)
    ) {
      return [];
    }

    return this.walkDirectory({
      ...args,
      absoluteDirectory: args.absolutePath,
      relativeDirectory: args.relativePath,
    });
  }

  // 🌎 Public Methods

  /**
   * Sorts a list of file paths into the categories the analyzers ask for.
   *
   * Separate from the walk so that any target's files can be categorized, not
   * only the ones this service found itself: a target naming its files by glob
   * is analyzed by the same language analyzers as the codebase around it.
   */
  categorize(files: string[]): DiscoveryResult {
    const allExtensions = new Set([...TS_EXTENSIONS, ...JS_EXTENSIONS]);
    const sourceFiles = files.filter((filePath) =>
      allExtensions.has(path.extname(filePath)),
    );

    return {
      cssFiles: this.filterByExtension(files, CSS_EXTENSIONS),
      files,
      hclFiles: this.filterByExtension(files, HCL_EXTENSIONS),
      jsFiles: sourceFiles.filter((filePath) =>
        JS_EXTENSIONS.has(path.extname(filePath)),
      ),
      jsonFiles: this.filterByExtension(files, JSON_EXTENSIONS),
      markdownFiles: this.filterByExtension(files, MARKDOWN_EXTENSIONS),
      notebookFiles: this.filterByExtension(files, NOTEBOOK_EXTENSIONS),
      pyFiles: files.filter((filePath) => path.extname(filePath) === ".py"),
      shellFiles: this.filterByExtension(files, SHELL_EXTENSIONS),
      sourceFiles,
      sqlFiles: this.filterByExtension(files, SQL_EXTENSIONS),
      testFiles: sourceFiles.filter((filePath) =>
        TEST_FILE_REGEX.test(filePath),
      ),
      tomlFiles: this.filterByExtension(files, TOML_EXTENSIONS),
      tsFiles: sourceFiles.filter((filePath) =>
        TS_EXTENSIONS.has(path.extname(filePath)),
      ),
      yamlFiles: this.filterByExtension(files, YAML_EXTENSIONS),
    };
  }

  /** Returns categorized file path lists for the given codebase root. */
  discoverFiles(args: DiscoverFilesArguments): DiscoveryResult {
    return this.categorize(this.listDiscoveredFiles(args));
  }
}
