import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { buildSourceLocation, buildStackFrame } from "../../../testing/mocks";
import { ANALYSIS_MODULES } from "../../../testing/modules";

import { MermaidReportService } from "./mermaid-report.service";
import { MAXIMUM_DIAGRAM_NODES } from "./report.constants";

import type { CallStack, StackFrame } from "@callidescope/core";

/** A frame whose identity is its name, so stacks can share callables. */
function frame(name: string, overrides: Partial<StackFrame> = {}): StackFrame {
  return buildStackFrame({
    displayName: name,
    id: `${name}.ts#0`,
    location: buildSourceLocation({ filePath: `${name}.ts` }),
    ...overrides,
  });
}

/** A stack running through the named callables, in order. */
function stack(names: string[]): CallStack {
  return {
    depth: names.length,
    entryPointKind: "decorated-method",
    frames: names.map((name) => frame(name)),
    isLowerBound: false,
  };
}

describe(MermaidReportService, () => {
  let service: MermaidReportService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [...ANALYSIS_MODULES],
      providers: [MermaidReportService],
    }).compile();

    service = await module.resolve(MermaidReportService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  // 🕸️ The diagram

  it("opens a left-to-right flowchart inside a mermaid fence", () => {
    const rendered = service.renderStacks({
      stacks: [stack(["Resolver.read", "Service.load"])],
    });

    expect(rendered.startsWith("```mermaid\nflowchart LR")).toBe(true);
    expect(rendered.endsWith("```")).toBe(true);
  });

  it("draws a node per callable and an edge per call", () => {
    const rendered = service.renderStacks({
      stacks: [stack(["Resolver.read", "Service.load"])],
    });

    expect(rendered).toContain('n0(["Resolver.read"])');
    expect(rendered).toContain('n1["Service.load"]');
    expect(rendered).toContain("n0 --> n1");
  });

  it("gives an entry point a different shape from what it calls", () => {
    const rendered = service.renderStacks({
      stacks: [stack(["Resolver.read", "Service.load"])],
    });

    expect(rendered).toContain('n0(["Resolver.read"])');
    expect(rendered).not.toContain('n1(["Service.load"])');
  });

  it("says plainly when there is nothing to draw", () => {
    expect(service.renderStacks({ stacks: [] })).toBe("None.");
  });

  // 🔗 Convergence

  it("draws a callable two stacks share exactly once", () => {
    const rendered = service.renderStacks({
      stacks: [
        stack(["First.read", "Service.load"]),
        stack(["Second.read", "Service.load"]),
      ],
    });

    expect(rendered.match(/"Service\.load"/g)).toHaveLength(1);
  });

  it("joins both callers to the callable they share", () => {
    // The convergence is the whole reason to draw stacks together rather than
    // one apiece.
    const rendered = service.renderStacks({
      stacks: [
        stack(["First.read", "Service.load"]),
        stack(["Second.read", "Service.load"]),
      ],
    });

    expect(rendered).toContain("n0 --> n1");
    expect(rendered).toContain("n2 --> n1");
  });

  it("draws a repeated call between the same pair once", () => {
    const rendered = service.renderStacks({
      stacks: [stack(["A.read", "B.load"]), stack(["A.read", "B.load"])],
    });

    expect(rendered.match(/n0 --> n1/g)).toHaveLength(1);
  });

  it("draws no edge from a self-recursive frame to itself", () => {
    // A frame repeated back to back is the same node, and mermaid draws a
    // self-loop as a stray circle that says nothing the label does not.
    const rendered = service.renderStacks({
      stacks: [
        { frames: [frame("Service.recurse"), frame("Service.recurse")] },
      ],
    });

    expect(rendered).not.toContain("n0 --> n0");
  });

  // 🏷️ Labels

  it("marks a frame that recurses", () => {
    const rendered = service.renderStacks({
      stacks: [{ frames: [frame("Service.recurse", { isCycle: true })] }],
    });

    expect(rendered).toContain('n0(["Service.recurse (cycle)"])');
  });

  it("escapes what mermaid would read as syntax in a label", () => {
    // A quote would end the label and leave the rest as broken syntax, which
    // fails the whole diagram rather than the one node.
    const rendered = service.renderStacks({
      stacks: [stack(['Service.read<"T">'])],
    });

    expect(rendered).toContain('n0(["Service.read#lt;#quot;T#quot;#gt;"])');
  });

  // 📏 The node limit

  it("stops taking stacks at the node limit and says how many it left", () => {
    const stacks = Array.from({ length: 40 }, (_, index) =>
      stack(
        Array.from(
          { length: 10 },
          (__, depth) => `Group${String(index)}.step${String(depth)}`,
        ),
      ),
    );

    const rendered = service.renderStacks({ stacks });

    expect(rendered).toContain("further call stacks are not drawn");
    expect(rendered.match(/^ {2}n\d+[[(]/gm)?.length).toBeLessThanOrEqual(
      MAXIMUM_DIAGRAM_NODES,
    );
  });

  it("draws no edge into a callable it left out", () => {
    // Whole stacks are dropped rather than trimmed, so a dangling edge is a
    // thing the diagram can never contain.
    const stacks = Array.from({ length: 40 }, (_, index) =>
      stack(
        Array.from(
          { length: 10 },
          (__, depth) => `Group${String(index)}.step${String(depth)}`,
        ),
      ),
    );

    const rendered = service.renderStacks({ stacks });
    const declared = new Set(
      [...rendered.matchAll(/^ {2}(n\d+)[[(]/gm)].map((match) => match[1]),
    );
    const referenced = [...rendered.matchAll(/^ {2}(n\d+) --> (n\d+)$/gm)];

    expect(
      referenced.every(
        (edge) => declared.has(edge[1]) && declared.has(edge[2]),
      ),
    ).toBe(true);
  });

  it("draws the stacks it was given first, which are the deepest", () => {
    const stacks = Array.from({ length: 40 }, (_, index) =>
      stack(
        Array.from(
          { length: 10 },
          (__, depth) => `Group${String(index)}.step${String(depth)}`,
        ),
      ),
    );

    expect(service.renderStacks({ stacks })).toContain("Group0.step0");
  });
});
