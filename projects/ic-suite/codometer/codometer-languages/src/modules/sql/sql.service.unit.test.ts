import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logging";

import { SqlService } from "./sql.service";

import type { DeepMocked } from "@golevelup/ts-vitest";
import type * as NodeFileSystem from "node:fs";

// Reads stay real except for one sentinel path, which throws a bare string:
// a rejected promise or a thrown literal is not an Error, and the analyzer
// still has to report which file it gave up on.
vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof NodeFileSystem>();

  return {
    ...actual,
    readFileSync: (filePath: string, encoding: "utf8") => {
      if (filePath.endsWith("throws-a-string.sql")) {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw "not an Error";
      }

      return actual.readFileSync(filePath, encoding);
    },
  };
});

describe(SqlService, () => {
  let service: SqlService;
  let loggerService: DeepMocked<LoggerService>;
  const temporaryDirectories: string[] = [];

  /** Writes sources into a fresh directory and returns it with their names. */
  function writeSources(files: Record<string, string>): {
    sqlFiles: string[];
    workingDirectory: string;
  } {
    const workingDirectory = mkdtempSync(path.join(tmpdir(), "codometer-sql-"));
    temporaryDirectories.push(workingDirectory);

    for (const [fileName, content] of Object.entries(files)) {
      writeFileSync(path.join(workingDirectory, fileName), content, "utf8");
    }

    return { sqlFiles: Object.keys(files), workingDirectory };
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SqlService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    service = await module.resolve(SqlService);
    loggerService = await module.resolve(LoggerService);
  });

  afterEach(() => {
    vi.restoreAllMocks();

    for (const temporaryDirectory of temporaryDirectories.splice(0)) {
      rmSync(temporaryDirectory, { force: true, recursive: true });
    }
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("counts statements and the clauses inside them", () => {
    const { sqlFiles, workingDirectory } = writeSources({
      "schema.sql": [
        "-- Seed the entries",
        "CREATE TABLE entry (id integer);",
        "WITH recent AS (SELECT id FROM entry)",
        "SELECT e.id FROM entry e INNER JOIN recent r ON r.id = e.id;",
        "UPDATE entry SET id = 2;",
        "DELETE FROM entry;",
      ].join("\n"),
    });

    const result = service.analyze({ sqlFiles, workingDirectory });

    expect(result.files).toBe(1);
    expect(result.statements).toBe(4);
    expect(result.creates).toBe(1);
    expect(result.selects).toBe(2);
    expect(result.joins).toBe(1);
    expect(result.commonTableExpressions).toBe(1);
    expect(result.updates).toBe(1);
    expect(result.deletes).toBe(1);
    expect(result.comments).toBe(1);
  });

  it("does not read a keyword inside a comment as a clause", () => {
    const { sqlFiles, workingDirectory } = writeSources({
      "notes.sql": "/* SELECT is explained here */\nSELECT 1;\n",
    });

    const result = service.analyze({ sqlFiles, workingDirectory });

    expect(result.comments).toBe(1);
    expect(result.selects).toBe(1);
  });

  it("counts no statements in a script that is only comments", () => {
    const { sqlFiles, workingDirectory } = writeSources({
      "notes.sql": "-- nothing to run here\n-- still nothing\n",
    });

    const result = service.analyze({ sqlFiles, workingDirectory });

    expect(result.comments).toBe(2);
    expect(result.statements).toBe(0);
  });

  it("reports a thrown value that is not an Error", () => {
    const { sqlFiles, workingDirectory } = writeSources({
      "throws-a-string.sql": "",
    });

    const result = service.analyze({ sqlFiles, workingDirectory });

    expect(result.files).toBe(0);
    expect(loggerService.warn).toHaveBeenCalledWith(
      "🗄️ Skipped SQL analysis",
      undefined,
      { filePath: "throws-a-string.sql", reason: "not an Error" },
    );
  });

  it("skips an unreadable file and warns", () => {
    const result = service.analyze({
      sqlFiles: ["missing.sql"],
      workingDirectory: "/repo",
    });

    expect(result.files).toBe(0);
    expect(loggerService.warn).toHaveBeenCalledWith(
      "🗄️ Skipped SQL analysis",
      undefined,
      expect.objectContaining({ filePath: "missing.sql" }),
    );
  });
});
