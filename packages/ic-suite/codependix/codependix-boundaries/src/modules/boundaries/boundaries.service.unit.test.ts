import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { BoundariesService } from "./boundaries.service";
import { BoundaryCyclesService } from "./boundary-cycles.service";
import { BoundarySelectorService } from "./boundary-selector.service";

import type { BoundaryGraph, BoundaryNode } from "./boundaries.types";
import type { CodependixBoundaryRule } from "@codependix/configuration";

/**
 * Builds a project-level graph from `"a>b"` shorthand.
 *
 * Each default node is its own project, as every node in a real Nx-level
 * graph is — see `BoundaryGraphService.buildNxGraph`.
 */
function buildGraph(args: {
  edges: string[];
  nodes?: BoundaryNode[];
}): BoundaryGraph {
  const edges = args.edges.map((entry) => {
    const [source = "", target = ""] = entry.split(">");

    return { source, target };
  });
  const named = new Set(edges.flatMap((edge) => [edge.source, edge.target]));

  return {
    edges,
    level: "nxProjects",
    nodes:
      args.nodes ?? [...named].toSorted().map((id) => ({ id, project: id })),
    scope: "workspace",
  };
}

describe(BoundariesService, () => {
  let service: BoundariesService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        BoundariesService,
        BoundaryCyclesService,
        BoundarySelectorService,
      ],
    }).compile();

    service = await module.resolve(BoundariesService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("reports nothing for a graph with no edges", () => {
    const rule: CodependixBoundaryRule = {
      from: { id: ["**"] },
      kind: "forbid",
      name: "no-edges",
      to: { id: ["**"] },
    };

    expect(
      service.evaluate({ graph: buildGraph({ edges: [] }), rules: [rule] }),
    ).toStrictEqual([]);
  });

  it("reports nothing when no rule is declared", () => {
    expect(
      service.evaluate({ graph: buildGraph({ edges: ["a>b"] }), rules: [] }),
    ).toStrictEqual([]);
  });

  it("reports the edge a forbid rule condemns", () => {
    const violations = service.evaluate({
      graph: buildGraph({ edges: ["a>b", "b>c"] }),
      rules: [
        {
          from: { id: ["a"] },
          kind: "forbid",
          name: "a-is-a-leaf",
          to: { id: ["b"] },
        },
      ],
    });

    expect(violations).toStrictEqual([
      {
        cycle: undefined,
        level: "nxProjects",
        message: "a-is-a-leaf: a must not depend on b.",
        projects: ["a"],
        rule: "a-is-a-leaf",
        scope: "workspace",
        source: "a",
        target: "b",
      },
    ]);
  });

  it("appends the rule's own message to the generated one", () => {
    const violations = service.evaluate({
      graph: buildGraph({ edges: ["a>b"] }),
      rules: [
        {
          from: { id: ["a"] },
          kind: "forbid",
          message: "a is a leaf and must stay one.",
          name: "a-is-a-leaf",
          to: { id: ["b"] },
        },
      ],
    });

    expect(violations[0]?.message).toBe(
      "a-is-a-leaf: a must not depend on b. a is a leaf and must stay one.",
    );
  });

  it("reports an edge leaving the surface an allow rule permits", () => {
    const violations = service.evaluate({
      graph: buildGraph({ edges: ["a>b", "a>c"] }),
      rules: [
        {
          from: { id: ["a"] },
          kind: "allow",
          name: "a-reaches-b-only",
          to: { id: ["b"] },
        },
      ],
    });

    expect(violations.map((violation) => violation.target)).toStrictEqual([
      "c",
    ]);
    expect(violations[0]?.message).toBe(
      "a-reaches-b-only: a may not depend on c, which the rule's allowed targets do not cover.",
    );
  });

  it("appends an allow rule's own message to the generated one", () => {
    const violations = service.evaluate({
      graph: buildGraph({ edges: ["a>c"] }),
      rules: [
        {
          from: { id: ["a"] },
          kind: "allow",
          message: "a reaches b and nothing else.",
          name: "a-reaches-b-only",
          to: { id: ["b"] },
        },
      ],
    });

    expect(violations[0]?.message).toBe(
      "a-reaches-b-only: a may not depend on c, which the rule's allowed targets do not cover. a reaches b and nothing else.",
    );
  });

  it("appends an acyclic rule's own message to the generated one", () => {
    const violations = service.evaluate({
      graph: buildGraph({ edges: ["a>b", "b>a"] }),
      rules: [
        { kind: "acyclic", message: "a and b are tangled.", name: "no-cycles" },
      ],
    });

    expect(violations[0]?.message).toBe(
      "no-cycles: a → b → a is a cycle. a and b are tangled.",
    );
  });

  it("reports nothing for a rule whose from selector matches no node", () => {
    expect(
      service.evaluate({
        graph: buildGraph({ edges: ["a>b"] }),
        rules: [
          {
            from: { id: ["nowhere"] },
            kind: "forbid",
            name: "unmatched",
            to: { id: ["**"] },
          },
        ],
      }),
    ).toStrictEqual([]);
  });

  it("reports nothing for a forbid rule naming a node that does not exist", () => {
    expect(
      service.evaluate({
        graph: buildGraph({ edges: ["a>b"] }),
        rules: [
          {
            from: { id: ["a"] },
            kind: "forbid",
            name: "absent-target",
            to: { id: ["ghost"] },
          },
        ],
      }),
    ).toStrictEqual([]);
  });

  it("judges an edge naming an unlisted node on its identifier alone", () => {
    const violations = service.evaluate({
      graph: {
        edges: [{ source: "a", target: "ghost" }],
        level: "nxProjects",
        nodes: [{ id: "a" }],
        scope: "workspace",
      },
      rules: [
        {
          from: { id: ["a"] },
          kind: "forbid",
          name: "no-ghosts",
          to: { id: ["ghost"] },
        },
      ],
    });

    expect(violations).toHaveLength(1);
  });

  it("reports nothing for a path rule against an unlisted endpoint", () => {
    // The safer of the two wrong answers, and unreachable from any real
    // builder: an import graph only draws edges between files it lists.
    expect(
      service.evaluate({
        graph: {
          edges: [
            { source: "src/a.types.ts", target: "src/elsewhere.service.ts" },
          ],
          level: "typescript",
          nodes: [
            {
              id: "src/a.types.ts",
              path: "src/a.types.ts",
              project: "widgets",
            },
          ],
          scope: "widgets",
        },
        rules: [
          {
            from: { path: ["**/*.types.ts"] },
            kind: "forbid",
            name: "types-files-do-not-reach-services",
            to: { path: ["**/*.service.ts"] },
          },
        ],
      }),
    ).toStrictEqual([]);
  });

  it("judges only explicit edges when a rule asks for them", () => {
    // What an `@nx/enforce-module-boundaries` depConstraint actually sees: it
    // reads import statements, so an `implicitDependencies` entry is
    // invisible to it.
    const graph: BoundaryGraph = {
      edges: [
        { implicit: false, source: "a", target: "b" },
        { implicit: true, source: "a", target: "c" },
      ],
      level: "nxProjects",
      nodes: [{ id: "a" }, { id: "b" }, { id: "c" }],
      scope: "workspace",
    };
    const rule: CodependixBoundaryRule = {
      edges: { implicit: false },
      from: { id: ["a"] },
      kind: "allow",
      name: "a-reaches-b-only",
      to: { id: ["b"] },
    };

    expect(service.evaluate({ graph, rules: [rule] })).toStrictEqual([]);
    expect(
      service
        .evaluate({
          graph,
          rules: [
            { ...rule, edges: { implicit: true }, name: "implicit-only" },
          ],
        })
        .map((violation) => violation.target),
    ).toStrictEqual(["c"]);
    expect(
      service
        .evaluate({ graph, rules: [{ ...rule, edges: undefined }] })
        .map((violation) => violation.target),
    ).toStrictEqual(["c"]);
  });

  it("reads an edge with no implicit flag as an explicit one", () => {
    expect(
      service.evaluate({
        graph: buildGraph({ edges: ["a>b"] }),
        rules: [
          {
            edges: { implicit: true },
            from: { id: ["a"] },
            kind: "forbid",
            name: "implicit-only",
            to: { id: ["b"] },
          },
        ],
      }),
    ).toStrictEqual([]);
  });

  it("selects on tags a node carries", () => {
    const violations = service.evaluate({
      graph: buildGraph({
        edges: ["application>other-application"],
        nodes: [
          { id: "application", tags: ["type:application"] },
          { id: "other-application", tags: ["type:application"] },
        ],
      }),
      rules: [
        {
          from: { tags: ["type:application"] },
          kind: "forbid",
          name: "applications-are-leaves",
          to: { tags: ["type:application"] },
        },
      ],
    });

    expect(violations).toHaveLength(1);
  });

  it("reports a cycle, its path, and its closing edge", () => {
    const violations = service.evaluate({
      graph: buildGraph({ edges: ["a>b", "b>a"] }),
      rules: [{ kind: "acyclic", name: "no-cycles" }],
    });

    expect(violations).toStrictEqual([
      {
        cycle: ["a", "b", "a"],
        level: "nxProjects",
        message: "no-cycles: a → b → a is a cycle.",
        projects: ["a", "b"],
        rule: "no-cycles",
        scope: "workspace",
        source: "b",
        target: "a",
      },
    ]);
  });

  it("scopes an acyclic rule to the nodes it selects", () => {
    expect(
      service.evaluate({
        graph: buildGraph({ edges: ["a>b", "b>a"] }),
        rules: [{ kind: "acyclic", name: "no-cycles", nodes: { id: ["a"] } }],
      }),
    ).toStrictEqual([]);
  });

  it("reports every rule's findings in the order they were declared", () => {
    const violations = service.evaluate({
      graph: buildGraph({ edges: ["a>b", "b>a"] }),
      rules: [
        {
          from: { id: ["b"] },
          kind: "forbid",
          name: "second-rule",
          to: { id: ["a"] },
        },
        { kind: "acyclic", name: "first-rule" },
      ],
    });

    expect(violations.map((violation) => violation.rule)).toStrictEqual([
      "second-rule",
      "first-rule",
    ]);
  });

  // 💳 Charging

  describe("charging", () => {
    /** A file-level graph: every node belongs to the graph's own project. */
    const FILE_GRAPH: BoundaryGraph = {
      edges: [
        { source: "src/a.ts", target: "src/b.ts" },
        { source: "src/b.ts", target: "src/a.ts" },
      ],
      level: "typescript",
      nodes: [
        { id: "src/a.ts", path: "src/a.ts", project: "widgets" },
        { id: "src/b.ts", path: "src/b.ts", project: "widgets" },
      ],
      scope: "widgets",
    };

    // D4: the edge belongs to the project that wrote the dependency.
    it("charges a forbidden edge to its source's project alone", () => {
      const violations = service.evaluate({
        graph: buildGraph({ edges: ["a>b"] }),
        rules: [
          {
            from: { id: ["a"] },
            kind: "forbid",
            name: "a-is-a-leaf",
            to: { id: ["b"] },
          },
        ],
      });

      expect(violations.map((violation) => violation.projects)).toStrictEqual([
        ["a"],
      ]);
    });

    it("charges an edge no allow rule covers to its source's project", () => {
      const violations = service.evaluate({
        graph: buildGraph({ edges: ["c>a"] }),
        rules: [
          {
            from: { id: ["c"] },
            kind: "allow",
            name: "c-reaches-nothing",
            to: { id: [] },
          },
        ],
      });

      expect(violations.map((violation) => violation.projects)).toStrictEqual([
        ["c"],
      ]);
    });

    // D5: every project on the cycle is part of the problem.
    it("charges a cross-project cycle to every project on it, once each", () => {
      const violations = service.evaluate({
        graph: buildGraph({ edges: ["a>b", "b>c", "c>a"] }),
        rules: [{ kind: "acyclic", name: "no-cycles" }],
      });

      expect(violations.map((violation) => violation.projects)).toStrictEqual([
        ["a", "b", "c"],
      ]);
    });

    it("charges a file-level cycle to the project whose files form it", () => {
      const violations = service.evaluate({
        graph: FILE_GRAPH,
        rules: [{ kind: "acyclic", name: "no-cycles" }],
      });

      expect(violations.map((violation) => violation.projects)).toStrictEqual([
        ["widgets"],
      ]);
    });

    it("charges an endpoint the graph does not list to the graph's scope", () => {
      const violations = service.evaluate({
        graph: { ...FILE_GRAPH, nodes: [] },
        rules: [
          {
            from: { id: ["src/a.ts"] },
            kind: "forbid",
            name: "a-is-a-leaf",
            to: { id: ["src/b.ts"] },
          },
        ],
      });

      expect(violations.map((violation) => violation.projects)).toStrictEqual([
        ["widgets"],
      ]);
    });
  });
});
