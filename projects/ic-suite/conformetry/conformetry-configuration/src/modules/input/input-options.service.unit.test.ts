import path from "node:path";

import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { InputOptionsService } from "./input-options.service";

const SCHEMA = {
  properties: {
    instancePath: { type: "string" },
    name: { type: "string" },
    unitTestName: { type: "string" },
  },
};

describe(InputOptionsService, () => {
  let service: InputOptionsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [InputOptionsService],
    }).compile();

    service = await module.resolve(InputOptionsService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("collectGeneratorInputs", () => {
    it("reads --flag value pairs", () => {
      expect(
        service.collectGeneratorInputs({
          rawArguments: ["--name", "my-widget"],
          schema: SCHEMA,
        }),
      ).toStrictEqual({ name: "my-widget" });
    });

    it("reads --flag=value pairs", () => {
      expect(
        service.collectGeneratorInputs({
          rawArguments: ["--name=my-widget"],
          schema: SCHEMA,
        }),
      ).toStrictEqual({ name: "my-widget" });
    });

    it("matches a kebab-case flag to a camelCase property", () => {
      expect(
        service.collectGeneratorInputs({
          rawArguments: ["--unit-test-name", "spec"],
          schema: SCHEMA,
        }),
      ).toStrictEqual({ unitTestName: "spec" });
    });

    it("strips a leading generate token", () => {
      expect(
        service.collectGeneratorInputs({
          rawArguments: ["generate", "--name", "my-widget"],
          schema: SCHEMA,
        }),
      ).toStrictEqual({ name: "my-widget" });
    });

    it("ignores reserved command options", () => {
      expect(
        service.collectGeneratorInputs({
          rawArguments: ["--instancePath", "/out", "--name", "widget"],
          schema: SCHEMA,
        }),
      ).toStrictEqual({ name: "widget" });
    });

    it("does not let a valueless flag swallow the next flag", () => {
      expect(
        service.collectGeneratorInputs({
          rawArguments: ["--name", "--unit-test-name", "spec"],
          schema: SCHEMA,
        }),
      ).toStrictEqual({ unitTestName: "spec" });
    });

    it("ignores flags the schema does not declare", () => {
      expect(
        service.collectGeneratorInputs({
          rawArguments: ["--unknown", "value"],
          schema: SCHEMA,
        }),
      ).toStrictEqual({});
    });
  });

  describe("normalizeRuntimeOptions", () => {
    it("coerces primitives and serializes objects", () => {
      expect(
        service.normalizeRuntimeOptions({
          count: 3,
          flag: true,
          missing: undefined,
          nested: { a: 1 },
          text: "value",
        }),
      ).toStrictEqual({
        count: "3",
        flag: "true",
        missing: undefined,
        nested: '{"a":1}',
        text: "value",
      });
    });
  });

  describe("resolveTargetDirectoryPath", () => {
    it("prefers an explicit output option", () => {
      expect(
        service.resolveTargetDirectoryPath({
          generatorName: "example",
          options: { outputPath: "/out" },
        }),
      ).toBe("/out");
    });

    it("resolves a project root when a project name is given", () => {
      expect(
        service.resolveTargetDirectoryPath({
          generatorName: "example",
          options: { project: "widget" },
          resolveProjectRootPath: (projectName) => `packages/${projectName}`,
        }),
      ).toBe("packages/widget");
    });

    it("falls back to a directory named after the generator", () => {
      expect(
        service.resolveTargetDirectoryPath({
          generatorName: "example",
          options: {},
        }),
      ).toBe(path.join("generated", "example"));
    });
  });

  describe("resolveTargetDirectoryPath fallbacks", () => {
    it("uses the project root a caller resolves", () => {
      expect(
        service.resolveTargetDirectoryPath({
          generatorName: "nestjs-service-module",
          options: { project: "widgets" },
          resolveProjectRootPath: () => "packages/widgets",
        }),
      ).toBe("packages/widgets");
    });

    it("falls back to a generator-named directory when the project is unknown", () => {
      expect(
        service.resolveTargetDirectoryPath({
          defaultGeneratedOutputDirectory: "generated",
          generatorName: "nestjs-service-module",
          options: { project: "widgets" },
          resolveProjectRootPath: () => undefined,
        }),
      ).toBe("generated/nestjs-service-module");
    });

    it("falls back when no resolver is supplied at all", () => {
      expect(
        service.resolveTargetDirectoryPath({
          defaultGeneratedOutputDirectory: "generated",
          generatorName: "nestjs-service-module",
          options: { project: "widgets" },
        }),
      ).toBe("generated/nestjs-service-module");
    });
  });

  describe("collectGeneratorInputs edge cases", () => {
    it("collects nothing from a schema that declares no properties", () => {
      expect(
        service.collectGeneratorInputs({
          rawArguments: ["--name", "my-widget"],
          schema: {},
        }),
      ).toStrictEqual({});
    });
  });
});
