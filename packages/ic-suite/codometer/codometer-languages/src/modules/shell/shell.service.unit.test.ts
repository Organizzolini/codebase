import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logging";

import { ShellService } from "./shell.service";

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
      if (filePath.endsWith("throws-a-string.sh")) {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw "not an Error";
      }

      return actual.readFileSync(filePath, encoding);
    },
  };
});

describe(ShellService, () => {
  let service: ShellService;
  let loggerService: DeepMocked<LoggerService>;
  const temporaryDirectories: string[] = [];

  /** Writes sources into a fresh directory and returns it with their names. */
  function writeSources(files: Record<string, string>): {
    shellFiles: string[];
    workingDirectory: string;
  } {
    const workingDirectory = mkdtempSync(
      path.join(tmpdir(), "codometer-shell-"),
    );
    temporaryDirectories.push(workingDirectory);

    for (const [fileName, content] of Object.entries(files)) {
      writeFileSync(path.join(workingDirectory, fileName), content, "utf8");
    }

    return { shellFiles: Object.keys(files), workingDirectory };
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ShellService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    service = await module.resolve(ShellService);
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

  it("counts functions, variables, and control flow", () => {
    const { shellFiles, workingDirectory } = writeSources({
      "setup.sh": [
        "#!/usr/bin/env bash",
        "# Sets the workspace up",
        "set -euo pipefail",
        "export TARGET=main",
        "readonly RETRIES=3",
        "install_dependencies() {",
        "  for attempt in 1 2 3; do",
        "    if pnpm install | tee install.log; then",
        "      return 0",
        "    fi",
        "  done",
        "}",
      ].join("\n"),
    });

    const result = service.analyze({ shellFiles, workingDirectory });

    expect(result.files).toBe(1);
    expect(result.shebangs).toBe(1);
    expect(result.comments).toBe(1);
    expect(result.functions).toBe(1);
    expect(result.exports).toBe(1);
    expect(result.variables).toBe(1);
    expect(result.loops).toBe(1);
    expect(result.conditionals).toBe(1);
    expect(result.pipelines).toBe(1);
  });

  it("reads a logical or as one expression rather than two pipelines", () => {
    const { shellFiles, workingDirectory } = writeSources({
      "guard.sh": "command -v uv || echo missing\n",
    });

    const result = service.analyze({ shellFiles, workingDirectory });

    expect(result.pipelines).toBe(0);
  });

  it("recognizes the function keyword form and a case statement", () => {
    const { shellFiles, workingDirectory } = writeSources({
      "dispatch.sh": [
        "function dispatch {",
        "  case $1 in",
        "    start) echo starting ;;",
        "  esac",
        "}",
        "declare -x DISPATCH_MODE=fast",
      ].join("\n"),
    });

    const result = service.analyze({ shellFiles, workingDirectory });

    expect(result.functions).toBe(1);
    expect(result.conditionals).toBe(1);
    expect(result.exports).toBe(1);
  });

  it("reports a thrown value that is not an Error", () => {
    const { shellFiles, workingDirectory } = writeSources({
      "throws-a-string.sh": "",
    });

    const result = service.analyze({ shellFiles, workingDirectory });

    expect(result.files).toBe(0);
    expect(loggerService.warn).toHaveBeenCalledWith(
      "🐚 Skipped shell analysis",
      undefined,
      { filePath: "throws-a-string.sh", reason: "not an Error" },
    );
  });

  it("skips an unreadable file and warns", () => {
    const result = service.analyze({
      shellFiles: ["missing.sh"],
      workingDirectory: "/repo",
    });

    expect(result.files).toBe(0);
    expect(loggerService.warn).toHaveBeenCalledWith(
      "🐚 Skipped shell analysis",
      undefined,
      expect.objectContaining({ filePath: "missing.sh" }),
    );
  });
});
