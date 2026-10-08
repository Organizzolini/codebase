import { Test } from "@nestjs/testing";
import { createSourceFile, ScriptKind, ScriptTarget } from "typescript";
import { beforeAll, describe, expect, it } from "vitest";

import { TypescriptCommentsService } from "./typescript-comments.service";

import type { SourceFile } from "typescript";

/** The section-marker layout every generated service is meant to carry. */
const SECTIONED_SERVICE = `import { Injectable } from "@nestjs/common";

/**
 * TODO: Document the x service.
 */
@Injectable()
export class XService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

}
`;

function parse(content: string): SourceFile {
  return createSourceFile(
    "x.service.ts",
    content,
    ScriptTarget.Latest,
    true,
    ScriptKind.TS,
  );
}

describe(TypescriptCommentsService, () => {
  let service: TypescriptCommentsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [TypescriptCommentsService],
    }).compile();

    service = await module.resolve(TypescriptCommentsService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("extractComments", () => {
    it("finds every section marker, including those bordering no AST node", () => {
      expect(
        service.extractComments(parse(SECTIONED_SERVICE)).map((c) => c.text),
      ).toStrictEqual([
        "/**\n * TODO: Document the x service.\n */",
        "// 🏗 Dependency Injection",
        "// 🔐 Private Fields",
        "// 🔑 Public Fields",
        "// 🔏 Private Methods",
        "// 🌎 Public Methods",
      ]);
    });

    it("returns comments in source order", () => {
      const positions = service
        .extractComments(parse(SECTIONED_SERVICE))
        .map((comment) => comment.position);

      expect(positions).toStrictEqual([...positions].toSorted((a, b) => a - b));
    });

    it("finds a comment in an otherwise empty class body", () => {
      expect(
        service
          .extractComments(parse("class A {\n  // marker\n}\n"))
          .map((c) => {
            return c.text;
          }),
      ).toStrictEqual(["// marker"]);
    });

    it("finds no comments in a file that has none", () => {
      expect(service.extractComments(parse("const x = 1;\n"))).toStrictEqual(
        [],
      );
    });
  });

  describe("compareComments", () => {
    it("accepts an identical layout", () => {
      expect(
        service.compareComments({
          instanceSourceFile: parse(SECTIONED_SERVICE),
          templateSourceFile: parse(SECTIONED_SERVICE),
        }).missingComments,
      ).toStrictEqual([]);
    });

    it("reports a marker that is absent", () => {
      const missing = service.compareComments({
        instanceSourceFile: parse(
          SECTIONED_SERVICE.replace("  // 🔏 Private Methods\n\n", ""),
        ),
        templateSourceFile: parse(SECTIONED_SERVICE),
      });

      expect(
        missing.missingComments.map((comment) => comment.text),
      ).toStrictEqual(["// 🔏 Private Methods"]);
    });

    it("reports markers that are present but out of order", () => {
      const scrambled = `export class XService {
  // 🌎 Public Methods

  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods
}
`;

      expect(
        service.compareComments({
          instanceSourceFile: parse(scrambled),
          templateSourceFile: parse(SECTIONED_SERVICE),
        }).missingComments.length,
      ).toBeGreaterThan(0);
    });

    it("accepts any comment where the template says TODO", () => {
      expect(
        service.compareComments({
          instanceSourceFile: parse("/** Owns widgets. */\nclass A {}\n"),
          templateSourceFile: parse("/** TODO: Document it. */\nclass A {}\n"),
        }).missingComments,
      ).toStrictEqual([]);
    });
  });
});
