import { Injectable } from "@nestjs/common";

import {
  DIAGRAM_NODE_PREFIX,
  MAXIMUM_DIAGRAM_NODES,
  MERMAID_FLOWCHART_HEADER,
  MERMAID_LABEL_ESCAPES,
} from "./report.constants";

import type { FramedStack, MermaidDiagram } from "./report.types";
import type { StackFrame } from "@callidescope/core";

/**
 * Draws a set of call stacks as one mermaid flowchart.
 *
 * One diagram for all of them rather than one apiece, because a single stack
 * is a straight line and a straight line is a list with extra steps. Drawn
 * together the shared tails converge — every resolver ending in the same
 * service, every command reaching the same repository — and that convergence
 * is the thing a picture shows and an indented tree cannot.
 *
 * Labels carry the callable's name and nothing else. What it takes, returns,
 * and documents belongs to the tree rendering, which has room for it; a
 * diagram trying to carry all of that is unreadable at any size.
 */
@Injectable()
export class MermaidReportService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Draws one frame, or returns the identifier it already has. */
  private addFrame(args: {
    diagram: MermaidDiagram;
    frame: StackFrame;
    isEntryPoint: boolean;
  }): string {
    const existing = args.diagram.identifiersByCallable.get(args.frame.id);

    if (existing !== undefined) {
      return existing;
    }

    const identifier = `${DIAGRAM_NODE_PREFIX}${String(args.diagram.identifiersByCallable.size)}`;
    const label = this.renderLabel(args.frame);

    args.diagram.identifiersByCallable.set(args.frame.id, identifier);
    // A stadium for an entry point, a box for everything below it. Shape
    // rather than color: a diagram is read in whichever theme the reader has,
    // and only one of those is the one it was authored in.
    args.diagram.nodes.push(
      args.isEntryPoint
        ? `  ${identifier}(["${label}"])`
        : `  ${identifier}["${label}"]`,
    );

    return identifier;
  }

  /** Draws one stack into the diagram, reusing whatever it already holds. */
  private addStack(args: {
    diagram: MermaidDiagram;
    stack: FramedStack;
  }): void {
    const { diagram } = args;
    let previous: string | undefined;

    for (const [index, frame] of args.stack.frames.entries()) {
      const identifier = this.addFrame({
        diagram,
        frame,
        isEntryPoint: index === 0,
      });

      if (previous !== undefined && previous !== identifier) {
        diagram.edges.add(`  ${previous} --> ${identifier}`);
      }

      previous = identifier;
    }
  }

  /** Counts the callables a stack would add that the diagram lacks. */
  private countNewCallables(args: {
    diagram: MermaidDiagram;
    stack: FramedStack;
  }): number {
    const fresh = new Set(
      args.stack.frames
        .map((frame) => frame.id)
        .filter((id) => !args.diagram.identifiersByCallable.has(id)),
    );

    return fresh.size;
  }

  /** Renders a frame's label, escaping what mermaid would read as syntax. */
  private renderLabel(frame: StackFrame): string {
    let label = frame.displayName;

    for (const [character, escape] of MERMAID_LABEL_ESCAPES) {
      label = label.replaceAll(character, escape);
    }

    return frame.isCycle ? `${label} (cycle)` : label;
  }

  // 🌎 Public Methods

  /** Wraps a built diagram in its fence, or says why there is none. */
  public renderDiagram(args: {
    diagram: MermaidDiagram;
    omitted: number;
  }): string {
    if (args.diagram.nodes.length === 0) {
      return "None.";
    }

    const fence = [
      "```mermaid",
      MERMAID_FLOWCHART_HEADER,
      ...args.diagram.nodes,
      ...args.diagram.edges,
      "```",
    ].join("\n");

    return args.omitted === 0
      ? fence
      : `${fence}\n\n_${String(args.omitted)} further call stacks are not drawn: the diagram is at its ${String(MAXIMUM_DIAGRAM_NODES)}-callable limit._`;
  }

  /** Draws every stack that fits, deepest first, and says what did not. */
  public renderStacks(args: { stacks: readonly FramedStack[] }): string {
    const diagram: MermaidDiagram = {
      edges: new Set<string>(),
      identifiersByCallable: new Map<string, string>(),
      nodes: [],
    };
    let omitted = 0;

    for (const stack of args.stacks) {
      const total =
        diagram.identifiersByCallable.size +
        this.countNewCallables({ diagram, stack });

      if (total > MAXIMUM_DIAGRAM_NODES) {
        omitted += 1;
        continue;
      }

      this.addStack({ diagram, stack });
    }

    return this.renderDiagram({ diagram, omitted });
  }
}
