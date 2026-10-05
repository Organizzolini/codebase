import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { LoggerService } from "@codebase/logging";

import { JsonService } from "./json.service";

import type { DeepMocked } from "@golevelup/ts-vitest";

const sampleReport = {
  failures: [],
  targets: [
    {
      empty: false,
      files: 3,
      metrics: [
        {
          limits: [],
          name: "codebase.files",
          path: "files",
          unit: null,
          value: 3,
        },
      ],
      name: "codebase",
    },
  ],
};

describe(JsonService, () => {
  let service: JsonService;
  let loggerService: DeepMocked<LoggerService>;
  const temporaryDirectories: string[] = [];

  /** Creates a temp directory that is removed after the test. */
  function createTemporaryDirectory(): string {
    const temporaryDirectory = mkdtempSync(path.join(tmpdir(), "codometer-"));
    temporaryDirectories.push(temporaryDirectory);

    return temporaryDirectory;
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        JsonService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    service = await module.resolve(JsonService);
    loggerService = await module.resolve(LoggerService);
  });

  afterEach(() => {
    for (const temporaryDirectory of temporaryDirectories.splice(0)) {
      rmSync(temporaryDirectory, { force: true, recursive: true });
    }
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("renders the report with the configured indentation", () => {
    const rendered = service.render({ indentation: 4, report: sampleReport });

    expect(rendered).toBe(`${JSON.stringify(sampleReport, null, 4)}\n`);
    expect(rendered.endsWith("\n")).toBe(true);
  });

  it("writes the report, creating missing parent directories", () => {
    const reportPath = path.join(
      createTemporaryDirectory(),
      "output/reports/codometer.json",
    );

    expect(
      service.sync({
        check: false,
        indentation: 2,
        path: reportPath,
        report: sampleReport,
      }),
    ).toBe(true);
    expect(existsSync(reportPath)).toBe(true);
    expect(JSON.parse(readFileSync(reportPath, "utf8"))).toStrictEqual(
      sampleReport,
    );
    expect(loggerService.info).toHaveBeenCalledWith(
      "📝 Wrote the JSON report",
      undefined,
      { path: reportPath },
    );
  });

  it("returns true when checking a report that is current", () => {
    const reportPath = path.join(createTemporaryDirectory(), "codometer.json");

    service.sync({
      check: false,
      indentation: 2,
      path: reportPath,
      report: sampleReport,
    });

    expect(
      service.sync({
        check: true,
        indentation: 2,
        path: reportPath,
        report: sampleReport,
      }),
    ).toBe(true);
  });

  it("returns false when checking a report that is stale", () => {
    const reportPath = path.join(createTemporaryDirectory(), "codometer.json");

    writeFileSync(reportPath, "{}\n", "utf8");

    expect(
      service.sync({
        check: true,
        indentation: 2,
        path: reportPath,
        report: sampleReport,
      }),
    ).toBe(false);
  });

  it("returns false when checking a report that is missing", () => {
    const reportPath = path.join(createTemporaryDirectory(), "codometer.json");

    expect(
      service.sync({
        check: true,
        indentation: 2,
        path: reportPath,
        report: sampleReport,
      }),
    ).toBe(false);
  });
});
