import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { DifferencesService } from "./differences.service";

describe(DifferencesService, () => {
  let service: DifferencesService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [DifferencesService],
    }).compile();

    service = await module.resolve(DifferencesService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("buildMissingFileDifference", () => {
    it("reports the instance path and points the fix at the template", () => {
      const error = service.buildMissingFileDifference({
        instanceFilePath: "packages/example/src/index.ts",
        templateFilePath: "templates/example/src/index.ts",
      });

      expect(error.differenceType).toBe("file");
      expect(error.message).toContain("packages/example/src/index.ts");
      expect(error.fix).toContain("templates/example/src/index.ts");
    });

    it("omits language, because a missing file has no format", () => {
      const error = service.buildMissingFileDifference({
        instanceFilePath: "a",
        templateFilePath: "b",
      });

      expect(error.language).toBeUndefined();
    });
  });

  describe("buildMissingDirectoryDifference", () => {
    it("reports the directory category", () => {
      const error = service.buildMissingDirectoryDifference({
        instanceDirectoryPath: "packages/example/src/modules",
        templateDirectoryPath: "templates/example/src/modules",
      });

      expect(error.differenceType).toBe("directory");
      expect(error.message).toContain("packages/example/src/modules");
    });
  });

  describe("resolveErrorLanguage", () => {
    it("passes through a recognized language", () => {
      expect(service.resolveErrorLanguage("python")).toBe("python");
    });

    it("returns undefined for an unrecognized value", () => {
      expect(service.resolveErrorLanguage("cobol")).toBeUndefined();
      expect(service.resolveErrorLanguage(42)).toBeUndefined();
      expect(service.resolveErrorLanguage(undefined)).toBeUndefined();
    });
  });

  describe("resolveDifferenceType", () => {
    it("passes through a recognized category", () => {
      expect(service.resolveDifferenceType("comment")).toBe("comment");
    });

    it("falls back to code so one bad payload cannot fail the run", () => {
      expect(service.resolveDifferenceType("nonsense")).toBe("code");
      expect(service.resolveDifferenceType(null)).toBe("code");
    });
  });
});
