import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { Test } from "@nestjs/testing";
import ts from "typescript";
import { beforeAll, describe, expect, it } from "vitest";

import { ANALYSIS_MODULES } from "../../../testing/modules";

import { CompilerHostService } from "./compiler-host.service";

const OPTIONS: ts.CompilerOptions = {
  noLib: true,
  target: ts.ScriptTarget.ES2022,
};

describe(CompilerHostService, () => {
  let service: CompilerHostService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [...ANALYSIS_MODULES],
      providers: [CompilerHostService],
    }).compile();

    service = await module.resolve(CompilerHostService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  /** Writes a source file and returns its path. */
  async function writeSource(text: string): Promise<string> {
    const directory = await mkdtemp(path.join(tmpdir(), "callidescope-host-"));
    const filePath = path.join(directory, "a.ts");

    await writeFile(filePath, text, "utf8");

    return filePath;
  }

  it("reads a source file", async () => {
    const filePath = await writeSource("export const a = 1;\n");
    const host = new CompilerHostService().createHost({
      options: OPTIONS,
      workspaceRoot: path.dirname(filePath),
    });

    expect(host.getSourceFile(filePath, ts.ScriptTarget.ES2022)).toBeDefined();
  });

  it("returns the same parsed file to a second caller", async () => {
    // The whole point: every project's program pulls in the same files, and
    // parsing them again per project is most of a cold run's cost.
    const filePath = await writeSource("export const a = 1;\n");
    const subject = new CompilerHostService();
    const workspaceRoot = path.dirname(filePath);
    const first = subject
      .createHost({ options: OPTIONS, workspaceRoot })
      .getSourceFile(filePath, ts.ScriptTarget.ES2022);
    const second = subject
      .createHost({ options: OPTIONS, workspaceRoot })
      .getSourceFile(filePath, ts.ScriptTarget.ES2022);

    expect(second).toBe(first);
  });

  it("does not reuse a file parsed at a different target", async () => {
    // A tree parsed at one target is not the tree another target would get, so
    // sharing across targets would be silently wrong.
    const filePath = await writeSource("export const a = 1;\n");
    const subject = new CompilerHostService();
    const workspaceRoot = path.dirname(filePath);
    const host = subject.createHost({ options: OPTIONS, workspaceRoot });
    const modern = host.getSourceFile(filePath, ts.ScriptTarget.ES2022);
    const legacy = host.getSourceFile(filePath, ts.ScriptTarget.ES2015);

    expect(legacy).not.toBe(modern);
  });

  it("accepts the object form of the language version", async () => {
    const filePath = await writeSource("export const a = 1;\n");
    const host = new CompilerHostService().createHost({
      options: OPTIONS,
      workspaceRoot: path.dirname(filePath),
    });

    expect(
      host.getSourceFile(filePath, {
        languageVersion: ts.ScriptTarget.ES2022,
      }),
    ).toBeDefined();
  });

  it("returns nothing for a file that does not exist", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "callidescope-host-"));
    const host = new CompilerHostService().createHost({
      options: OPTIONS,
      workspaceRoot: directory,
    });

    expect(
      host.getSourceFile(
        path.join(directory, "missing.ts"),
        ts.ScriptTarget.ES2022,
      ),
    ).toBeUndefined();
  });

  it("parses again after the cache is cleared", async () => {
    const filePath = await writeSource("export const a = 1;\n");
    const subject = new CompilerHostService();
    const workspaceRoot = path.dirname(filePath);
    const host = subject.createHost({ options: OPTIONS, workspaceRoot });
    const first = host.getSourceFile(filePath, ts.ScriptTarget.ES2022);

    subject.clear();

    expect(
      service
        .createHost({ options: OPTIONS, workspaceRoot })
        .getSourceFile(filePath, ts.ScriptTarget.ES2022),
    ).not.toBe(first);
  });
});
