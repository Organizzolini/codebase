import { ScoringService } from "@conformetry/languages";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { ValidationScoringService } from "./validation-scoring.service";

import type { MatchedInstance } from "@conformetry/configuration";
import type { ValidationFileResult } from "@conformetry/core";

const INSTANCE_PATH = "/w/packages/widgets/src/modules";

/** Builds a file result whose findings weigh `failedWeight` in total. */
function buildFileResult(failedWeight: number): ValidationFileResult {
  return {
    differences: [
      {
        differenceType: "code",
        fix: "Add it.",
        message: "Missing statement",
        weight: failedWeight,
      },
    ],
    filename: "gears.service.ts",
    instanceFilePath: `${INSTANCE_PATH}/gears/gears.service.ts`,
    templateFilePath: "/w/templates/widget/a.ts",
    totalWeight: failedWeight,
  };
}

/** Builds a matched instance, optionally carrying thresholds at either level. */
function buildInstance(args: {
  groupThreshold?: number;
  templateThreshold?: number;
}): MatchedInstance {
  return {
    instance: {
      nameStem: "gears",
      path: INSTANCE_PATH,
      ...(args.groupThreshold === undefined
        ? {}
        : { threshold: args.groupThreshold }),
    },
    matchedFileCount: 3,
    substitutions: { name: "gears" },
    template: {
      directoryPath: "/w/templates/widget",
      filePaths: ["/w/templates/widget/a.ts"],
      name: "widget",
      ...(args.templateThreshold === undefined
        ? {}
        : { threshold: args.templateThreshold }),
    },
  };
}

