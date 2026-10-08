import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CustomizationService } from "./customization.service";

import type { ResolvedCodometerCustomStatistic } from "@codometer/configuration";

const files = [
  "packages/lexico-components/src/button.component.tsx",
  "tools/synchronization/src/modules/logger/logger.module.ts",
  "tools/synchronization/src/modules/logger/logger.service.ts",
  "tools/synchronization/src/modules/logger/logger.service.unit.test.ts",
  "applications/lexico/src/routes/index.tsx",
  "applications/lexico/src/modules/entry/entry.service.ts",
  "applications/lexico/src/modules/entry/entry.service.integration.test.ts",
];

/** Builds a counter with the fields a configuration would have filled in. */
function buildStatistic(
  overrides: Partial<ResolvedCodometerCustomStatistic>,
): ResolvedCodometerCustomStatistic {
  return {
    color: "7c3aed",
    comment: undefined,
    group: "conventions",
    label: "Counter",
    patterns: [],
    ...overrides,
  };
}

describe(CustomizationService, () => {
  let service: CustomizationService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [CustomizationService],
    }).compile();

    service = await module.resolve(CustomizationService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("counts the files each configured glob claims", () => {
    const result = service.analyze({
      commentCounts: {},
      files,
      statistics: [
        buildStatistic({ label: "Services", patterns: ["**/*.service.ts"] }),
        buildStatistic({
          color: "0284c7",
          label: "Modules",
          patterns: ["**/*.module.ts"],
        }),
      ],
      symbolCounts: {},
    });

    expect(result).toStrictEqual([
      { color: "7c3aed", count: 2, group: "conventions", label: "Services" },
      { color: "0284c7", count: 1, group: "conventions", label: "Modules" },
    ]);
  });

  it("keeps a suffixed test file out of the counter it extends", () => {
    const result = service.analyze({
      commentCounts: {},
      files,
      statistics: [
        buildStatistic({ label: "Services", patterns: ["**/*.service.ts"] }),
      ],
      symbolCounts: {},
    });

    // `logger.service.unit.test.ts` is a test, not a service, and the glob
    // says so by requiring the name to end there.
    expect(result[0]?.count).toBe(2);
  });

  it("counts a file matching several of one counter's globs once", () => {
    const result = service.analyze({
      commentCounts: {},
      files,
      statistics: [
        buildStatistic({
          label: "Tests",
          patterns: ["**/*.test.ts", "**/*.unit.test.ts"],
        }),
      ],
      symbolCounts: {},
    });

    expect(result[0]?.count).toBe(2);
  });

  it("reports zero for a counter that matches nothing", () => {
    const result = service.analyze({
      commentCounts: {},
      files,
      statistics: [
        buildStatistic({ label: "Resolvers", patterns: ["**/*.resolver.ts"] }),
      ],
      symbolCounts: {},
    });

    expect(result[0]?.count).toBe(0);
  });

  it("returns nothing when no counters are configured", () => {
    expect(
      service.analyze({
        commentCounts: {},
        files,
        statistics: [],
        symbolCounts: {},
      }),
    ).toStrictEqual([]);
  });

  it("labels a symbol counter with what the analyzer tallied", () => {
    const result = service.analyze({
      commentCounts: {},
      files,
      statistics: [
        buildStatistic({
          group: "typescript",
          label: "Static Methods",
          symbols: { kinds: ["method"], modifiers: ["static"] },
        }),
      ],
      symbolCounts: { "Static Methods": 12 },
    });

    expect(result).toStrictEqual([
      {
        color: "7c3aed",
        count: 12,
        group: "typescript",
        label: "Static Methods",
      },
    ]);
  });

  // A symbol counter carries patterns to narrow which files are searched, so
  // it must not fall through to counting the files those patterns matched.
  it("never counts files for a counter that matches symbols", () => {
    const result = service.analyze({
      commentCounts: {},
      files,
      statistics: [
        buildStatistic({
          label: "Service Methods",
          patterns: ["**/*.service.ts"],
          symbols: { kinds: ["method"] },
        }),
      ],
      symbolCounts: {},
    });

    expect(result[0]?.count).toBe(0);
  });

  it("hands the analyzer only the counters that match symbols", () => {
    const counters = service.buildSymbolCounters([
      buildStatistic({ label: "Services", patterns: ["**/*.service.ts"] }),
      buildStatistic({
        label: "Static Methods",
        patterns: ["packages/**"],
        symbols: { kinds: ["method"], modifiers: ["static"] },
      }),
      buildStatistic({
        label: "Classes",
        symbols: { kinds: ["class"] },
      }),
    ]);

    expect(counters).toStrictEqual([
      {
        kinds: ["method"],
        label: "Static Methods",
        modifiers: ["static"],
        patterns: ["packages/**"],
      },
      // A matcher naming no modifiers asks for the kind alone.
      { kinds: ["class"], label: "Classes", modifiers: [], patterns: [] },
    ]);
  });

  describe("comment-selector custom statistics", () => {
    it("counts only the breached measurements under the statistic's own label", () => {
      const result = service.analyze({
        commentCounts: {
          "Long Comments": [
            {
              breached: true,
              declaration: "a comment",
              file: "src/a.ts",
              kind: "comment",
              limit: 3,
              line: 1,
              measured: 5,
              severity: "fail",
              unit: "words",
            },
            {
              breached: false,
              declaration: "a comment",
              file: "src/b.ts",
              kind: "comment",
              limit: 3,
              line: 2,
              measured: 2,
              severity: "fail",
              unit: "words",
            },
          ],
        },
        files,
        statistics: [
          buildStatistic({
            comment: {
              kind: undefined,
              language: undefined,
              maximumCharacters: undefined,
              maximumLines: undefined,
              maximumWords: 3,
              severity: "fail",
            },
            label: "Long Comments",
          }),
        ],
        symbolCounts: {},
      });

      expect(result).toStrictEqual([
        {
          color: "7c3aed",
          count: 1,
          group: "conventions",
          instances: [{ file: "src/a.ts", line: 1, measured: 5 }],
          label: "Long Comments",
        },
      ]);
    });

    it("reports zero and no instances when its label measured no breach", () => {
      const result = service.analyze({
        commentCounts: {},
        files,
        statistics: [
          buildStatistic({
            comment: {
              kind: undefined,
              language: undefined,
              maximumCharacters: undefined,
              maximumLines: undefined,
              maximumWords: 3,
              severity: "fail",
            },
            label: "Long Comments",
          }),
        ],
        symbolCounts: {},
      });

      expect(result[0]).toStrictEqual({
        color: "7c3aed",
        count: 0,
        group: "conventions",
        instances: [],
        label: "Long Comments",
      });
    });

    it("carries a comment selector naming a kind through to its counter", () => {
      expect(
        service.buildCommentCounters([
          buildStatistic({
            comment: {
              kind: "class",
              language: undefined,
              maximumCharacters: undefined,
              maximumLines: 6,
              maximumWords: undefined,
              severity: "fail",
            },
            label: "Class Docs",
          }),
        ]),
      ).toStrictEqual([
        {
          budget: {
            maximumCharacters: undefined,
            maximumLines: 6,
            maximumWords: undefined,
            severity: "fail",
          },
          kind: "class",
          label: "Class Docs",
          language: undefined,
        },
      ]);
    });

    it("carries a comment selector naming a language through to its counter", () => {
      expect(
        service.buildCommentCounters([
          buildStatistic({
            comment: {
              kind: undefined,
              language: "yaml",
              maximumCharacters: undefined,
              maximumLines: undefined,
              maximumWords: 128,
              severity: "warn",
            },
            label: "YAML Comments",
          }),
        ]),
      ).toStrictEqual([
        {
          budget: {
            maximumCharacters: undefined,
            maximumLines: undefined,
            maximumWords: 128,
            severity: "warn",
          },
          kind: undefined,
          label: "YAML Comments",
          language: "yaml",
        },
      ]);
    });

    it("hands back no counters for a statistic naming no comment selector", () => {
      expect(
        service.buildCommentCounters([
          buildStatistic({ label: "Services", patterns: ["**/*.service.ts"] }),
        ]),
      ).toStrictEqual([]);
    });
  });
});
