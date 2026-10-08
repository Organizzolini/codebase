import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { SqlCommentsService } from "./sql-comments.service";

describe(SqlCommentsService, () => {
  let service: SqlCommentsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [SqlCommentsService],
    }).compile();

    service = await module.resolve(SqlCommentsService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("reads a line comment's line, prose, and source", () => {
    expect(service.read("-- a note\nSELECT 1;\n")).toStrictEqual([
      {
        line: 1,
        ownLine: true,
        prose: " a note",
        source: "-- a note",
      },
    ]);
  });

  it("reads a block comment spanning several lines as one token", () => {
    expect(service.read("/* line one\nline two */\nSELECT 1;\n")).toStrictEqual(
      [
        {
          line: 1,
          ownLine: true,
          prose: " line one\nline two ",
          source: "/* line one\nline two */",
        },
      ],
    );
  });

  it("marks a comment following a statement as not starting its own line", () => {
    const [token] = service.read("SELECT 1; -- trailing\n");

    expect(token?.ownLine).toBe(false);
  });

  it("marks an indented comment as starting its own line", () => {
    const [token] = service.read("  -- indented\n");

    expect(token?.ownLine).toBe(true);
  });

  it("never measures a `--` found inside a block comment twice", () => {
    const tokens = service.read("/* see -- below */\nSELECT 1;\n");

    expect(tokens).toHaveLength(1);
    expect(tokens[0]?.source).toBe("/* see -- below */");
  });

  it("reads a comment in the order it appears when both syntaxes are used", () => {
    const tokens = service.read("/* block */\n-- line\nSELECT 1;\n");

    expect(tokens.map((token) => token.line)).toStrictEqual([1, 2]);
  });

  it("finds nothing in a script with no comments", () => {
    expect(service.read("SELECT 1;\n")).toStrictEqual([]);
  });

  it("ignores an unclosed block comment rather than reading to end of file", () => {
    expect(service.read("/* never closed\nSELECT 1;\n")).toStrictEqual([]);
  });
});
