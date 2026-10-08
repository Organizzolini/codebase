import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { HclCommentsService } from "./hcl-comments.service";

describe(HclCommentsService, () => {
  let service: HclCommentsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [HclCommentsService],
    }).compile();

    service = await module.resolve(HclCommentsService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("reads a `#` comment's line, prose, and source", () => {
    expect(service.read('# a note\nvariable "region" {}\n')).toStrictEqual([
      {
        line: 1,
        ownLine: true,
        prose: " a note",
        source: "# a note",
      },
    ]);
  });

  it("reads a `//` comment the same way", () => {
    expect(service.read('// a note\nvariable "region" {}\n')).toStrictEqual([
      {
        line: 1,
        ownLine: true,
        prose: " a note",
        source: "// a note",
      },
    ]);
  });

  it("reads a block comment spanning several lines as one token", () => {
    expect(service.read("/* line one\nline two */\n")).toStrictEqual([
      {
        line: 1,
        ownLine: true,
        prose: " line one\nline two ",
        source: "/* line one\nline two */",
      },
    ]);
  });

  it("marks a comment following an attribute as not starting its own line", () => {
    const [token] = service.read("type = string # trailing\n");

    expect(token?.ownLine).toBe(false);
  });

  it("marks an indented comment as starting its own line", () => {
    const [token] = service.read("  # indented\n");

    expect(token?.ownLine).toBe(true);
  });

  it("never measures a line marker found inside a block comment twice", () => {
    const tokens = service.read("/* see // and # below */\n");

    expect(tokens).toHaveLength(1);
    expect(tokens[0]?.source).toBe("/* see // and # below */");
  });

  it("reads every marker in the order it appears", () => {
    const tokens = service.read("/* block */\n# hash\n// slash\n");

    expect(tokens.map((token) => token.line)).toStrictEqual([1, 2, 3]);
  });

  it("finds nothing in a file with no comments", () => {
    expect(service.read('variable "region" {}\n')).toStrictEqual([]);
  });

  it("ignores an unclosed block comment rather than reading to end of file", () => {
    expect(
      service.read('/* never closed\nvariable "region" {}\n'),
    ).toStrictEqual([]);
  });
});
