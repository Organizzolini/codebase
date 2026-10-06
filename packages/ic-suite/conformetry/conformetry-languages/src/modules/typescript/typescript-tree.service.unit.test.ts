import { createPlaceholderValue } from "@conformetry/configuration";
import { Test } from "@nestjs/testing";
import ts from "typescript";
import { beforeAll, describe, expect, it } from "vitest";

import { ScoringService } from "../scoring/scoring.service";

import { TypescriptNodesService } from "./typescript-nodes.service";
import { TypescriptTreeService } from "./typescript-tree.service";

/** Parses source into a comparable source-file node. */
function parse(source: string): ts.SourceFile {
  return ts.createSourceFile("test.ts", source, ts.ScriptTarget.Latest, true);
}

describe(TypescriptTreeService, () => {
  let service: TypescriptTreeService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ScoringService,
        TypescriptNodesService,
        TypescriptTreeService,
      ],
    }).compile();

    service = await module.resolve(TypescriptTreeService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("compareTree", () => {
    it("reports nothing when the instance has everything the template declares", () => {
      expect(
        service.compareTree({
          instanceNode: parse('import { a } from "alpha";\nclass Widget {}\n'),
          templateNode: parse('import { a } from "alpha";\n'),
        }).differences,
      ).toStrictEqual([]);
    });

    it("reports an import the instance lacks", () => {
      const { differences } = service.compareTree({
        instanceNode: parse("class Widget {}\n"),
        templateNode: parse('import { a } from "alpha";\n'),
      });

      expect(differences).toHaveLength(1);
      expect(differences[0]?.kindLabel).toBe("ImportDeclaration");
      expect(differences[0]?.nodeKey).toContain("alpha");
    });

    it("reports a class member the instance lacks", () => {
      const { differences } = service.compareTree({
        instanceNode: parse("class Widget {}\n"),
        templateNode: parse("class Widget { alpha() {} }\n"),
      });

      expect(
        differences.some((error) => error.nodeKey?.includes("alpha")),
      ).toBe(true);
    });

    it("weighs a missing class by its whole subtree", () => {
      const leaf = service.compareTree({
        instanceNode: parse("class Widget {}\n"),
        templateNode: parse('import { a } from "alpha";\nclass Widget {}\n'),
      });
      const subtree = service.compareTree({
        instanceNode: parse("const nothing = 1;\n"),
        templateNode: parse(
          "class Widget { alpha() {} beta() {} gamma() {} }\n",
        ),
      });

      // Both report exactly one finding. Without subtree weighting a deleted
      // class would cost the same as a deleted import, which is the whole
      // reason the weight exists.
      expect(leaf.differences).toHaveLength(1);
      expect(subtree.differences).toHaveLength(1);
      expect(subtree.differences[0]?.weight).toBeGreaterThan(
        leaf.differences[0]?.weight ?? 0,
      );
    });

    it("counts a conforming tree's requirements toward the total", () => {
      const comparison = service.compareTree({
        instanceNode: parse("class Widget { alpha() {} }\n"),
        templateNode: parse("class Widget { alpha() {} }\n"),
      });

      expect(comparison.differences).toStrictEqual([]);
      expect(comparison.totalWeight).toBeGreaterThan(1);
    });

    it("charges a missing subtree the same whether present or absent", () => {
      const template = "class Widget { alpha() {} beta() {} }\n";
      const present = service.compareTree({
        instanceNode: parse(template),
        templateNode: parse(template),
      });
      const absent = service.compareTree({
        instanceNode: parse("const nothing = 1;\n"),
        templateNode: parse(template),
      });

      // The denominator must not move with the instance: a template asks for
      // the same amount whether or not the instance supplied any of it.
      expect(absent.totalWeight).toBe(present.totalWeight);
      expect(absent.differences[0]?.weight).toBe(present.totalWeight - 1);
    });

    it("ignores extra members the template does not declare", () => {
      expect(
        service.compareTree({
          instanceNode: parse("class Widget { alpha() {} beta() {} }\n"),
          templateNode: parse("class Widget { alpha() {} }\n"),
        }).differences,
      ).toStrictEqual([]);
    });

    it("prefers a later candidate that matches the template more closely", () => {
      // Two keyless blocks are both matched by kind alone. The first is a
      // worse match than the second, so the reduce must replace its running
      // "best" rather than keep the one it started with.
      expect(
        service.compareTree({
          instanceNode: parse("{}\n{\n  start();\n}\n"),
          templateNode: parse("{\n  start();\n}\n"),
        }).differences,
      ).toStrictEqual([]);
    });

    it("keeps the earlier candidate when two equally match a keyless node", () => {
      // Two identical if-statements have no key of their own, so both are
      // matched by kind alone and both satisfy the template perfectly — a
      // tie the reduce must resolve without discarding the earlier one.
      const statement = "if (ready) {\n  start();\n}\n";

      expect(
        service.compareTree({
          instanceNode: parse(statement + statement),
          templateNode: parse(statement),
        }).differences,
      ).toStrictEqual([]);
    });
  });

  describe("compareTree with placeholder values", () => {
    const value = createPlaceholderValue();

    it("captures a string literal a placeholder value stands in for", () => {
      const comparison = service.compareTree({
        instanceNode: parse(
          'export const Route = createFileRoute("/word/$id")({});\n',
        ),
        templateNode: parse(
          `export const Route = createFileRoute("${value}")({});\n`,
        ),
      });

      expect(comparison.differences).toStrictEqual([]);
      expect(comparison.captures).toStrictEqual({ [value]: "/word/$id" });
    });

    it("captures part of an identifier, matching the rest exactly", () => {
      const comparison = service.compareTree({
        instanceNode: parse("class GenerateCommand {}\n"),
        templateNode: parse(`class ${value}Command {}\n`),
      });

      expect(comparison.differences).toStrictEqual([]);
      expect(comparison.captures).toStrictEqual({ [value]: "Generate" });
    });

    it("captures a value inside a larger string", () => {
      const comparison = service.compareTree({
        instanceNode: parse('const label = "prefix-alpha-suffix";\n'),
        templateNode: parse(`const label = "prefix-${value}-suffix";\n`),
      });

      expect(comparison.captures).toStrictEqual({ [value]: "alpha" });
    });

    it("captures nothing and reports the node when nothing aligns", () => {
      const comparison = service.compareTree({
        instanceNode: parse("class Widget {}\n"),
        templateNode: parse(`class ${value}Command {}\n`),
      });

      expect(comparison.differences).toHaveLength(1);
      expect(comparison.captures ?? {}).toStrictEqual({});
    });
  });
});
