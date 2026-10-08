import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { TypescriptCommentsService } from "./typescript-comments.service";

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

  it("reads a `//` comment's line, prose, and source", () => {
    expect(service.read("const value = 1;\n// a note\n", "a.ts")).toStrictEqual(
      [
        {
          line: 2,
          ownLine: true,
          prose: " a note",
          source: "// a note",
        },
      ],
    );
  });

  it("reads a plain block comment spanning several lines as one token", () => {
    expect(service.read("/* line one\nline two */\n", "a.ts")).toStrictEqual([
      {
        line: 1,
        ownLine: true,
        prose: " line one\nline two ",
        source: "/* line one\nline two */",
      },
    ]);
  });

  it("marks a comment following code as not starting its own line", () => {
    const [token] = service.read("const value = 1; // trailing\n", "a.ts");

    expect(token?.ownLine).toBe(false);
  });

  it("marks an indented comment as starting its own line", () => {
    const [token] = service.read("  // indented\n", "a.ts");

    expect(token?.ownLine).toBe(true);
  });

  it("never reads a `//` inside a string as a comment", () => {
    expect(
      service.read('const url = "https://example.com";\n', "a.ts"),
    ).toStrictEqual([]);
  });

  it("never reads a `//` inside a template literal as a comment", () => {
    expect(
      service.read("const url = `https://${host}`;\n", "a.ts"),
    ).toStrictEqual([]);
  });

  it("skips a JSDoc block, which is measured elsewhere", () => {
    expect(
      service.read(
        "/**\n * Documents a function.\n */\nfunction run() {}\n",
        "a.ts",
      ),
    ).toStrictEqual([]);
  });

  it("finds nothing in a file with no comments", () => {
    expect(service.read("const value = 1;\n", "a.ts")).toStrictEqual([]);
  });

  it("reads a comment sitting after the last statement in the file", () => {
    expect(
      service.read("const value = 1;\n// trailing note\n", "a.ts"),
    ).toStrictEqual([
      {
        line: 2,
        ownLine: true,
        prose: " trailing note",
        source: "// trailing note",
      },
    ]);
  });

  it("reads every comment even where a bare scanner would lose its place", () => {
    // A bare `ts.createScanner` cannot tell a `/` that divides from one that
    // opens a regular expression without the parser's own context, and a
    // division early in a file can make it misread everything after as
    // trivia inside a regular expression it never actually closes — silently
    // dropping every real comment that follows. Parsing for real is what a
    // reader has to do to avoid that, which this asserts against a file
    // carrying exactly that shape: a division, then two ordinary comments.
    const content = [
      "const ratio = a / b;",
      "// first note",
      "const other = c / d;",
      "// second note",
      "",
    ].join("\n");

    expect(
      service.read(content, "a.ts").map((token) => token.line),
    ).toStrictEqual([2, 4]);
  });

  it("reads a `.js` file's comments the same way", () => {
    expect(
      service
        .read("const value = 1;\n// a note\n", "a.js")
        .map((token) => token.line),
    ).toStrictEqual([2]);
  });

  it("parses a `.jsx` file with JSX syntax enabled", () => {
    const content = "const element = <div />;\n// a note\n";

    expect(
      service.read(content, "a.jsx").map((token) => token.line),
    ).toStrictEqual([2]);
  });
});
