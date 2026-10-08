import { Test } from "@nestjs/testing";
import tsCompiler from "typescript";
import { beforeAll, describe, expect, it } from "vitest";

import { CommentsService } from "../comments/comments.service";

import { DeclarationCommentsService } from "./declaration-comments.service";

import type { CommentCounter } from "../comments/comments.types";
import type { TypescriptWalkContext } from "./typescript.types";

/** Builds the walk context a measurement is taken against. */
function buildContext(
  source: string,
  commentCounters: CommentCounter[],
): { context: TypescriptWalkContext; node: tsCompiler.Node } {
  const sourceFile = tsCompiler.createSourceFile(
    "src/foo.ts",
    source,
    tsCompiler.ScriptTarget.Latest,
    true,
  );
  const [node] = sourceFile.statements;

  if (node === undefined) {
    throw new Error("Expected the source to declare at least one statement.");
  }

  return {
    context: {
      commentCounters,
      counters: [],
      filePath: "src/foo.ts",
      insideClass: false,
      sourceFile,
      stats: {
        asyncFunctions: 0,
        blockComments: 0,
        classes: 0,
        commentLines: 0,
        comments: 0,
        constants: 0,
        declarationCommentCounts: {},
        decorators: 0,
        docComments: 0,
        docTags: {},
        enums: 0,
        exported: 0,
        externalPackages: new Set(),
        functions: 0,
        genericDeclarations: 0,
        imports: 0,
        interfaces: 0,
        jsFiles: 0,
        lineComments: 0,
        lines: 0,
        methods: 0,
        symbolCounts: {},
        syncFunctions: 0,
        testFiles: 0,
        todos: 0,
        tsFiles: 0,
      },
    },
    node,
  };
}

const classCounter: CommentCounter = {
  budget: {
    maximumCharacters: undefined,
    maximumLines: 6,
    maximumWords: undefined,
    severity: "fail",
  },
  kind: "class",
  label: "class-docs",
  language: undefined,
};

describe(DeclarationCommentsService, () => {
  let service: DeclarationCommentsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [CommentsService, DeclarationCommentsService],
    }).compile();

    service = await module.resolve(DeclarationCommentsService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("returns nothing when the walk carries no comment counter", () => {
    const { context, node } = buildContext(
      `/**
        * A class.
        */
       export class Foo {}`,
      [],
    );

    expect(service.measure(node, context)).toStrictEqual([]);
  });

  it("returns nothing for a declaration with no JSDoc comment", () => {
    const { context, node } = buildContext(`export class Foo {}`, [
      classCounter,
    ]);

    expect(service.measure(node, context)).toStrictEqual([]);
  });

  it("returns nothing for a plain block comment, not a JSDoc one", () => {
    const { context, node } = buildContext(
      `/* Not a doc comment. */
       export class Foo {}`,
      [classCounter],
    );

    expect(service.measure(node, context)).toStrictEqual([]);
  });

  it("measures lines, the raw comment block's line count", () => {
    const { context, node } = buildContext(
      `/**
        * Line one.
        * Line two.
        */
       export class Foo {}`,
      [classCounter],
    );

    expect(service.measure(node, context)[0]?.measurement).toMatchObject({
      breached: false,
      kind: "class",
      measured: 4,
      unit: "lines",
    });
  });

  it("tags the measurement with the counter's own label", () => {
    const { context, node } = buildContext(
      `/**
        * Line one.
        * Line two.
        */
       export class Foo {}`,
      [classCounter],
    );

    expect(service.measure(node, context)[0]?.label).toBe("class-docs");
  });

  it("measures characters, the raw comment block's length", () => {
    const text = "/** Short. */";
    const { context, node } = buildContext(
      `${text}\n       export class Foo {}`,
      [
        {
          ...classCounter,
          budget: { ...classCounter.budget, maximumCharacters: 1 },
        },
      ],
    );

    expect(service.measure(node, context)[0]?.measurement).toMatchObject({
      measured: text.length,
      unit: "characters",
    });
  });

  it("measures words, ignoring the comment delimiters and leading asterisks", () => {
    const { context, node } = buildContext(
      `/**
        * This comment has exactly seven words total.
        */
       export class Foo {}`,
      [
        {
          ...classCounter,
          budget: {
            ...classCounter.budget,
            maximumLines: undefined,
            maximumWords: 1,
          },
        },
      ],
    );

    expect(service.measure(node, context)[0]?.measurement).toMatchObject({
      measured: 7,
      unit: "words",
    });
  });

  it("counts words on a single-line comment the same way", () => {
    const { context, node } = buildContext(
      `/** Four words right here. */
       export class Foo {}`,
      [
        {
          ...classCounter,
          budget: {
            ...classCounter.budget,
            maximumLines: undefined,
            maximumWords: 1,
          },
        },
      ],
    );

    expect(service.measure(node, context)[0]?.measurement).toMatchObject({
      measured: 4,
    });
  });

  it("marks a declaration whose measured length exceeds its own counter's limit as breached", () => {
    const { context, node } = buildContext(
      `/**
        * One.
        * Two.
        * Three.
        */
       export class Foo {}`,
      [
        {
          ...classCounter,
          budget: { ...classCounter.budget, maximumLines: 2 },
        },
      ],
    );

    expect(service.measure(node, context)[0]?.measurement).toMatchObject({
      breached: true,
      limit: 2,
    });
  });

  it("measures a declaration once per counter that names its kind", () => {
    const { context, node } = buildContext(
      `/**
        * One.
        * Two.
        * Three.
        */
       export class Foo {}`,
      [
        classCounter,
        {
          ...classCounter,
          budget: { ...classCounter.budget, maximumLines: 2 },
          label: "strict",
        },
      ],
    );

    const measurements = service.measure(node, context);

    expect(measurements).toHaveLength(2);
    expect(measurements.map((entry) => entry.label)).toStrictEqual([
      "class-docs",
      "strict",
    ]);
  });

  it("names the declaration by its own identifier", () => {
    const { context, node } = buildContext(
      `/**
        * A function.
        */
       export function greet(): void {}`,
      [{ ...classCounter, kind: "function" }],
    );

    expect(service.measure(node, context)[0]?.measurement).toMatchObject({
      declaration: "greet",
      kind: "function",
    });
  });

  it("names an anonymous declaration as such", () => {
    const { context, node } = buildContext(
      `/**
        * An anonymous function.
        */
       export default function (): void {}`,
      [{ ...classCounter, kind: "function" }],
    );

    expect(service.measure(node, context)[0]?.measurement).toMatchObject({
      declaration: "(anonymous)",
    });
  });

  it("reports the 1-indexed line the declaration itself starts on", () => {
    const { context, node } = buildContext(
      `// A leading line comment.

       /**
        * A class.
        */
       export class Foo {}`,
      [classCounter],
    );

    expect(service.measure(node, context)[0]?.measurement).toMatchObject({
      line: 6,
    });
  });

  it("returns nothing for a node kind no comment counter names", () => {
    const { context, node } = buildContext(
      `/**
        * A comment above something that is not a documentable declaration.
        */
       import "./whatever";`,
      [classCounter],
    );

    expect(service.measure(node, context)).toStrictEqual([]);
  });
});
