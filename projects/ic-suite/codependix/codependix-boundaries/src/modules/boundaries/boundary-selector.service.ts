import path from "node:path";

import { Injectable } from "@nestjs/common";

import type { BoundaryNode } from "./boundaries.types";
import type { CodependixBoundarySelector } from "@codependix/configuration";

/**
 * Decides which nodes a rule's selector claims.
 *
 * Split out from `BoundariesService` because it is the one part of rule
 * evaluation with no opinion about rules at all: a selector and a node go in,
 * and a yes or no comes out. Both rule kinds ask it the same question, and so
 * does anything that later wants to know what a rule covers without running
 * it.
 */
@Injectable()
export class BoundarySelectorService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Whether one of a node's string attributes matches a list of globs.
   *
   * A selector naming an attribute the node's level does not carry matches
   * nothing rather than everything — a `path` rule evaluated against a NestJS
   * module graph, which carries no file paths, selects no module instead of
   * silently selecting all of them.
   */
  private matchesGlobs(
    value: string | undefined,
    globs: readonly string[] | undefined,
  ): boolean {
    if (globs === undefined) {
      return true;
    }

    if (value === undefined) {
      return false;
    }

    return globs.some((glob) => path.matchesGlob(value, glob));
  }

  /**
   * Whether a node carries a tag matching one of a list of globs.
   *
   * One tag matching is enough, which is what makes `tags: ["type:package"]`
   * read the way an Nx tag list does — a project carries several, and a rule
   * naming one is asking whether that one is among them.
   */
  private matchesTags(
    tags: readonly string[] | undefined,
    globs: readonly string[] | undefined,
  ): boolean {
    if (globs === undefined) {
      return true;
    }

    if (tags === undefined) {
      return false;
    }

    return globs.some((glob) =>
      tags.some((tag) => path.matchesGlob(tag, glob)),
    );
  }

  // 🌎 Public Methods

  /**
   * Whether a selector claims a node.
   *
   * Every field the selector states must match — the fields narrow each
   * other, so `{ project: ["lexico"], path: ["src/**"] }` means a file in
   * lexico's `src` rather than either of those. Within one field, one glob
   * matching is enough.
   */
  public matches(
    node: BoundaryNode,
    selector: CodependixBoundarySelector,
  ): boolean {
    return (
      this.matchesGlobs(node.id, selector.id) &&
      this.matchesGlobs(node.path, selector.path) &&
      this.matchesGlobs(node.project, selector.project) &&
      this.matchesTags(node.tags, selector.tags)
    );
  }

  /**
   * The ids of every node a selector claims.
   *
   * A selector of `undefined` claims every node, which is what an `acyclic`
   * rule naming no scope means. An empty selector is a different thing and
   * never reaches here: the configuration schema refuses one outright, since
   * a selector stating nothing reads exactly like a typo.
   */
  public selectIds(
    nodes: readonly BoundaryNode[],
    selector: CodependixBoundarySelector | undefined,
  ): Set<string> {
    if (selector === undefined) {
      return new Set(nodes.map((node) => node.id));
    }

    return new Set(
      nodes
        .filter((node) => this.matches(node, selector))
        .map((node) => node.id),
    );
  }
}
