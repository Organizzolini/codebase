import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { HashCommentsService } from "./hash-comments.service";

describe(HashCommentsService, () => {
  let service: HashCommentsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [HashCommentsService],
    }).compile();

    service = await module.resolve(HashCommentsService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("reads a comment's line, prose, and source", () => {
    expect(service.read("key = 1\n#  spaced out\n")).toStrictEqual([
      {
        line: 2,
        ownLine: true,
        prose: " spaced out",
        source: "#  spaced out",
      },
    ]);
  });

  it("marks a comment following code as not starting its own line", () => {
    const [token] = service.read("key = 1 # trailing\n");

    expect(token?.ownLine).toBe(false);
  });

  it("marks an indented comment as starting its own line", () => {
    const [token] = service.read("    # indented\n");

    expect(token?.ownLine).toBe(true);
  });

  it("reads a `#` inside a string as a comment, which it cannot tell apart", () => {
    // A documented limitation rather than an oversight: this is a line
    // scanner, and it matches how shell, TOML, and Python already count their
    // own comments. YAML is read by `YamlCommentsService` for this reason.
    expect(service.read('name = "a # b"\n')).toHaveLength(1);
  });

  it("does not read a shebang as a comment", () => {
    // `#!` on the first line is an instruction to the kernel, not prose, and
    // grouping it with the comment below would put `!/bin/sh` in the count.
    const tokens = service.read("#!/bin/sh\n# one two\necho hi\n");

    expect(tokens.map((token) => token.line)).toStrictEqual([2]);
  });

  it("reads a `#!` that is not on the first line as a comment", () => {
    expect(service.read("echo hi\n#!not-a-shebang\n")).toHaveLength(1);
  });

  it("finds nothing in a file with no comments", () => {
    expect(service.read("key = 1\nother = 2\n")).toStrictEqual([]);
  });
});
