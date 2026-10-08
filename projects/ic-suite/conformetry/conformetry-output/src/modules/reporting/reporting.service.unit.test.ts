import { ScoringService } from "@conformetry/languages";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { ReportingService } from "./reporting.service";

import type { InstanceScore, ValidationFileResult } from "@conformetry/core";

const WORKING_DIRECTORY = "/workspace";

function createFileResult(
  differences: ValidationFileResult["differences"],
): ValidationFileResult {
  return {
    differences,
    filename: "example.ts",
    instanceFilePath: "/workspace/packages/example/src/example.ts",
    templateFilePath: "/workspace/templates/example/src/example.ts",
    totalWeight: 1,
  };
}

describe(ReportingService, () => {
  let service: ReportingService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [ReportingService, ScoringService],
    }).compile();

    service = await module.resolve(ReportingService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("returns a success message when nothing failed", () => {
    const report = service.formatReport({
      fileResults: [],
      workingDirectory: WORKING_DIRECTORY,
    });

    expect(report).toBe("All checked files conform.");
  });

  it("relativizes instance and template paths against the working directory", () => {
    const report = service.formatReport({
      fileResults: [
        createFileResult([
          { differenceType: "code", fix: "Add it.", message: "Missing thing" },
        ]),
      ],
      workingDirectory: WORKING_DIRECTORY,
    });

    expect(report).toContain("Instance: packages/example/src/example.ts");
    expect(report).toContain("Template: templates/example/src/example.ts");
    expect(report).not.toContain("/workspace/");
  });

  it("prints the message and fix for every error", () => {
    const report = service.formatReport({
      fileResults: [
        createFileResult([
          {
            differenceType: "code",
            fix: "Add the import.",
            message: "Missing A",
          },
          {
            differenceType: "comment",
            fix: "Add the comment.",
            message: "No B",
          },
        ]),
      ],
      workingDirectory: WORKING_DIRECTORY,
    });

    expect(report).toContain("1. Missing A");
    expect(report).toContain("Fix     : Add the import.");
    expect(report).toContain("2. No B");
    expect(report).toContain("Fix     : Add the comment.");
  });

  it("prefers line and column over a JSON path", () => {
    const report = service.formatReport({
      fileResults: [
        createFileResult([
          {
            differenceType: "code",
            fix: "Fix it.",
            instanceColumn: 3,
            instanceLine: 12,
            instancePath: "scripts.build",
            message: "Missing thing",
            templateLine: 8,
          },
        ]),
      ],
      workingDirectory: WORKING_DIRECTORY,
    });

    expect(report).toContain("Instance: Line 12, Column 3");
    expect(report).toContain("Template: Line 8");
    expect(report).not.toContain("JSON path");
  });

  it("falls back to a JSON path when no line is known", () => {
    const report = service.formatReport({
      fileResults: [
        createFileResult([
          {
            differenceType: "code",
            fix: "Fix it.",
            instancePath: "scripts.build[0]",
            message: "Missing key",
          },
        ]),
      ],
      workingDirectory: WORKING_DIRECTORY,
    });

    expect(report).toContain('Instance: JSON path "scripts.build[0]"');
  });

  it("prints expected and actual values when the error carries them", () => {
    const report = service.formatReport({
      fileResults: [
        createFileResult([
          {
            actual: "esnext",
            differenceType: "code",
            expected: "es2023",
            fix: "Change it.",
            message: "Wrong target",
          },
        ]),
      ],
      workingDirectory: WORKING_DIRECTORY,
    });

    expect(report).toContain("Expected: `es2023`");
    expect(report).toContain("Actual  : `esnext`");
  });

  it("shows what a finding weighs when it stands for a whole subtree", () => {
    const report = service.formatReport({
      fileResults: [
        {
          ...createFileResult([
            {
              differenceType: "code",
              fix: "Add it.",
              message: "Missing ClassDeclaration",
              weight: 38,
            },
          ]),
          totalWeight: 109,
        },
      ],
      workingDirectory: WORKING_DIRECTORY,
    });

    // Which finding to fix first is the question a score raises, and only the
    // weight answers it.
    expect(report).toContain(
      "Weight  : 38 of the 109 requirements in this file",
    );
  });

  it("omits the weight line for a finding that stands only for itself", () => {
    const report = service.formatReport({
      fileResults: [
        createFileResult([
          {
            differenceType: "comment",
            fix: "Add it.",
            message: "Missing comment",
          },
        ]),
      ],
      workingDirectory: WORKING_DIRECTORY,
    });

    // Most findings are leaves; printing "Weight: 1" on each would be noise.
    expect(report).not.toContain("Weight");
  });

  it("shows each file's own fraction on its heading", () => {
    const report = service.formatReport({
      fileResults: [
        {
          ...createFileResult([
            {
              differenceType: "comment",
              fix: "Add it.",
              message: "Missing comment",
            },
          ]),
          totalWeight: 2,
        },
      ],
      workingDirectory: WORKING_DIRECTORY,
    });

    // A small file loses a large share of itself to one finding, which the
    // instance-level score averages away entirely.
    expect(report).toContain("1/2 requirements met (50.0%)");
  });

  describe("score summary", () => {
    function createScore(overrides: Partial<InstanceScore>): InstanceScore {
      return {
        failedWeight: 4,
        instancePath: "/workspace/packages/example/src/modules/billing",
        ok: false,
        score: 0.8,
        templateName: "nestjs-service-module",
        threshold: 1,
        totalWeight: 20,
        ...overrides,
      };
    }

    it("prints a score below its threshold with both numbers", () => {
      const report = service.formatReport({
        fileResults: [],
        scores: [createScore({})],
        workingDirectory: WORKING_DIRECTORY,
      });

      expect(report).toContain("Conformance scores:");
      expect(report).toContain("16/20 requirements met (80.0%)");
      expect(report).toContain("below threshold 100.0%");
    });

    it("shows the fraction the percentage was derived from", () => {
      const report = service.formatReport({
        fileResults: [],
        scores: [
          createScore({ failedWeight: 1, score: 0.993, totalWeight: 151 }),
        ],
        workingDirectory: WORKING_DIRECTORY,
      });

      // A percentage hides its own scale: 99.3% reads the same whether one
      // requirement of 151 went missing or thirty of four thousand did.
      expect(report).toContain("150/151 requirements met (99.3%)");
    });

    it("prints the instance path relative to the working directory", () => {
      const report = service.formatReport({
        fileResults: [],
        scores: [createScore({})],
        workingDirectory: WORKING_DIRECTORY,
      });

      // Every other path the report prints is relative; an absolute one here
      // would describe the same tree twice in two different ways.
      expect(report).toContain("packages/example/src/modules/billing");
      expect(report).not.toContain(`${WORKING_DIRECTORY}/packages`);
    });

    it("prints a score that cleared a lowered threshold as within it", () => {
      const report = service.formatReport({
        fileResults: [],
        scores: [createScore({ ok: true, threshold: 0.75 })],
        workingDirectory: WORKING_DIRECTORY,
      });

      expect(report).toContain("meets threshold 75.0%");
    });

    it("totals every scored instance, listed or not", () => {
      const report = service.formatReport({
        fileResults: [],
        scores: [
          createScore({}),
          createScore({ failedWeight: 0, ok: true, score: 1 }),
        ],
        workingDirectory: WORKING_DIRECTORY,
      });

      // Totalling only the failures would always read close to zero; the
      // question the total answers is how the run did overall.
      expect(report).toContain("Total — 36/40 requirements met (90.0%)");
      expect(report).toContain("across 2 instance(s), 1 below threshold");
    });

    it("leaves perfect instances out of the summary", () => {
      const report = service.formatReport({
        fileResults: [],
        scores: [createScore({ failedWeight: 0, ok: true, score: 1 })],
        workingDirectory: WORKING_DIRECTORY,
      });

      // A line per conforming instance would bury the ones that drifted.
      expect(report).not.toContain("Conformance scores:");
      expect(report).toBe("All checked files conform.");
    });

    it("still prints findings for an instance within its threshold", () => {
      const report = service.formatReport({
        fileResults: [
          createFileResult([
            {
              differenceType: "code",
              fix: "Add it.",
              message: "Missing thing",
            },
          ]),
        ],
        scores: [createScore({ ok: true, threshold: 0.75 })],
        workingDirectory: WORKING_DIRECTORY,
      });

      // A lowered threshold is permission to ship the drift, not a reason to
      // stop showing it.
      expect(report).toContain("meets threshold 75.0%");
      expect(report).toContain("Missing thing");
    });

    it("renders a report with no scores at all", () => {
      const report = service.formatReport({
        fileResults: [],
        workingDirectory: WORKING_DIRECTORY,
      });

      expect(report).toBe("All checked files conform.");
    });
  });
});
