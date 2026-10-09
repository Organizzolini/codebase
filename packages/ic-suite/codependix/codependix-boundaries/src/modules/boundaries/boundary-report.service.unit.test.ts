import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { BoundaryReportService } from "./boundary-report.service";

import type { BoundaryViolation } from "./boundaries.types";

/** Builds a violation, defaulting everything a test does not care about. */
function buildViolation(
  overrides: Partial<BoundaryViolation> = {},
): BoundaryViolation {
  return {
    cycle: undefined,
    level: "nxProjects",
    message: "layers: a must not depend on b.",
    projects: ["a"],
    rule: "layers",
    scope: "workspace",
    source: "a",
    target: "b",
    ...overrides,
  };
}

describe(BoundaryReportService, () => {
  let service: BoundaryReportService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [BoundaryReportService],
    }).compile();

    service = await module.resolve(BoundaryReportService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("says so when nothing was found", () => {
    expect(service.renderSummary([])).toBe("No boundary violations.");
  });

  it("counts one violation in the singular", () => {
    expect(service.renderSummary([buildViolation()])).toBe(
      "1 boundary violation across 1 rule.",
    );
  });

  it("counts violations and the rules that reported them", () => {
    expect(
      service.renderSummary([
        buildViolation(),
        buildViolation({ target: "c" }),
        buildViolation({ rule: "cycles" }),
      ]),
    ).toBe("3 boundary violations across 2 rules.");
  });

  it("names the level and the charged project in front of each message", () => {
    expect(
      service.renderViolations([
        buildViolation({
          level: "typescript",
          projects: ["codependix-cli"],
          scope: "codependix-cli",
        }),
      ]),
    ).toStrictEqual([
      "typescript codependix-cli: layers: a must not depend on b.",
    ]);
  });

  // An Nx-level finding is found in the workspace graph but belongs to the
  // projects it is charged to, so those are what the line names.
  it("names every project a cycle is charged to, never the workspace", () => {
    expect(
      service.renderViolations([
        buildViolation({ projects: ["a", "b"], scope: "workspace" }),
      ]),
    ).toStrictEqual(["nxProjects a, b: layers: a must not depend on b."]);
  });

  it("marks a note as not failing and names the dependency it lives in", () => {
    expect(
      service.renderNotes([buildViolation({ projects: ["lexico-entities"] })]),
    ).toStrictEqual([
      "nxProjects in dependency lexico-entities, not failing: layers: a must not depend on b.",
    ]);
  });

  it("describes a charge as the projects it fails", () => {
    expect(
      service.describeCharge({ isNote: false, projects: ["a", "b"] }),
    ).toBe("a, b");
  });

  it("describes a note's charge as the dependency it lives in, not failing", () => {
    expect(service.describeCharge({ isNote: true, projects: ["a", "b"] })).toBe(
      "in dependency a, b, not failing",
    );
  });

  it("renders nothing for no violations", () => {
    expect(service.renderViolations([])).toStrictEqual([]);
  });
});
