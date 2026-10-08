import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { YamlCommentsService } from "./yaml-comments.service";

describe(YamlCommentsService, () => {
  let service: YamlCommentsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [YamlCommentsService],
    }).compile();

    service = await module.resolve(YamlCommentsService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("does not read a `#` inside a quoted scalar as a comment", () => {
    // The whole reason YAML has a reader of its own rather than using the
    // line scanner every other `#` language uses.
    expect(service.read('key: "value # not a comment"\n')).toStrictEqual([]);
  });

  it("reads comments in the order they appear, with their lines", () => {
    const tokens = service.read(
      ["# one", "# two", "", "# four", "key: value # trailing"].join("\n"),
    );

    expect(tokens.map((token) => token.line)).toStrictEqual([1, 2, 4, 5]);
  });

  it("marks a comment trailing a value as not starting its own line", () => {
    const tokens = service.read("key: value # trailing\n");

    expect(tokens.map((token) => token.ownLine)).toStrictEqual([false]);
  });

  it("strips the marker from a comment's prose", () => {
    const [token] = service.read("#   padded\n");

    expect(token?.prose).toBe("  padded");
    expect(token?.source).toBe("#   padded");
  });
});
