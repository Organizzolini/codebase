import {
  BoundaryReportService,
  type BoundaryViolation,
} from "@codependix/boundaries";
import { InputError } from "@codependix/configuration";
import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logging";

import { ReportingService } from "./reporting.service";

import type { MapRunResult } from "../graph-run/graph-run.types";
import type { GraphRunOutcome } from "@codependix/core";

const VIOLATION: BoundaryViolation = {
  cycle: undefined,
  level: "nxProjects",
  message: "layers: a must not depend on b.",
  rule: "layers",
  scope: "workspace",
  source: "a",
  target: "b",
};

describe(ReportingService, () => {
  let service: ReportingService;
  let loggerService: LoggerService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ReportingService,
        {
          provide: BoundaryReportService,
          useValue: new BoundaryReportService(),
        },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    service = await module.resolve(ReportingService);
    loggerService = await module.resolve(LoggerService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = 0;
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("sets its own logger context", () => {
    const freshLogger = createMock<LoggerService>();

    new ReportingService(new BoundaryReportService(), freshLogger);

    expect(freshLogger.setContext).toHaveBeenCalledWith("ReportingService");
  });

  describe("reportBoundaries", () => {
    it("passes with no failures and no violations", () => {
      expect(service.reportBoundaries({ failures: [], violations: [] })).toBe(
        true,
      );
      expect(loggerService.error).not.toHaveBeenCalled();
    });

    it("logs and fails on a project failure", () => {
      const passed = service.reportBoundaries({
        failures: [{ error: "boom", projectName: "lexico" }],
        violations: [],
      });

      expect(passed).toBe(false);
      expect(loggerService.error).toHaveBeenCalledWith(
        "💥 Failed running codependix",
        undefined,
        { failures: [{ error: "boom", projectName: "lexico" }] },
      );
    });

    it("logs and fails on a boundary violation, rendered through BoundaryReportService", () => {
      const passed = service.reportBoundaries({
        failures: [],
        violations: [VIOLATION],
      });

      expect(passed).toBe(false);
      expect(loggerService.error).toHaveBeenCalledWith(
        "🕸️ Found codependix boundary violations",
        undefined,
        {
          summary: "1 boundary violation across 1 rule.",
          violations: ["nxProjects workspace: layers: a must not depend on b."],
        },
      );
    });
  });

  describe("reportEmptySelection", () => {
    it("stays quiet when at least one project was selected", () => {
      service.reportEmptySelection(1);

      expect(loggerService.warn).not.toHaveBeenCalled();
    });

    it("warns when no project was selected", () => {
      service.reportEmptySelection(0);

      expect(loggerService.warn).toHaveBeenCalledWith(
        "🕸️ Selected no project to export",
        undefined,
        expect.objectContaining({ hint: expect.any(String) as unknown }),
      );
    });
  });

  describe("reportFailure", () => {
    it("reports an InputError as a rejected command line and fails the run", () => {
      service.reportFailure(new InputError("bad flag"));

      expect(loggerService.error).toHaveBeenCalledWith(
        "🕸️ Rejected the command line",
        undefined,
        { reason: "bad flag" },
      );
      expect(process.exitCode).toBe(1);
    });

    it("reports any other Error as a failed run", () => {
      service.reportFailure(new Error("boom"));

      expect(loggerService.error).toHaveBeenCalledWith(
        "💥 Failed running codependix",
        undefined,
        { reason: "boom" },
      );
      expect(process.exitCode).toBe(1);
    });

    it("reports a non-Error rejection as its string form", () => {
      service.reportFailure("boom");

      expect(loggerService.error).toHaveBeenCalledWith(
        "💥 Failed running codependix",
        undefined,
        { reason: "boom" },
      );
    });
  });

  describe("reportOutcome", () => {
    it("passes when nothing failed and nothing is stale", () => {
      expect(service.reportOutcome({ failures: [], results: [] })).toBe(true);
    });

    it("logs and fails on a project failure", () => {
      const passed = service.reportOutcome({
        failures: [{ error: "boom", projectName: "codependix-nestjs" }],
        results: [],
      });

      expect(passed).toBe(false);
      expect(loggerService.error).toHaveBeenCalledWith(
        "💥 Failed running codependix",
        undefined,
        { failures: [{ error: "boom", projectName: "codependix-nestjs" }] },
      );
    });

    it("logs and fails on a stale export", () => {
      const passed = service.reportOutcome({
        failures: [],
        results: [
          {
            isCurrent: false,
            projectName: "codependix-nx",
            staleExports: [
              {
                anchor: undefined,
                difference: "graph",
                path: "codependix-nx.json",
              },
            ],
            stalePaths: ["codependix-nx.json"],
          },
        ],
      });

      expect(passed).toBe(false);
      expect(loggerService.error).toHaveBeenCalledWith(
        "🕸️ Found stale codependix exports",
        undefined,
        {
          exports: [
            {
              anchor: undefined,
              difference: "graph",
              path: "codependix-nx.json",
              project: "codependix-nx",
            },
          ],
          projects: ["codependix-nx"],
        },
      );
    });

    it("deduplicates stale projects appearing across multiple graph types", () => {
      const passed = service.reportOutcome({
        failures: [],
        results: [
          {
            isCurrent: false,
            projectName: "atlas-service",
            staleExports: [
              {
                anchor: "codependix-nx-projects",
                difference: "graph",
                path: "README.md",
              },
            ],
            stalePaths: ["README.md"],
          },
          {
            isCurrent: false,
            projectName: "atlas-service",
            staleExports: [
              {
                anchor: undefined,
                difference: "formatting",
                path: "codependix-imports-graph.json",
              },
            ],
            stalePaths: ["codependix-imports-graph.json"],
          },
          {
            isCurrent: false,
            projectName: "atlas-core",
            staleExports: [
              {
                anchor: "codependix-nx-projects",
                difference: "graph",
                path: "README.md",
              },
            ],
            stalePaths: ["README.md"],
          },
        ],
      });

      expect(passed).toBe(false);
      expect(loggerService.error).toHaveBeenCalledWith(
        "🕸️ Found stale codependix exports",
        undefined,
        {
          exports: [
            {
              anchor: "codependix-nx-projects",
              difference: "graph",
              path: "README.md",
              project: "atlas-service",
            },
            {
              anchor: undefined,
              difference: "formatting",
              path: "codependix-imports-graph.json",
              project: "atlas-service",
            },
            {
              anchor: "codependix-nx-projects",
              difference: "graph",
              path: "README.md",
              project: "atlas-core",
            },
          ],
          projects: ["atlas-service", "atlas-core"],
        },
      );
    });
  });

  describe("reportPassOutcomes", () => {
    const CURRENT_RUN: MapRunResult = {
      combinedGraphs: {},
      outcome: { failures: [], results: [] },
    };

    it("passes when neither pass ran at all", () => {
      expect(
        service.reportPassOutcomes({
          boundaryOutcome: undefined,
          exportRun: undefined,
        }),
      ).toBe(true);
    });

    it("fails when the export pass reports a stale export", () => {
      const passed = service.reportPassOutcomes({
        boundaryOutcome: undefined,
        exportRun: {
          combinedGraphs: {},
          outcome: {
            failures: [],
            results: [
              {
                isCurrent: false,
                projectName: "a",
                staleExports: [
                  { anchor: undefined, difference: "graph", path: "a" },
                ],
                stalePaths: ["a"],
              },
            ],
          },
        },
      });

      expect(passed).toBe(false);
    });

    it("fails when the boundary pass reports a violation, even with a passing export pass", () => {
      const passed = service.reportPassOutcomes({
        boundaryOutcome: { failures: [], violations: [VIOLATION] },
        exportRun: CURRENT_RUN,
      });

      expect(passed).toBe(false);
    });

    it("passes when both passes ran and both are clean", () => {
      const passed = service.reportPassOutcomes({
        boundaryOutcome: { failures: [], violations: [] },
        exportRun: CURRENT_RUN,
      });

      expect(passed).toBe(true);
    });
  });

  describe("reportSuccess", () => {
    it("logs nothing for a pass that did not run", () => {
      service.reportSuccess({
        boundaryOutcome: undefined,
        exportOutcome: undefined,
      });

      expect(loggerService.info).not.toHaveBeenCalled();
    });

    it("logs the export pass's own project count", () => {
      const exportOutcome: GraphRunOutcome = {
        failures: [],
        results: [
          {
            isCurrent: true,
            projectName: "codependix-nx",
            staleExports: [],
            stalePaths: [],
          },
        ],
      };

      service.reportSuccess({ boundaryOutcome: undefined, exportOutcome });

      expect(loggerService.info).toHaveBeenCalledWith(
        "🕸️ Verified every configured codependix export is current",
        undefined,
        { projects: 1 },
      );
    });

    it("logs that the boundary pass held", () => {
      service.reportSuccess({
        boundaryOutcome: { failures: [], violations: [] },
        exportOutcome: undefined,
      });

      expect(loggerService.info).toHaveBeenCalledWith(
        "🕸️ Verified every declared codependix boundary holds",
      );
    });
  });
});
