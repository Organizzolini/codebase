import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { ANALYSIS_MODULES } from "../../../testing/modules";

import { ExternalService } from "./external.service";

import type ts from "typescript";

/** Builds the minimum of a source file the predicate reads. */
function sourceFile(args: {
  fileName: string;
  isDeclarationFile?: boolean;
}): ts.SourceFile {
  return createMock<ts.SourceFile>({
    fileName: args.fileName,
    isDeclarationFile: args.isDeclarationFile ?? false,
  });
}

describe(ExternalService, () => {
  let service: ExternalService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [...ANALYSIS_MODULES],
      providers: [ExternalService],
    }).compile();

    service = await module.resolve(ExternalService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  const buildSubject = (): ExternalService => {
    const subject = new ExternalService();

    subject.configure({
      ownedFilePaths: new Set(["/workspace/packages/example/src/owned.ts"]),
      workspaceRoot: "/workspace",
    });

    return subject;
  };

  it("treats a file inside the workspace as traced", () => {
    expect(
      buildSubject().isExternal(
        sourceFile({ fileName: "/workspace/packages/example/src/a.ts" }),
      ),
    ).toBe(false);
  });

  it("treats a declaration file as external", () => {
    expect(
      buildSubject().isExternal(
        sourceFile({
          fileName: "/workspace/packages/example/src/a.d.ts",
          isDeclarationFile: true,
        }),
      ),
    ).toBe(true);
  });

  it("treats a dependency as external", () => {
    expect(
      buildSubject().isExternal(
        sourceFile({ fileName: "/workspace/node_modules/left-pad/index.ts" }),
      ),
    ).toBe(true);
  });

  it("treats a file outside the workspace as external", () => {
    expect(
      buildSubject().isExternal(sourceFile({ fileName: "/elsewhere/a.ts" })),
    ).toBe(true);
  });

  it("matches node_modules as a path segment, not a substring", () => {
    // A project legitimately named for the directory is not a dependency.
    expect(
      buildSubject().isExternal(
        sourceFile({
          fileName: "/workspace/packages/node_modules-inspector/src/a.ts",
        }),
      ),
    ).toBe(false);
  });

  it("returns the same verdict when asked twice", () => {
    const subject = buildSubject();
    const file = sourceFile({ fileName: "/workspace/packages/example/a.ts" });

    expect(subject.isExternal(file)).toBe(subject.isExternal(file));
  });

  it("reports whether a path is one this run walks", () => {
    const subject = buildSubject();

    expect(subject.isOwned("/workspace/packages/example/src/owned.ts")).toBe(
      true,
    );
    expect(subject.isOwned("/workspace/packages/example/src/other.ts")).toBe(
      false,
    );
  });
});
