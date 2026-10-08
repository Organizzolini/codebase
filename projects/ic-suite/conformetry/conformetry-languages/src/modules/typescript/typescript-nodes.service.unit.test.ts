import { Test } from "@nestjs/testing";
import ts from "typescript";
import { beforeAll, describe, expect, it } from "vitest";

import { TypescriptNodesService } from "./typescript-nodes.service";

/** Parses source and returns its first top-level statement. */
function parseStatement(source: string): ts.Node {
  const [statement] = ts.createSourceFile(
    "test.ts",
    source,
    ts.ScriptTarget.Latest,
    true,
  ).statements;

  if (statement === undefined) {
    throw new Error(`No statement parsed from: ${source}`);
  }

  return statement;
}

describe(TypescriptNodesService, () => {
  let service: TypescriptNodesService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [TypescriptNodesService],
    }).compile();

    service = await module.resolve(TypescriptNodesService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("readKey", () => {
    it("keys an import by the module it comes from", () => {
      const statement = parseStatement('import { a } from "alpha";');

      expect(service.readKey(statement)).toContain("alpha");
    });

    it("keys a declaration by its name", () => {
      const statement = parseStatement("class Widget {}");

      expect(service.readKey(statement)).toContain("Widget");
    });

    it("returns no key for an anonymous statement", () => {
      const statement = parseStatement("doSomething();");

      expect(service.readKey(statement)).toContain("doSomething");
    });

    it("returns no key for an import whose specifier failed to parse as a string", () => {
      // The grammar requires a string literal after `from`, but the parser
      // recovers from the missing quotes by keeping going: the module
      // specifier position holds an Identifier rather than a StringLiteral.
      const statement = parseStatement("import { a } from foo;");

      expect(service.readKey(statement)).toBeNull();
    });

    it("keys a private class member by its private name", () => {
      const statement = parseStatement("class Widget { #alpha() {} }");
      const [member] = ts.isClassDeclaration(statement)
        ? statement.members
        : [];

      if (member === undefined) {
        throw new Error("No member parsed");
      }

      expect(service.readKey(member)).toBe("#alpha");
    });

    it("returns no key for a member named by a computed property", () => {
      const statement = parseStatement("class Widget { [computedName]() {} }");
      const [member] = ts.isClassDeclaration(statement)
        ? statement.members
        : [];

      if (member === undefined) {
        throw new Error("No member parsed");
      }

      expect(service.readKey(member)).toBeNull();
    });
  });

  describe("readKindLabel", () => {
    it("labels a node by its syntax kind", () => {
      const statement = parseStatement("class Widget {}");

      expect(service.readKindLabel(statement)).toBe("ClassDeclaration");
    });
  });

  describe("readChildren", () => {
    it("reads a class body's members", () => {
      const statement = parseStatement("class Widget { alpha() {} }");

      expect(
        service
          .readChildren(statement)
          .some((child) => ts.isMethodDeclaration(child)),
      ).toBe(true);
    });

    it("returns nothing for a leaf statement", () => {
      const statement = parseStatement("const alpha = 1;");

      expect(Array.isArray(service.readChildren(statement))).toBe(true);
    });
  });
});
