import {
  ConfigurationModule,
  ConfigurationService,
} from "@codometer/configuration";
import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { LoggerService } from "@codebase/logging";

import { createInputTree, removeInputTree } from "../../../testing/input-tree";

import { InputsService } from "./inputs.service";

import type { ResolvedCodometerInput } from "@codometer/configuration";

/** Builds a resolved input over the fixture tree's build directory. */
function buildInput(
  overrides: Partial<ResolvedCodometerInput> = {},
): ResolvedCodometerInput {
  return {
    analyses: ["size"],
    compression: "gzip",
    directory: ".",
    exclude: [],
    include: ["dist/**/*.js"],
    name: "compiled",
    ...overrides,
  };
}

describe(`${InputsService.name} over a real directory`, () => {
  let configurationService: ConfigurationService;
  let service: InputsService;
  let workingDirectory: string;

  /** Lists the files the given input holds in the fixture tree. */
  function matchFiles(input: ResolvedCodometerInput): string[] {
    return service.matchFiles({ input, workingDirectory });
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [ConfigurationModule],
      providers: [
        InputsService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    configurationService = await module.resolve(ConfigurationService);
    service = await module.resolve(InputsService);
    workingDirectory = createInputTree();
  });

  afterAll(() => {
    removeInputTree(workingDirectory);
  });

  it("holds every file its globs claim, sorted", () => {
    expect.hasAssertions();
    // `dist/link.js` is a link to a file and counts; `dist/loop` is a link to
    // an ancestor directory and is never entered.
    expect(matchFiles(buildInput())).toStrictEqual([
      "dist/index.js",
      "dist/link.js",
      "dist/nested/deep.js",
      "dist/nested/deep.min.js",
      "dist/vendor/bundled.js",
    ]);
  });

  it("leaves out what an exclude glob claims", () => {
    expect.hasAssertions();
    expect(
      matchFiles(buildInput({ exclude: ["dist/vendor/**"] })),
    ).not.toContain("dist/vendor/bundled.js");
  });

  // The tool this replaced applied negations in the order they were written,
  // so the same patterns rearranged could hold a different set of files. The
  // globs go through the real resolution rather than being partitioned here,
  // because partitioning them in the test is the very step an order-dependent
  // implementation would need in order to pass anyway.
  it.each([
    ["last", ["dist/**/*.js", "dist/nested/**/*.js", "!dist/**/*.min.js"]],
    ["first", ["!dist/**/*.min.js", "dist/**/*.js", "dist/nested/**/*.js"]],
    ["between", ["dist/**/*.js", "!dist/**/*.min.js", "dist/nested/**/*.js"]],
  ])("holds the same files with the negation written %s", (_, include) => {
    expect.hasAssertions();

    const input = configurationService
      .resolveConfiguration({
        format: "json",
        inputs: [{ analyses: ["size"], include, name: "compiled" }],
      })
      .inputs.find((candidate) => candidate.name === "compiled");

    expect(input && matchFiles(input)).toStrictEqual([
      "dist/index.js",
      "dist/link.js",
      "dist/nested/deep.js",
      "dist/vendor/bundled.js",
    ]);
  });

  it("leaves hidden directories alone unless a glob spells one out", () => {
    expect.hasAssertions();
    // Every glob library excludes dot files from `**`, and it is also what
    // keeps an input over the whole tree out of the git database.
    expect(matchFiles(buildInput({ include: ["**/*.js"] }))).toStrictEqual([
      "dist/index.js",
      "dist/link.js",
      "dist/nested/deep.js",
      "dist/nested/deep.min.js",
      "dist/vendor/bundled.js",
      "other/index.js",
    ]);
    expect(
      matchFiles(buildInput({ include: [".hidden/**/*.js"] })),
    ).toStrictEqual([".hidden/secret.js"]);
  });

  it("holds nothing when the directory it names was never built", () => {
    expect.hasAssertions();
    // Not an error here: whether an empty input matters is decided by
    // whoever asked for the measurement, not by the walk.
    expect(
      matchFiles(buildInput({ include: ["build/**/*.js"] })),
    ).toStrictEqual([]);
  });

  it("holds nothing from a link pointing at a file that is gone", () => {
    expect.hasAssertions();
    expect(matchFiles(buildInput())).not.toContain("dist/broken.js");
  });

  it("holds nothing when the directory it names cannot be read", () => {
    expect.hasAssertions();
    expect(
      service.matchFiles({
        input: buildInput(),
        workingDirectory: `${workingDirectory}/never-created`,
      }),
    ).toStrictEqual([]);
  });

  it("holds a file a glob names outright", () => {
    expect.hasAssertions();
    expect(
      matchFiles(buildInput({ include: ["dist/nested/deep.js"] })),
    ).toStrictEqual(["dist/nested/deep.js"]);
  });
});
