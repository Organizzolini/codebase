import { type Dirent, existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { REPOSITORY_ROOT_MARKERS } from "@codometer/configuration";
import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logging";

import {
  GLOB_MAGIC_CHARACTERS,
  InputOutsideRepositoryError,
  PATH_SEPARATOR,
} from "./inputs.constants";

import type {
  InputEntryKind,
  MatchInputFilesArguments,
  WalkInputArguments,
} from "./inputs.types";
import type { ResolvedCodometerInput } from "@codometer/configuration";

/**
 * Lists the files an input holds.
 *
 * Globs alone decide, with no ignore file consulted: an input exists to name a
 * part of the tree outright, and the most useful part to name is compiled
 * output, which every repository's ignore files claim.
 */
@Injectable()
export class InputsService {
  // 🏗 Dependency Injection

  constructor(private readonly logger: LoggerService) {
    this.logger.setContext(InputsService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Whether a directory can hold anything the input's globs claim.
   *
   * A hidden directory is only entered when a glob spells it out. That is what
   * every glob library means by excluding dot files, and it is also what stops
   * an input over the whole tree from reading the repository's git database.
   */
  private canDescend(
    args: WalkInputArguments,
    relativeDirectory: string,
  ): boolean {
    const isHidden = this.isHidden(relativeDirectory);

    return args.includeBases.some((base) =>
      isHidden
        ? this.leadsToBase(base, relativeDirectory)
        : this.leadsToBase(base, relativeDirectory) ||
          this.sitsInsideBase(base, relativeDirectory),
    );
  }

  /**
   * The furthest out an input is allowed to reach, from where the run started.
   *
   * The repository holding the measured directory, or that directory itself
   * when nothing above it looks like one. Found by marker rather than by
   * asking git, which is never invoked here, and generic to every repository —
   * it says where measuring stops, not how any tree beneath it is arranged.
   */
  private findBoundary(workingDirectory: string): string {
    let candidateDirectory = path.resolve(workingDirectory);

    for (;;) {
      const directory = candidateDirectory;

      if (
        REPOSITORY_ROOT_MARKERS.some((marker) =>
          existsSync(path.join(directory, marker)),
        )
      ) {
        return directory;
      }

      const parentDirectory = path.dirname(candidateDirectory);

      if (parentDirectory === candidateDirectory) {
        return path.resolve(workingDirectory);
      }

      candidateDirectory = parentDirectory;
    }
  }

  /** Whether the last segment of a path starts with a dot. */
  private isHidden(relativePath: string): boolean {
    return relativePath.split(PATH_SEPARATOR).at(-1)?.startsWith(".") === true;
  }

  /**
   * Whether a symbolic link points at a file.
   *
   * Links are followed, as every glob library does. Only to files, though: a
   * link pointing back at one of its own ancestors would otherwise be walked
   * until the stack ran out.
   */
  private isLinkedFile(absolutePath: string): boolean {
    try {
      return statSync(absolutePath).isFile();
    } catch (error: unknown) {
      this.logger.warn(`🔗 Skipped unreadable link`, undefined, {
        path: absolutePath,
        reason: String(error),
      });
      return false;
    }
  }

  /**
   * Whether the input claims a file.
   *
   * Both lists are answered in full rather than in order, so where a pattern
   * sits within either of them cannot change the answer.
   */
  private isMatched(
    input: ResolvedCodometerInput,
    relativePath: string,
  ): boolean {
    return (
      input.include.some((pattern) =>
        path.matchesGlob(relativePath, pattern),
      ) &&
      !input.exclude.some((pattern) => path.matchesGlob(relativePath, pattern))
    );
  }

  /** Whether the directory is on the way down to a glob's literal prefix. */
  private leadsToBase(base: string, relativeDirectory: string): boolean {
    return (
      base === relativeDirectory ||
      base.startsWith(`${relativeDirectory}${PATH_SEPARATOR}`)
    );
  }

  /**
   * Reads a directory's entries, or none when the directory cannot be read.
   *
   * An input naming a directory that was never built is an ordinary state
   * rather than a failure — it holds no files, and what that means is decided
   * by whoever asked for the measurement.
   */
  private readEntries(absoluteDirectory: string): Dirent[] {
    try {
      return readdirSync(absoluteDirectory, { withFileTypes: true });
    } catch (error: unknown) {
      this.logger.warn(`🎯 Skipped unreadable input directory`, undefined, {
        path: absoluteDirectory,
        reason: String(error),
      });
      return [];
    }
  }

  /**
   * The measured-directory-relative prefix every matched path carries.
   *
   * Empty when the input starts where the run does. Otherwise it is the walk
   * root written relative to the measured directory — `../../dist` and the
   * like — so that every path leaving this service is relative to the same
   * directory whether or not the input reached outside it.
   */
  private readInputPrefix(
    walkDirectory: string,
    workingDirectory: string,
  ): string {
    return path
      .relative(workingDirectory, walkDirectory)
      .split(path.sep)
      .join(PATH_SEPARATOR);
  }

  /** What a directory entry counts as, once any link has been followed. */
  private resolveEntryKind(
    absolutePath: string,
    entry: Dirent,
  ): InputEntryKind {
    if (entry.isDirectory()) {
      return "directory";
    }

    if (entry.isFile()) {
      return "file";
    }

    if (entry.isSymbolicLink() && this.isLinkedFile(absolutePath)) {
      return "file";
    }

    return "other";
  }

  /** Whether the directory sits inside a glob's literal prefix. */
  private sitsInsideBase(base: string, relativeDirectory: string): boolean {
    return (
      base === "" || relativeDirectory.startsWith(`${base}${PATH_SEPARATOR}`)
    );
  }

  /** Whether a directory is the boundary or sits somewhere beneath it. */
  private sitsInsideBoundary(boundary: string, directory: string): boolean {
    return (
      directory === boundary || directory.startsWith(`${boundary}${path.sep}`)
    );
  }

  /**
   * The literal path prefix of a glob, up to its first magic character.
   *
   * `dist/projects/logging/**` can only match inside `dist/projects/logging`, so
   * that is the only branch of the tree worth reading — the difference between
   * measuring one build directory and enumerating every dependency to find it.
   */
  private toIncludeBase(pattern: string): string {
    const literalSegments: string[] = [];

    for (const segment of pattern.split(PATH_SEPARATOR)) {
      if (GLOB_MAGIC_CHARACTERS.test(segment)) {
        break;
      }

      literalSegments.push(segment);
    }

    return literalSegments.join(PATH_SEPARATOR);
  }

  /** Collects every file one directory of the input's tree contributes. */
  private walk(args: WalkInputArguments): string[] {
    const files: string[] = [];

    for (const entry of this.readEntries(args.absoluteDirectory)) {
      const absolutePath = path.join(args.absoluteDirectory, entry.name);
      const relativePath =
        args.relativeDirectory === ""
          ? entry.name
          : `${args.relativeDirectory}${PATH_SEPARATOR}${entry.name}`;
      const kind = this.resolveEntryKind(absolutePath, entry);

      if (kind === "directory" && this.canDescend(args, relativePath)) {
        files.push(
          ...this.walk({
            ...args,
            absoluteDirectory: absolutePath,
            relativeDirectory: relativePath,
          }),
        );
      } else if (kind === "file" && this.isMatched(args.input, relativePath)) {
        files.push(relativePath);
      }
    }

    return files;
  }

  // 🌎 Public Methods

  /**
   * Lists the files an input holds, sorted, relative to the measured directory.
   *
   * The walk starts at the input's own directory, which is the measured one
   * unless the input named a way out of it. Where a repository builds is a
   * convention its configuration states and this service is told, never one
   * inferred here from a project's position — but the reach is bounded: a
   * directory landing outside the repository fails the input by name rather
   * than measuring whatever it found there.
   *
   * Sorted because the walk visits directories in whatever order the
   * filesystem reports them, and a size is a sum of every file either way —
   * but a list nobody can predict is one nobody can compare.
   */
  matchFiles(args: MatchInputFilesArguments): string[] {
    const walkDirectory = path.resolve(
      args.workingDirectory,
      args.input.directory,
    );
    const boundary = this.findBoundary(args.workingDirectory);

    if (!this.sitsInsideBoundary(boundary, walkDirectory)) {
      throw new InputOutsideRepositoryError(
        args.input.name,
        walkDirectory,
        boundary,
      );
    }

    const prefix = this.readInputPrefix(walkDirectory, args.workingDirectory);
    const matched = this.walk({
      absoluteDirectory: walkDirectory,
      includeBases: args.input.include.map((pattern) =>
        this.toIncludeBase(pattern),
      ),
      input: args.input,
      relativeDirectory: "",
    }).toSorted();

    if (prefix === "") {
      return matched;
    }

    return matched.map(
      (relativePath) => `${prefix}${PATH_SEPARATOR}${relativePath}`,
    );
  }
}
