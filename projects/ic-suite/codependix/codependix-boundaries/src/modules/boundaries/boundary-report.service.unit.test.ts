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

  it("names the level and the scope in front of each message", () => {
    expect(
      service.renderViolations([
        buildViolation({ level: "typescript", scope: "codependix-cli" }),
      ]),
    ).toStrictEqual([
      "typescript codependix-cli: layers: a must not depend on b.",
    ]);
  });

  it("renders nothing for no violations", () => {
    expect(service.renderViolations([])).toStrictEqual([]);
  });
});
