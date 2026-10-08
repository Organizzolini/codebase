import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { ValidationDeduplicationService } from "./validation-deduplication.service";

import type { InstanceFileResults } from "./validation.types";
import type { MatchedInstance } from "@conformetry/configuration";

const INSTANCE_FILE_PATH =
  "/w/packages/widgets/src/modules/logger/logger.service.ts";

/** Wraps one finding against `templateFilePath` into a group for `instance`. */
function buildGroup(args: {
  instance: MatchedInstance;
  templateFilePath: string;
}): InstanceFileResults {
  return {
    fileResults: [
      {
        differences: [
          {
            differenceType: "code",
            fix: `Match ${args.templateFilePath}.`,
            message: "Missing statement",
          },
        ],
        filename: "logger.service.ts",
        instanceFilePath: INSTANCE_FILE_PATH,
        templateFilePath: args.templateFilePath,
        totalWeight: 1,
      },
    ],
    instance: args.instance,
    totalWeight: 1,
  };
}

/** Builds a matched instance whose template holds `fileCount` files. */
function buildInstance(args: {
  fileCount: number;
  name: string;
}): MatchedInstance {
  return {
    instance: {
      nameStem: "logger",
      path: "/w/packages/widgets/src/modules/logger",
    },
    matchedFileCount: args.fileCount,
    substitutions: { name: "logger" },
    template: {
      directoryPath: `/w/templates/${args.name}`,
      filePaths: Array.from({ length: args.fileCount }, (_unused, index) => {
        return `/w/templates/${args.name}/file-${String(index)}.ts`;
      }),
      name: args.name,
    },
  };
}

describe(ValidationDeduplicationService, () => {
  let service: ValidationDeduplicationService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [ValidationDeduplicationService],
    }).compile();

    service = await module.resolve(ValidationDeduplicationService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("deduplicate", () => {
    it("reports a file against the smallest template that covers it", () => {
      const results = service.deduplicate([
        buildGroup({
          instance: buildInstance({
            fileCount: 18,
            name: "nestjs-service-project",
          }),
          templateFilePath: "/w/templates/nestjs-service-project/a.ts",
        }),
        buildGroup({
          instance: buildInstance({
            fileCount: 2,
            name: "nestjs-service-file",
          }),
          templateFilePath: "/w/templates/nestjs-service-file/a.ts",
        }),
        buildGroup({
          instance: buildInstance({
            fileCount: 5,
            name: "nestjs-service-module",
          }),
          templateFilePath: "/w/templates/nestjs-service-module/a.ts",
        }),
      ]);

      expect(results).toHaveLength(1);
      expect(results[0]?.templateFilePath).toContain("nestjs-service-file");
    });

    it("collapses one instance and template pair reached twice", () => {
      const instance = buildInstance({
        fileCount: 2,
        name: "nestjs-service-file",
      });
      const results = service.deduplicate([
        buildGroup({
          instance,
          templateFilePath: "/w/templates/nestjs-service-file/a.ts",
        }),
        buildGroup({
          instance,
          templateFilePath: "/w/templates/nestjs-service-file/a.ts",
        }),
      ]);

      expect(results).toHaveLength(1);
    });

    it("breaks a size tie on template name", () => {
      const results = service.deduplicate([
        buildGroup({
          instance: buildInstance({ fileCount: 2, name: "beta" }),
          templateFilePath: "/w/templates/beta/a.ts",
        }),
        buildGroup({
          instance: buildInstance({ fileCount: 2, name: "alpha" }),
          templateFilePath: "/w/templates/alpha/a.ts",
        }),
      ]);

      expect(results).toHaveLength(1);
      expect(results[0]?.templateFilePath).toContain("alpha");
    });

    it("keeps findings for different instance files", () => {
      const instance = buildInstance({
        fileCount: 2,
        name: "nestjs-service-file",
      });
      const group = buildGroup({
        instance,
        templateFilePath: "/w/templates/nestjs-service-file/a.ts",
      });

      expect(
        service.deduplicate([
          group,
          {
            fileResults: group.fileResults.map((fileResult) => {
              return { ...fileResult, instanceFilePath: "/w/other.ts" };
            }),
            instance,
            totalWeight: 1,
          },
        ]),
      ).toHaveLength(2);
    });

    it("returns nothing for no groups", () => {
      expect(service.deduplicate([])).toStrictEqual([]);
    });
  });
});
