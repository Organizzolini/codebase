import { Injectable } from "@nestjs/common";

import {
  describeCycle,
  describeDisallowedEdge,
  describeForbiddenEdge,
} from "./boundaries.constants";
import { BoundaryCyclesService } from "./boundary-cycles.service";
import { BoundarySelectorService } from "./boundary-selector.service";

import type {
  BoundaryEdge,
  BoundaryGraph,
  BoundaryNode,
  BoundaryViolation,
  EvaluateBoundariesArguments,
} from "./boundaries.types";
import type {
  CodependixBoundaryAccessRule,
  CodependixBoundaryAcyclicRule,
} from "@codependix/configuration";

/**
 * Judges a built graph against the rules declared for its level.
 *
 * The whole package's public act: a `BoundaryGraph` and a list of rules go in,
 * and the edges and cycles that break them come out. Nothing here knows how a
 * graph was built, where a rule was written, or what a caller will do with a
 * violation — which is what keeps the package a leaf, depending on nothing but
 * `@codependix/configuration` for the rule shapes it reads.
 *
 * A rule that matches nothing is not an error. It reports no violation, the
 * same as a rule everything satisfies: a workspace that has not yet grown the
 * code a rule was written for should not be failed for it, and a rule kept
 * around after the code it covered was deleted is a cleanup rather than a
 * breakage.
 */
@Injectable()
export class BoundariesService {
  // 🏗 Dependency Injection

  constructor(
    private readonly cyclesService: BoundaryCyclesService,
    private readonly selectorService: BoundarySelectorService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Turns one condemned edge into the violation reported for it. */
  private buildAccessViolation(args: {
    edge: { source: string; target: string };
    graph: BoundaryGraph;
    rule: CodependixBoundaryAccessRule;
  }): BoundaryViolation {
    const { edge, graph, rule } = args;
    const describe =
      rule.kind === "forbid" ? describeForbiddenEdge : describeDisallowedEdge;

    return {
      cycle: undefined,
      level: graph.level,
      message: this.buildMessage({
        generated: describe({
          rule: rule.name,
          source: edge.source,
          target: edge.target,
        }),
        message: rule.message,
      }),
      rule: rule.name,
      scope: graph.scope,
      source: edge.source,
      target: edge.target,
    };
  }

  /**
   * The sentence a violation is reported as.
   *
   * A rule's own `message` is appended to the generated one rather than
   * replacing it, so no wording a configuration can choose ever costs the
   * report the two things it must always carry: the rule that fired, and both
   * ends of what it fired on. The generated half says what happened, and the
   * configured half says why it matters.
   */
  private buildMessage(args: {
    generated: string;
    message: string | undefined;
  }): string {
    return args.message === undefined
      ? args.generated
      : `${args.generated} ${args.message}`;
  }

  /**
   * Reports every edge an `allow` or `forbid` rule condemns.
   *
   * The two kinds differ only in which verdict the target's match produces,
   * so they are one traversal rather than two: `forbid` condemns an edge
   * reaching what `to` claims, and `allow` condemns one reaching anything it
   * does not.
   */
  private evaluateAccessRule(args: {
    graph: BoundaryGraph;
    rule: CodependixBoundaryAccessRule;
  }): BoundaryViolation[] {
    const { graph, rule } = args;
    const nodes = this.indexNodes(graph);
    const violations: BoundaryViolation[] = [];

    for (const edge of graph.edges) {
      if (!this.judgesEdge({ edge, rule })) {
        continue;
      }

      const source = this.resolveNode(nodes, edge.source);

      if (!this.selectorService.matches(source, rule.from)) {
        continue;
      }

      const target = this.resolveNode(nodes, edge.target);
      const reaches = this.selectorService.matches(target, rule.to);

      if (reaches !== (rule.kind === "forbid")) {
        continue;
      }

      violations.push(this.buildAccessViolation({ edge, graph, rule }));
    }

    return violations;
  }

  /** Reports every cycle an `acyclic` rule's selected nodes still form. */
  private evaluateAcyclicRule(args: {
    graph: BoundaryGraph;
    rule: CodependixBoundaryAcyclicRule;
  }): BoundaryViolation[] {
    const { graph, rule } = args;
    const nodeIds = this.selectorService.selectIds(graph.nodes, rule.nodes);
    const cycles = this.cyclesService.findCycles({
      edges: graph.edges,
      nodeIds,
    });

    return cycles.map((cycle) => ({
      cycle: cycle.path,
      level: graph.level,
      message: this.buildMessage({
        generated: describeCycle({ cycle: cycle.path, rule: rule.name }),
        message: rule.message,
      }),
      rule: rule.name,
      scope: graph.scope,
      source: cycle.source,
      target: cycle.target,
    }));
  }

  /** Indexes a graph's nodes by identifier, so an edge can look its ends up. */
  private indexNodes(graph: BoundaryGraph): Map<string, BoundaryNode> {
    return new Map(graph.nodes.map((node) => [node.id, node]));
  }

  /**
   * Whether a rule judges this edge at all, before either end is selected.
   *
   * A rule naming no `edges` judges every one, which is the stricter reading
   * and the right default for a rule about what a project may _depend on_.
   * Naming `implicit: false` narrows it to what an
   * `@nx/enforce-module-boundaries` `depConstraint` actually sees — that rule
   * reads import statements, so an `implicitDependencies` entry is invisible
   * to it. An edge at a level that draws no implicit edges is read as
   * explicit, since a file import is not "explicitly" anything.
   */
  private judgesEdge(args: {
    edge: BoundaryEdge;
    rule: CodependixBoundaryAccessRule;
  }): boolean {
    const wanted = args.rule.edges?.implicit;

    return wanted === undefined || (args.edge.implicit ?? false) === wanted;
  }

  /**
   * The node an edge names, or a bare one carrying only that identifier.
   *
   * An edge naming a node the graph does not list is judged on its identifier
   * alone rather than skipped: silently dropping the edge would hide the rule
   * rather than the mistake. The consequence is that a `path`, `project`, or
   * `tags` selector cannot match such an endpoint, since a bare node carries
   * none of them — so a `forbid` written against `path` reports nothing for
   * it, which is the safer of the two wrong answers.
   *
   * Every real builder lists both ends of every edge it draws — an import
   * graph only draws edges between files in its own `fileNames`, and the Nx
   * and NestJS graphs both list every node they connect — so this is reached
   * only by a hand-written graph.
   */
  private resolveNode(
    nodes: Map<string, BoundaryNode>,
    id: string,
  ): BoundaryNode {
    return nodes.get(id) ?? { id };
  }

  // 🌎 Public Methods

  /**
   * Every violation one graph's rules report, in the order the rules were
   * declared.
   *
   * Declaration order rather than severity or node order: a configuration's
   * author reads their own file top to bottom, and a report ordered the same
   * way needs no key.
   */
  public evaluate(args: EvaluateBoundariesArguments): BoundaryViolation[] {
    return args.rules.flatMap((rule) =>
      rule.kind === "acyclic"
        ? this.evaluateAcyclicRule({ graph: args.graph, rule })
        : this.evaluateAccessRule({ graph: args.graph, rule }),
    );
  }
}
