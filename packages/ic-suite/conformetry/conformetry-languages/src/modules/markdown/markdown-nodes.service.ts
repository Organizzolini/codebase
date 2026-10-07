import { capturePlaceholderValues } from "@conformetry/configuration";
import { Injectable } from "@nestjs/common";
import { toString } from "mdast-util-to-string";

import { SKIPPED_TYPES } from "./markdown.constants";

import type { MarkdownNode } from "./markdown.types";

/**
 * Decides whether two markdown nodes are "the same node".
 *
 * Each node type has its own notion of identity: a heading is its depth plus
 * its text, a link is its URL plus its text, a table is its column count. This
 * is what lets a template require *a table with three columns* without
 * dictating its contents.
 */
@Injectable()
export class MarkdownNodesService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  /**
   * How to decide that two nodes of a given type are "the same node".
   *
   * A table rather than a switch so each rule stays its own small function —
   * one branch per markdown type in a single method is unreadable, and the
   * types that need no special rule fall through to a text comparison.
   */
  private readonly matchersByType: Record<
    string,
    (templateNode: MarkdownNode, instanceNode: MarkdownNode) => boolean
  > = {
    code: (templateNode, instanceNode) => {
      return (
        this.sameField(templateNode.lang, instanceNode.lang) &&
        this.sameField(templateNode.value, instanceNode.value)
      );
    },
    heading: (templateNode, instanceNode) => {
      return (
        templateNode.depth === instanceNode.depth &&
        this.readText(templateNode) === this.readText(instanceNode)
      );
    },
    html: (templateNode, instanceNode) => {
      return this.sameField(templateNode.value, instanceNode.value);
    },
    image: (templateNode, instanceNode) => {
      return (
        this.sameField(templateNode.url, instanceNode.url) &&
        this.sameField(templateNode.alt, instanceNode.alt)
      );
    },
    inlineCode: (templateNode, instanceNode) => {
      return this.sameField(templateNode.value, instanceNode.value);
    },
    link: (templateNode, instanceNode) => {
      return (
        this.sameField(templateNode.url, instanceNode.url) &&
        this.readText(templateNode) === this.readText(instanceNode)
      );
    },
    list: (templateNode, instanceNode) => {
      return templateNode.ordered === instanceNode.ordered;
    },
    table: (templateNode, instanceNode) => {
      return (
        this.readColumnCount(templateNode) ===
        this.readColumnCount(instanceNode)
      );
    },
    tableRow: (templateNode, instanceNode) => {
      return (
        this.readChildren(templateNode).length ===
        this.readChildren(instanceNode).length
      );
    },
    text: (templateNode, instanceNode) => {
      return this.sameField(templateNode.value, instanceNode.value);
    },
    thematicBreak: () => true,
  };

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Counts a table's columns from its first row. */
  private readColumnCount(node: MarkdownNode): number {
    const firstRow = this.readChildren(node)[0];

    return firstRow === undefined ? 0 : this.readChildren(firstRow).length;
  }

  /** Compares two optional string fields, treating absent as empty. */
  private sameField(
    leftValue: string | undefined,
    rightValue: string | undefined,
  ): boolean {
    return (leftValue ?? "") === (rightValue ?? "");
  }

  // 🌎 Public Methods

  /**
   * Matches an instance node against a template node, returning what any
   * placeholder value in the template node's text captured, or `undefined`
   * when the instance node does not satisfy it.
   *
   * A node failing its ordinary rule is tried once more with its plain text
   * as a pattern, provided the type and heading depth agree.
   */
  public capture(args: {
    instanceNode: MarkdownNode;
    templateNode: MarkdownNode;
  }): Record<string, string> | undefined {
    const { instanceNode, templateNode } = args;

    if (templateNode.type !== instanceNode.type) {
      return undefined;
    }

    const matcher = this.matchersByType[templateNode.type];
    const matched =
      matcher === undefined
        ? this.readText(templateNode) === this.readText(instanceNode)
        : matcher(templateNode, instanceNode);

    if (matched) {
      return {};
    }

    return templateNode.depth === instanceNode.depth
      ? capturePlaceholderValues({
          instanceText: this.readText(instanceNode),
          templateText: this.readText(templateNode),
        })
      : undefined;
  }

  /**
   * Counts a node and every countable node beneath it.
   *
   * This is what a missing node costs. Comparison reports a vanished section
   * once, but the template asked for the section and everything inside it, so
   * weighing the finding by its subtree keeps a deleted table from scoring the
   * same as a deleted heading.
   *
   * Skipped types are excluded on both sides of the fraction, so nodes the
   * comparison never checks cannot dilute a score.
   */
  public countSubtree(node: MarkdownNode): number {
    if (SKIPPED_TYPES.has(node.type)) {
      return 0;
    }

    return this.readChildren(node).reduce((total, child) => {
      return total + this.countSubtree(child);
    }, 1);
  }

  /** Narrows a raw mdast child list to the nodes this validator understands. */
  public filterNodes(children: readonly unknown[]): MarkdownNode[] {
    return children.filter((childNode): childNode is MarkdownNode => {
      return (
        typeof childNode === "object" &&
        childNode !== null &&
        "type" in childNode
      );
    });
  }

  /** Returns whether an instance node satisfies a template node. */
  public matches(args: {
    instanceNode: MarkdownNode;
    templateNode: MarkdownNode;
  }): boolean {
    return this.capture(args) !== undefined;
  }

  /** Reads a node's children, or an empty list for a leaf. */
  public readChildren(node: MarkdownNode): MarkdownNode[] {
    return node.children ?? [];
  }

  /** Reads a node's rendered plain text. */
  public readText(node: MarkdownNode): string {
    return toString(node);
  }
}