describe(ValidationScoringService, () => {
  let service: ValidationScoringService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [ScoringService, ValidationScoringService],
    }).compile();

    service = await module.resolve(ValidationScoringService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("resolveThreshold", () => {
    it("demands a perfect score when nothing configures a threshold", () => {
      // Adding scoring must not quietly relax any run that passed before it.
      expect(
        service.resolveThreshold({
          fileResults: [],
          instance: buildInstance({}),
          totalWeight: 10,
        }),
      ).toBe(1);
    });

    it("uses the run-level threshold when no level is narrower", () => {
      expect(
        service.resolveThreshold({
          fileResults: [],
          instance: buildInstance({}),
          runThreshold: 0.8,
          totalWeight: 10,
        }),
      ).toBe(0.8);
    });

    it("lets a generator's threshold beat the run-level one", () => {
      expect(
        service.resolveThreshold({
          fileResults: [],
          instance: buildInstance({ templateThreshold: 0.9 }),
          runThreshold: 0.5,
          totalWeight: 10,
        }),
      ).toBe(0.9);
    });

    it("lets an instance group's threshold beat the generator's", () => {
      // The migration case: one directory held to a lower bar while every
      // other instance of the same template stays strict.
      expect(
        service.resolveThreshold({
          fileResults: [],
          instance: buildInstance({
            groupThreshold: 0.6,
            templateThreshold: 0.95,
          }),
          runThreshold: 0.5,
          totalWeight: 10,
        }),
      ).toBe(0.6);
    });

    it("honours a threshold of zero rather than falling through it", () => {
      // `?? ` not `||`: zero is a real answer, meaning "never fail this".
      expect(
        service.resolveThreshold({
          fileResults: [],
          instance: buildInstance({ templateThreshold: 0 }),
          runThreshold: 1,
          totalWeight: 10,
        }),
      ).toBe(0);
    });
  });

  describe("scoreInstance", () => {
    it("scores a conforming instance perfectly and passes it", () => {
      expect(
        service.scoreInstance({
          fileResults: [],
          instance: buildInstance({}),
          totalWeight: 20,
        }),
      ).toStrictEqual({
        failedWeight: 0,
        instancePath: `${INSTANCE_PATH}/gears`,
        ok: true,
        score: 1,
        templateName: "widget",
        threshold: 1,
        totalWeight: 20,
      });
    });

    it("fails a drifted instance under the default threshold", () => {
      const score = service.scoreInstance({
        fileResults: [buildFileResult(5)],
        instance: buildInstance({}),
        totalWeight: 20,
      });

      expect(score.score).toBe(0.75);
      expect(score.failedWeight).toBe(5);
      expect(score.ok).toBe(false);
    });

    it("passes the same instance once its threshold is lowered", () => {
      const score = service.scoreInstance({
        fileResults: [buildFileResult(5)],
        instance: buildInstance({ templateThreshold: 0.75 }),
        totalWeight: 20,
      });

      expect(score.score).toBe(0.75);
      expect(score.ok).toBe(true);
    });

    it("passes an instance sitting exactly on its threshold", () => {
      expect(
        service.scoreInstance({
          fileResults: [buildFileResult(2)],
          instance: buildInstance({ templateThreshold: 0.9 }),
          totalWeight: 20,
        }).ok,
      ).toBe(true);
    });

    it("adds up the findings across every file", () => {
      const score = service.scoreInstance({
        fileResults: [buildFileResult(3), buildFileResult(4)],
        instance: buildInstance({}),
        totalWeight: 20,
      });

      expect(score.failedWeight).toBe(7);
      expect(score.score).toBe(0.65);
    });
  });

  describe("scoreInstances", () => {
    it("reports one score per instance and template pair", () => {
      const group = {
        fileResults: [],
        instance: buildInstance({}),
        totalWeight: 20,
      };

      // The same directory is matched once per generator whose globs reach it,
      // so without deduplication the summary prints it three times over.
      expect(
        service.scoreInstances({ groups: [group, group, group] }),
      ).toHaveLength(1);
    });

    it("tells two modules of the same project apart", () => {
      const gears = buildInstance({});
      const widgets: MatchedInstance = {
        ...gears,
        instance: { ...gears.instance, nameStem: "widgets" },
      };

      // Both share `Instance.path` — it is the directory the template is laid
      // over, not the module itself — so keying on it alone collapsed every
      // module of a project onto one score, and the last one silently won.
      expect(
        service.scoreInstances({
          groups: [
            {
              fileResults: [buildFileResult(5)],
              instance: gears,
              totalWeight: 20,
            },
            { fileResults: [], instance: widgets, totalWeight: 20 },
          ],
        }),
      ).toHaveLength(2);
    });

    it("keeps the strictest threshold when two groups claim one instance", () => {
      const lenient = buildInstance({ groupThreshold: 0.5 });
      const strict = buildInstance({ groupThreshold: 0.95 });

      // Nothing makes one group more specific than another, so order would
      // otherwise decide it. Strictest-wins at least means a lenient group
      // cannot silently relax a bar someone else set.
      expect(
        service.scoreInstances({
          groups: [
            { fileResults: [], instance: lenient, totalWeight: 20 },
            { fileResults: [], instance: strict, totalWeight: 20 },
          ],
        })[0]?.threshold,
      ).toBe(0.95);
      expect(
        service.scoreInstances({
          groups: [
            { fileResults: [], instance: strict, totalWeight: 20 },
            { fileResults: [], instance: lenient, totalWeight: 20 },
          ],
        })[0]?.threshold,
      ).toBe(0.95);
    });

    it("keeps a genuine tie against two different templates", () => {
      const instance = buildInstance({});

      expect(
        service.scoreInstances({
          groups: [
            { fileResults: [], instance, totalWeight: 20 },
            {
              fileResults: [],
              instance: {
                ...instance,
                template: { ...instance.template, name: "other" },
              },
              totalWeight: 20,
            },
          ],
        }),
      ).toHaveLength(2);
    });

    it("applies the run-level threshold to every instance", () => {
      const scores = service.scoreInstances({
        groups: [
          { fileResults: [], instance: buildInstance({}), totalWeight: 20 },
        ],
        runThreshold: 0.8,
      });

      expect(scores[0]?.threshold).toBe(0.8);
    });
  });
});
