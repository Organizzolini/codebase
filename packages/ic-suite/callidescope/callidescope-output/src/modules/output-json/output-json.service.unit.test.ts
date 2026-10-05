import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { buildEmptyCallGraphResult } from "../../../testing/mocks";
import { ANALYSIS_MODULES } from "../../../testing/modules";

import { OutputJsonService } from "./output-json.service";

import type { LoggerService } from "@codebase/logging";
import type { DeepMocked } from "@golevelup/ts-vitest";

describe(OutputJsonService, () => {
  let service: OutputJsonService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [...ANALYSIS_MODULES],
      providers: [OutputJsonService],
    }).compile();

    service = await module.resolve(OutputJsonService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  const subjectLogger: DeepMocked<LoggerService> = createMock<LoggerService>();
  const subject = new OutputJsonService(subjectLogger);
  const destination = { indentation: 2, path: "" };
  const result = buildEmptyCallGraphResult();

  /** Returns a path inside a fresh temporary directory. */
  async function temporaryPath(): Promise<string> {
    const directory = await mkdtemp(path.join(tmpdir(), "callidescope-json-"));

    return path.join(directory, "report.json");
  }

  it("renders the findings as indented JSON", () => {
    const report = subject.buildReport({ destination, result });

    expect(JSON.parse(report)).toStrictEqual(result);
  });

  it("ends the report with a newline", () => {
    // Every other tool in the repository leaves one, and check mode would
    // otherwise fail over that single byte.
    expect(subject.buildReport({ destination, result })).toMatch(/\n$/);
  });

  it("honors the configured indentation", () => {
    expect(
      subject.buildReport({
        destination: { indentation: 0, path: "" },
        result,
      }),
    ).not.toContain("\n  ");
  });

  it("writes the report in write mode", async () => {
    const reportPath = await temporaryPath();

    subject.sync({
      check: false,
      destination: { indentation: 2, path: reportPath },
      result,
    });

    expect(JSON.parse(await readFile(reportPath, "utf8"))).toStrictEqual(
      result,
    );
    expect(subjectLogger.info).toHaveBeenCalledWith(
      "🔭 Wrote a report",
      undefined,
      { path: path.resolve(reportPath) },
    );
  });

  it("creates parent directories that do not exist yet", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "callidescope-json-"));
    const reportPath = path.join(directory, "nested", "deeper", "report.json");

    subject.sync({
      check: false,
      destination: { indentation: 2, path: reportPath },
      result,
    });

    await expect(readFile(reportPath, "utf8")).resolves.toContain("summary");
  });

  it("reports a matching file as current in check mode", async () => {
    const reportPath = await temporaryPath();
    const destinationAt = { indentation: 2, path: reportPath };

    await writeFile(
      reportPath,
      subject.buildReport({ destination: destinationAt, result }),
      "utf8",
    );

    expect(
      subject.sync({ check: true, destination: destinationAt, result }),
    ).toBe(true);
  });

  it("reports a differing file as stale in check mode", async () => {
    const reportPath = await temporaryPath();

    await writeFile(reportPath, "{}\n", "utf8");

    expect(
      subject.sync({
        check: true,
        destination: { indentation: 2, path: reportPath },
        result,
      }),
    ).toBe(false);
  });

  it("reports a missing file as stale rather than failing", async () => {
    expect(
      subject.sync({
        check: true,
        destination: { indentation: 2, path: await temporaryPath() },
        result,
      }),
    ).toBe(false);
  });

  it("writes nothing in check mode", async () => {
    const reportPath = await temporaryPath();

    await writeFile(reportPath, "untouched", "utf8");
    subject.sync({
      check: true,
      destination: { indentation: 2, path: reportPath },
      result,
    });

    await expect(readFile(reportPath, "utf8")).resolves.toBe("untouched");
  });
});
