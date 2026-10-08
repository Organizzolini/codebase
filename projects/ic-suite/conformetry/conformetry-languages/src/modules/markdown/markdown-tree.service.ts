import { Injectable } from "@nestjs/common";

import { ScoringService } from "../scoring/scoring.service";

import { MarkdownNodesService } from "./markdown-nodes.service";
import { CONTAINER_TYPES, SKIPPED_TYPES } from "./markdown.constants";

import type {
  CompareChildrenArguments,
  CompareChildrenResult,
  CompareNodeArguments,
  CompareNodeResult,
  MarkdownComparisonError,
  MarkdownNode,
} from "./markdown.types";

/**
 * Walks two markdown trees and reports what the template requires but the
 * instance lacks.
 *
 * The walk is order-preserving but not position-locked: each template node is
 * matched against any instance sibling, and the last match anchors the error
 * location for whatever follows. A document may therefore add sections freely,
 * as long as it still contains everything the template declares.
 *
 * The walk also counts what it asked for: every template node it weighs is one
 * requirement, and a node with no counterpart costs its whole subtree.
 */
@Injectable()
export class MarkdownTreeService {
  // 🏗 Dependency Injection

  constructor(
    private readonly markdownNodesService: MarkdownNodesService,
    private readonly scoringService: ScoringService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Describes a template node the instance does not contain. */
  private buildError(args: {
    lastMatchedNode: MarkdownNode | undefined;
    templateChild: MarkdownNode;
  }): MarkdownComparisonError {
    const anchorLine = args.lastMatchedNode?.position?.end?.line;

    return {
      instanceLine: anchorLine === undefined ? undefined : anchorLine + 1,
      nodeType: args.templateChild.type,
      text: this.markdownNodesService.readText(args.templateChild),
      weight: this.markdownNodesService.countSubtree(args.templateChild),
    };
  }

  /** What the first matching candidate captured for the template node. */
  private captureFirst(args: {
    candidates: MarkdownNode[];
    templateChild: MarkdownNode;
  }): Record<string, string> {
    const [instanceNode] = args.candidates;

    return instanceNode === undefined
      ? {}
      : (this.markdownNodesService.capture({
          instanceNode,
          templateNode: args.templateChild,
        }) ?? {});
  }

  /**
   * Matches a container node, then descends into it.
   *
   * Several instance nodes may match the container shape — two lists, say — so
   * the one whose children satisfy the most of the template is chosen.
   */
  private compareContainer(args: CompareNodeArguments): CompareNodeResult {
    const candidates = this.findCandidates(args);

    if (candidates.length === 0) {
      const error = this.buildError(args);

      return {
        differences: [error],
        lastMatchedNode: args.lastMatchedNode,
        totalWeight: error.weight,
      };
    }

    const templateGrandchildren = this.markdownNodesService.readChildren(
      args.templateChild,
    );

    if (templateGrandchildren.length === 0) {
      return {
        captures: this.captureFirst({ ...args, candidates }),
        differences: [],
        lastMatchedNode: candidates.at(-1),
        totalWeight: 1,
      };
    }

    return candidates
      .map((candidate) => {
        const comparison = this.compareChildren({
          instanceChildren: this.markdownNodesService.readChildren(candidate),
          templateChildren: templateGrandchildren,
        });

        return {
          captures: {
            ...comparison.captures,
            ...this.captureFirst({ ...args, candidates: [candidate] }),
          },
          differences: comparison.differences,
          lastMatchedNode: candidate,
          // The container itself is one requirement; its children add theirs.
          totalWeight: comparison.totalWeight + 1,
        };
      })
      .reduce((best, candidate) => {
        // Weighed by failed weight, not error count: one finding standing in
        // for a whole missing list is a worse match than two missing headings.
        return this.scoringService.sumWeights(candidate.differences) <
          this.scoringService.sumWeights(best.differences)
          ? candidate
          : best;
      });
  }

  /** Matches a leaf node on its own identity, without descending. */
  private compareLeaf(args: CompareNodeArguments): CompareNodeResult {
    const candidates = this.findCandidates(args);
    // A leaf is matched whole, without descending, so its subtree is either
    // entirely accounted for or entirely missing.
    const weight = this.markdownNodesService.countSubtree(args.templateChild);

    return candidates.length === 0
      ? {
          differences: [this.buildError(args)],
          lastMatchedNode: args.lastMatchedNode,
          totalWeight: weight,
        }
      : {
          captures: this.captureFirst({ ...args, candidates }),
          differences: [],
          lastMatchedNode: candidates.at(-1),
          totalWeight: weight,
        };
  }

  /** Finds every instance sibling satisfying the template node. */
  private findCandidates(args: CompareNodeArguments): MarkdownNode[] {
    return args.instanceChildren.filter((instanceNode) => {
      return (
        this.markdownNodesService.capture({
          instanceNode,
          templateNode: args.templateChild,
        }) !== undefined
      );
    });
  }

  // 🌎 Public Methods

  /** Compares one level of two trees, descending into containers. */
  public compareChildren(
    args: CompareChildrenArguments,
  ): CompareChildrenResult {
    let captures: Record<string, string> = {};
    const differences: MarkdownComparisonError[] = [];
    let lastMatchedNode: MarkdownNode | undefined;
    let totalWeight = 0;

    for (const templateChild of args.templateChildren) {
      if (SKIPPED_TYPES.has(templateChild.type)) {
        continue;
      }

      const result = CONTAINER_TYPES.has(templateChild.type)
        ? this.compareContainer({
            instanceChildren: args.instanceChildren,
            lastMatchedNode,
            templateChild,
          })
        : this.compareLeaf({
            instanceChildren: args.instanceChildren,
            lastMatchedNode,
            templateChild,
          });

      // Earlier siblings win, so the first capture in the document stays.
      captures = { ...result.captures, ...captures };
      differences.push(...result.differences);
      lastMatchedNode = result.lastMatchedNode;
      totalWeight += result.totalWeight;
    }

    return { captures, differences, totalWeight };
  }
}
