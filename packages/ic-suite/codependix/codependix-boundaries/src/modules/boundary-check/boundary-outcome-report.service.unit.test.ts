import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { BoundaryReportService } from "../boundaries/boundary-report.service";

import { BoundaryOutcomeReportService } from "./boundary-outcome-report.service";

import type { BoundaryViolation } from "../boundaries/boundaries.types";
import type {
  BoundaryCheckFailure,
  BoundaryCheckOutcome,
  JudgedBoundaryFinding,
} from "./boundary-check.types";

/** Builds a judged failure, defaulting everything a test does not care about. */
function buildFailure(
  overrides: Partial<JudgedBoundaryFinding<BoundaryCheckFailure>> = {},
): JudgedBoundaryFinding<BoundaryCheckFailure> {
  return {
    error: "Cannot access 'Word' before initialization",
    level: "nestjsModules",
    projects: ["lexico-cli"],
    verdict: "fail",
    ...overrides,
  };
}

/** Builds a judged violation, defaulting everything a test does not care about. */
function buildViolation(
  overrides: Partial<JudgedBoundaryFinding<BoundaryViolation>> = {},
): JudgedBoundaryFinding<BoundaryViolation> {
  return {
    cycle: undefined,
    level: "nxProjects",
    message: "layers: a must not depend on b.",
    projects: ["a"],
    rule: "layers",
    scope: "workspace",
    source: "a",
    target: "b",
    verdict: "fail",
    ...overrides,
  };
}

const NO_FINDINGS: BoundaryCheckOutcome = { failures: [], violations: [] };

