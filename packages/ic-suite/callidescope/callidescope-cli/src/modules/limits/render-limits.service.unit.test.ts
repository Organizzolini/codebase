import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { RenderLimitsService } from "./render-limits.service";

import type { ProjectLimitRow } from "./limits.types";

/** The workspace's own depth row, as the service resolves it. */
const WORKSPACE_DEPTH_ROW: ProjectLimitRow = {
  limit: "maximumDepth",
  path: "configuration/callidescope.config.ts",
  project: undefined,
  value: 17,
};

/** A breadth row nothing anywhere declares, which is every project's today. */
const UNDECLARED_BREADTH_ROW: ProjectLimitRow = {
  limit: "maximumBreadth",
  path: undefined,
  project: "packages/logging",
  value: undefined,
};

describe(RenderLimitsService, () => {
  let service: RenderLimitsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [RenderLimitsService],
    }).compile();

    service = await module.resolve(RenderLimitsService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("prints the heading and the column headers above the table", () => {
    const document = service.render([WORKSPACE_DEPTH_ROW]);

    expect(document.split("\n").slice(0, 2)).toStrictEqual([
      "# 🔭 Callidescope Limits",
      "",
    ]);
    expect(document).toContain("| Project | Limit | Value | Declared in |");
    expect(document).toContain("| --- | --- | --- | --- |");
  });

  it("names the workspace row rather than leaving its project blank", () => {
    expect(service.render([WORKSPACE_DEPTH_ROW])).toContain(
      "| workspace | `maximumDepth` | 17 | `configuration/callidescope.config.ts` |",
    );
  });

  it("names the project a row belongs to, and the file its number is in", () => {
    const document = service.render([
      {
        limit: "maximumDepth",
        path: "packages/logging/callidescope.config.ts",
        project: "packages/logging",
        value: 4,
      },
    ]);

    expect(document).toContain(
      "| packages/logging | `maximumDepth` | 4 | `packages/logging/callidescope.config.ts` |",
    );
  });

  it("names the project rooted at the workspace root rather than leaving it blank", () => {
    const document = service.render([{ ...WORKSPACE_DEPTH_ROW, project: "" }]);

    expect(document).toContain(
      "| . | `maximumDepth` | 17 | `configuration/callidescope.config.ts` |",
    );
  });

  it("says a limit nothing declares is none rather than inventing a number", () => {
    expect(service.render([UNDECLARED_BREADTH_ROW])).toContain(
      "| packages/logging | `maximumBreadth` | none | — |",
    );
  });

  it("keeps the rows in the order it was handed them", () => {
    const document = service.render([
      WORKSPACE_DEPTH_ROW,
      UNDECLARED_BREADTH_ROW,
    ]);

    expect(
      document
        .split("\n")
        .slice(-2)
        .map((line) => line.split(" | ")[0]),
    ).toStrictEqual(["| workspace", "| packages/logging"]);
  });

  it("says where the numbers are written", () => {
    expect(service.render([WORKSPACE_DEPTH_ROW])).toContain(
      "the file each number is written in — which is that project's own `callidescope.config.ts`",
    );
  });
});
