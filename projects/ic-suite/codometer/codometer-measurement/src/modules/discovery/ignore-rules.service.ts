import { existsSync, readFileSync } from "node:fs";

import { Injectable } from "@nestjs/common";
import ignore from "ignore";

import type {
  CreateIgnoreScopeArguments,
  IgnoreScope,
  ReadIgnoreScopeArguments,
} from "./ignore-rules.types";

/**
 * Reads and applies gitignore-syntax rule sets without invoking git.
 *
 * Codometer used to hand this problem to `git ls-files`, which meant it could
 * only measure a directory that was a git repository. Reading the syntax here
 * is what lets it measure any directory at all, and it is the only reading of
 * that syntax in the tool — there is no git fast path to disagree with.
 */
@Injectable()
export class IgnoreRulesService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * The path a rule set sees, or nothing when the path lies outside it.
   *
   * A rule set anchored at `projects/affirmancy` matches its patterns
   * against `output/one.md`, not against the full path, because that is what
   * the patterns in that directory's ignore file were written against.
   */
  private toScopedPath(
    scope: IgnoreScope,
    relativePath: string,
  ): string | undefined {
    if (scope.directory === "") {
      return relativePath;
    }

    const prefix = `${scope.directory}/`;

    if (!relativePath.startsWith(prefix)) {
      return undefined;
    }

    return relativePath.slice(prefix.length);
  }

  // 🌎 Public Methods

  /**
   * Builds a rule set from patterns already in hand.
   *
   * Case-sensitive on every platform, deliberately. Git decides that from the
   * filesystem it happens to be on, so the same ignore file can claim a
   * different set of files on a developer's Mac and on Linux CI. A measurement
   * that disagrees with itself between machines is worse than a strict one.
   */
  createScope(args: CreateIgnoreScopeArguments): IgnoreScope {
    return {
      directory: args.directory,
      matcher: ignore({ ignorecase: false }).add(args.patterns),
    };
  }

  /**
   * Whether the rule sets ignore a path, the innermost one deciding.
   *
   * gitignore resolution is nested rather than additive: a rule set in a
   * subdirectory overrides the one above it, which is what lets a `!pattern`
   * re-include a file its parent excluded. Reading the scopes outermost first
   * and keeping the last decision reproduces that ordering.
   *
   * A directory is passed with a trailing slash, so a `build/` pattern claims
   * the directory rather than only a file that happens to be named `build`.
   */
  isIgnored(scopes: readonly IgnoreScope[], relativePath: string): boolean {
    let isIgnored = false;

    for (const scope of scopes) {
      const scopedPath = this.toScopedPath(scope, relativePath);

      // An empty scoped path is the scope's own directory, which its patterns
      // are relative to and therefore can never claim.
      if (scopedPath === undefined || scopedPath === "") {
        continue;
      }

      const result = scope.matcher.test(scopedPath);

      if (result.ignored) {
        isIgnored = true;
      } else if (result.unignored) {
        isIgnored = false;
      }
    }

    return isIgnored;
  }

  /**
   * Reads a rule set out of a gitignore-syntax file.
   *
   * Returns nothing when the file is absent, so a configured ignore file that
   * was renamed is reported by the caller rather than silently behaving as an
   * empty one.
   */
  readScope(args: ReadIgnoreScopeArguments): IgnoreScope | undefined {
    if (!existsSync(args.filePath)) {
      return undefined;
    }

    return this.createScope({
      directory: args.directory,
      patterns: readFileSync(args.filePath, "utf8").split("\n"),
    });
  }
}
