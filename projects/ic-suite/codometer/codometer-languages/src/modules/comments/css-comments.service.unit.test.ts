import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CssCommentsService } from "./css-comments.service";

describe(CssCommentsService, () => {
  let service: CssCommentsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [CssCommentsService],
    }).compile();

    service = await module.resolve(CssCommentsService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("reads a comment's line, prose, and source", () => {
    expect(
      service.read(":root {\n}\n\n/* a note */\n.order {\n}\n"),
    ).toStrictEqual([
      {
        line: 4,
        ownLine: true,
        prose: " a note ",
        source: "/* a note */",
      },
    ]);
  });

  it("marks a comment following a declaration as not starting its own line", () => {
    const [token] = service.read(".order {\n  color: red; /* trailing */\n}\n");

    expect(token?.ownLine).toBe(false);
  });

  it("marks an indented comment as starting its own line", () => {
    const [token] = service.read("  /* indented */\n");

    expect(token?.ownLine).toBe(true);
  });

  it("keeps a multi-line comment as one token, embedded newlines and all", () => {
    const tokens = service.read("/* line one\nline two */\n.order {}\n");

    expect(tokens).toStrictEqual([
      {
        line: 1,
        ownLine: true,
        prose: " line one\nline two ",
        source: "/* line one\nline two */",
      },
    ]);
  });

  it("finds nothing in a stylesheet with no comments", () => {
    expect(service.read(".order {\n  color: red;\n}\n")).toStrictEqual([]);
  });

  it("finds nothing in a stylesheet it cannot parse", () => {
    expect(service.read("{{{ not css")).toStrictEqual([]);
  });
});