describe(BoundaryOutcomeReportService, () => {
  let service: BoundaryOutcomeReportService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [BoundaryOutcomeReportService, BoundaryReportService],
    }).compile();

    service = await module.resolve(BoundaryOutcomeReportService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("buildReport", () => {
    it("lists the judged projects sorted, and no findings for a clean run", () => {
      expect(
        service.buildReport({
          judgedProjects: ["b", "a"],
          outcome: NO_FINDINGS,
        }),
      ).toStrictEqual({
        failures: [],
        judgedProjects: ["a", "b"],
        violations: [],
      });
    });

    it("carries every field of a violation but its scope", () => {
      const report = service.buildReport({
        judgedProjects: ["a"],
        outcome: {
          failures: [],
          violations: [
            buildViolation({
              cycle: ["a", "b", "a"],
              projects: ["a", "b"],
              rule: "no-cycles",
              source: "b",
              target: "a",
            }),
          ],
        },
      });

      expect(report.violations).toStrictEqual([
        {
          cycle: ["a", "b", "a"],
          level: "nxProjects",
          message: "layers: a must not depend on b.",
          projects: ["a", "b"],
          rule: "no-cycles",
          source: "b",
          target: "a",
          verdict: "fail",
        },
      ]);
    });

    it("reports an absent cycle as null so the key survives JSON", () => {
      const report = service.buildReport({
        judgedProjects: ["a"],
        outcome: { failures: [], violations: [buildViolation()] },
      });

      expect(report.violations[0]?.cycle).toBeNull();
    });

    it("names the owner project of a failure only when one was resolved", () => {
      const report = service.buildReport({
        judgedProjects: ["lexico-cli"],
        outcome: {
          failures: [
            buildFailure({ ownerProject: "lexico-entities" }),
            buildFailure({ projects: ["lexico-api"] }),
          ],
          violations: [],
        },
      });

      expect(report.failures).toStrictEqual([
        {
          error: "Cannot access 'Word' before initialization",
          level: "nestjsModules",
          ownerProject: "lexico-entities",
          projects: ["lexico-cli"],
          verdict: "fail",
        },
        {
          error: "Cannot access 'Word' before initialization",
          level: "nestjsModules",
          projects: ["lexico-api"],
          verdict: "fail",
        },
      ]);
    });

    it("keeps a note's verdict so a reader can tell it did not fail the run", () => {
      const report = service.buildReport({
        judgedProjects: ["c"],
        outcome: {
          failures: [],
          violations: [buildViolation({ projects: ["a"], verdict: "note" })],
        },
      });

      expect(report.violations[0]?.verdict).toBe("note");
    });
  });

  describe("renderFailures", () => {
    it("names the level, the charged projects and the error", () => {
      expect(service.renderFailures([buildFailure()], [])).toStrictEqual([
        "nestjsModules lexico-cli: Cannot access 'Word' before initialization",
      ]);
    });

    it("names the project owning the code a failure broke on", () => {
      expect(
        service.renderFailures(
          [buildFailure({ ownerProject: "lexico-entities" })],
          [],
        ),
      ).toStrictEqual([
        "nestjsModules lexico-cli: Cannot access 'Word' before initialization (failed in code owned by lexico-entities)",
      ]);
    });

    it("marks a note as not failing and names the dependency it lives in", () => {
      expect(
        service.renderFailures(
          [buildFailure({ projects: ["lexico-entities"], verdict: "note" })],
          [],
        ),
      ).toStrictEqual([
        "nestjsModules in dependency lexico-entities, not failing: Cannot access 'Word' before initialization",
      ]);
    });
  });

  describe("renderFailures for a workspace-wide failure", () => {
    const WORKSPACE_WIDE = buildFailure({
      error: "Cannot build the Nx graph",
      level: "nxProjects",
      projects: ["a", "b", "c"],
    });

    it("summarizes a failure charged to every judged project as a count", () => {
      expect(
        service.renderFailures([WORKSPACE_WIDE], ["a", "b", "c"]),
      ).toStrictEqual([
        "nxProjects all 3 judged projects: Cannot build the Nx graph",
      ]);
    });

    it("names the projects when the failure reaches only some of those judged", () => {
      expect(
        service.renderFailures([WORKSPACE_WIDE], ["a", "b", "c", "d"]),
      ).toStrictEqual(["nxProjects a, b, c: Cannot build the Nx graph"]);
    });
  });

  describe("renderMarkdown", () => {
    /** Renders one failing failure as the Markdown a combined document holds. */
    function renderFailure(error: string): string {
      return service.renderMarkdown(
        service.buildReport({
          judgedProjects: ["lexico-cli"],
          outcome: { failures: [buildFailure({ error })], violations: [] },
        }),
      );
    }

    // A raw second line would end the bullet, and a raw third would read as
    // a paragraph of its own, outside the project's group.
    it("indents a multi-line error under its bullet", () => {
      expect(
        renderFailure(
          "Cannot boot\n    at Module.load (a.ts:1:1)\n\nCaused by: b",
        ),
      ).toBe(
        [
          "Judged projects: lexico-cli.",
          "",
          "#### lexico-cli",
          "",
          "- **fail** nestjsModules lexico-cli: Cannot boot",
          "      at Module.load (a.ts:1:1)",
          "",
          "  Caused by: b",
        ].join("\n"),
      );
    });

    it("reads a Windows line ending as one line break", () => {
      expect(renderFailure("first\r\nsecond")).toContain(
        "- **fail** nestjsModules lexico-cli: first\n  second",
      );
    });

    // `-->` ends the HTML comment an anchor block is written inside.
    it("neutralizes a comment terminator in the error text", () => {
      const markdown = renderFailure("saw --> in a message");

      expect(markdown).not.toContain("-->");
      expect(markdown).toContain("lexico-cli: saw --&gt; in a message");
    });

    it("keeps the raw error text in the JSON report", () => {
      const report = service.buildReport({
        judgedProjects: ["lexico-cli"],
        outcome: {
          failures: [buildFailure({ error: "a\nb --> c" })],
          violations: [],
        },
      });

      expect(report.failures[0]?.error).toBe("a\nb --> c");
    });

    it("lists a failure charged to every judged project once, as a count", () => {
      const markdown = service.renderMarkdown(
        service.buildReport({
          judgedProjects: ["a", "b", "c"],
          outcome: {
            failures: [
              buildFailure({
                error: "Cannot build the Nx graph",
                level: "nxProjects",
                projects: ["a", "b", "c"],
              }),
            ],
            violations: [buildViolation({ projects: ["b"] })],
          },
        }),
      );

      expect(markdown).toBe(
        [
          "Judged projects: a, b, c.",
          "",
          "#### All judged projects",
          "",
          "- **fail** nxProjects all 3 judged projects: Cannot build the Nx graph",
          "",
          "#### b",
          "",
          "- **fail** nxProjects b: layers: a must not depend on b.",
        ].join("\n"),
      );
    });

    it("says so when a run judged projects and found nothing", () => {
      expect(
        service.renderMarkdown({
          failures: [],
          judgedProjects: ["a", "b"],
          violations: [],
        }),
      ).toBe("Judged projects: a, b.\n\nNo boundary findings.");
    });

    // An unmatched selection is refused before a run starts, so only a
    // workspace holding no project but its root can judge none.
    it("says no project was judged rather than printing an empty list", () => {
      expect(
        service.renderMarkdown({
          failures: [],
          judgedProjects: [],
          violations: [],
        }),
      ).toBe("Judged projects: none.\n\nNo boundary findings.");
    });

    it("lists a finding under each project it is charged to", () => {
      const markdown = service.renderMarkdown(
        service.buildReport({
          judgedProjects: ["a", "b"],
          outcome: {
            failures: [],
            violations: [
              buildViolation({
                message: "no-cycles: a → b → a is a cycle.",
                projects: ["a", "b"],
                rule: "no-cycles",
              }),
            ],
          },
        }),
      );

      expect(markdown).toBe(
        [
          "Judged projects: a, b.",
          "",
          "#### a",
          "",
          "- **fail** nxProjects a, b: no-cycles: a → b → a is a cycle.",
          "",
          "#### b",
          "",
          "- **fail** nxProjects a, b: no-cycles: a → b → a is a cycle.",
        ].join("\n"),
      );
    });

    it("marks a note as not failing under the dependency it lives in", () => {
      const markdown = service.renderMarkdown(
        service.buildReport({
          judgedProjects: ["c"],
          outcome: {
            failures: [],
            violations: [buildViolation({ projects: ["a"], verdict: "note" })],
          },
        }),
      );

      expect(markdown).toBe(
        [
          "Judged projects: c.",
          "",
          "#### a",
          "",
          "- **note** nxProjects in dependency a, not failing: layers: a must not depend on b.",
        ].join("\n"),
      );
    });

    it("names the owner of a failure and sorts the project groups", () => {
      const markdown = service.renderMarkdown(
        service.buildReport({
          judgedProjects: ["lexico-cli"],
          outcome: {
            failures: [
              buildFailure({ ownerProject: "lexico-entities" }),
              buildFailure({
                projects: ["lexico-entities"],
                verdict: "note",
              }),
            ],
            violations: [buildViolation({ projects: ["lexico-cli"] })],
          },
        }),
      );

      expect(markdown).toBe(
        [
          "Judged projects: lexico-cli.",
          "",
          "#### lexico-cli",
          "",
          "- **fail** nxProjects lexico-cli: layers: a must not depend on b.",
          "- **fail** nestjsModules lexico-cli: Cannot access 'Word' before initialization (failed in code owned by lexico-entities)",
          "",
          "#### lexico-entities",
          "",
          "- **note** nestjsModules in dependency lexico-entities, not failing: Cannot access 'Word' before initialization",
        ].join("\n"),
      );
    });
  });
});
