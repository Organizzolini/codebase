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

  describe("renderViolation", () => {
    it("renders one line: the level, whom it is charged to, then the message", () => {
      expect(
        service.renderViolation({
          isNote: false,
          violation: buildViolation({ projects: ["a", "b"] }),
        }),
      ).toBe("nxProjects a, b: layers: a must not depend on b.");
    });

    it("renders a note's line marked as not failing", () => {
      expect(
        service.renderViolation({
          isNote: true,
          violation: buildViolation({ projects: ["a"] }),
        }),
      ).toBe(
        "nxProjects in dependency a, not failing: layers: a must not depend on b.",
      );
    });
  });

  describe("describeCharge for a workspace-wide charge", () => {
    const JUDGED = ["a", "b", "c"];

    // Listing every name of a run with no selection prints the whole
    // workspace on every line.
    it("summarizes a charge to every judged project as a count", () => {
      expect(
        service.describeCharge({
          isNote: false,
          judgedProjects: JUDGED,
          projects: ["c", "a", "b"],
        }),
      ).toBe("all 3 judged projects");
    });

    it("names the projects of a charge to only some of the judged ones", () => {
      expect(
        service.describeCharge({
          isNote: false,
          judgedProjects: JUDGED,
          projects: ["a", "b"],
        }),
      ).toBe("a, b");
    });

    it("names the one project of a single-project run", () => {
      expect(
        service.describeCharge({
          isNote: false,
          judgedProjects: ["a"],
          projects: ["a"],
        }),
      ).toBe("a");
    });

    it("keeps a note's dependency wording whatever was judged", () => {
      expect(
        service.describeCharge({
          isNote: true,
          judgedProjects: JUDGED,
          projects: JUDGED,
        }),
      ).toBe("in dependency a, b, c, not failing");
    });

    it("says whether a charge reaches every judged project", () => {
      expect(
        service.isChargedToEveryProject({
          judgedProjects: JUDGED,
          projects: ["b", "c", "a"],
        }),
      ).toBe(true);
      expect(
        service.isChargedToEveryProject({
          judgedProjects: JUDGED,
          projects: ["a", "b"],
        }),
      ).toBe(false);
      expect(
        service.isChargedToEveryProject({
          judgedProjects: ["a"],
          projects: ["a"],
        }),
      ).toBe(false);
    });
  });

  it("renders nothing for no violations", () => {
    expect(service.renderViolations([])).toStrictEqual([]);
  });
});
