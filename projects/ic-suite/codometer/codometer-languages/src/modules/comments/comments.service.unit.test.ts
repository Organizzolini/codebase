import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CommentsService } from "./comments.service";
import { HashCommentsService } from "./hash-comments.service";

import type { CommentBudget } from "./comments.types";

describe(CommentsService, () => {
  let service: CommentsService;
  let hashComments: HashCommentsService;

  /** The budget a measurement is judged by, with one field varied. */
  function budget(overrides: Partial<CommentBudget> = {}): CommentBudget {
    return {
      maximumCharacters: undefined,
      maximumLines: undefined,
      maximumWords: 5,
      severity: "fail",
      ...overrides,
    };
  }

  /** Measures a `#`-commented document under the given budget. */
  function measure(
    content: string,
    overrides: Partial<CommentBudget> = {},
  ): ReturnType<CommentsService["measure"]> {
    return service.measure({
      comments: budget(overrides),
      filePath: "sample.sh",
      tokens: hashComments.read(content),
    });
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [CommentsService, HashCommentsService],
    }).compile();

    service = await module.resolve(CommentsService);
    hashComments = await module.resolve(HashCommentsService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("measures a file with no comments as no blocks", () => {
    expect(measure("echo hello\n")).toStrictEqual([]);
  });

  it("joins a run of adjacent lines into one block", () => {
    const [block, ...rest] = measure("# one two\n# three four\necho hi\n");

    expect(rest).toStrictEqual([]);
    expect(block?.measured).toBe(4);
    expect(block?.line).toBe(1);
  });

  it("splits a run on a blank line", () => {
    const measurements = measure("# one two\n\n# three four\necho hi\n");

    expect(measurements.map((entry) => entry.measured)).toStrictEqual([2, 2]);
    expect(measurements.map((entry) => entry.line)).toStrictEqual([1, 3]);
  });

  it("keeps a trailing comment out of the block above it", () => {
    const measurements = measure("# one two\necho hi # three four five\n");

    expect(measurements.map((entry) => entry.measured)).toStrictEqual([2, 3]);
  });

  it("reports a block over the maximum as breached", () => {
    const [block] = measure("# one two three four five six\n");

    expect(block?.breached).toBe(true);
    expect(block?.measured).toBe(6);
  });

  it("reports a block at the maximum as within it", () => {
    const [block] = measure("# one two three four five\n");

    expect(block?.breached).toBe(false);
  });

  it("reports one block once per declared maximum", () => {
    const measurements = measure("# one two three\n# four five\n", {
      maximumCharacters: 100,
      maximumLines: 1,
      maximumWords: 4,
    });

    // Three budgets, three entries — they are not alternatives, so a block
    // that fits one and breaks another says so about each.
    expect(
      measurements.map((entry) => [entry.unit, entry.measured, entry.breached]),
    ).toStrictEqual([
      ["characters", 27, false],
      ["lines", 2, true],
      ["words", 5, true],
    ]);
  });

  it("measures nothing when no maximum is declared", () => {
    expect(
      measure("# one two three\n", { maximumWords: undefined }),
    ).toStrictEqual([]);
  });

  it("carries the file, kind, and severity a report renders", () => {
    const [block] = measure("# one two\n", { severity: "warn" });

    expect(block).toMatchObject({
      file: "sample.sh",
      kind: "comment",
      severity: "warn",
      unit: "words",
    });
  });

  it("carries the block's opening words as its declaration", () => {
    const [block] = measure("# one two three\n");

    expect(block?.declaration).toBe("one two three");
  });

  it("truncates a long declaration rather than carrying the whole block", () => {
    const [block] = measure(`# ${"word ".repeat(40)}\n`, {
      maximumWords: 500,
    });

    expect(block?.declaration).toHaveLength(49);
    expect(block?.declaration.endsWith("…")).toBe(true);
  });
});
