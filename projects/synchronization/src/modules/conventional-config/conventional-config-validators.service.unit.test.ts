import path from "node:path";

import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logging";

import { ConventionalConfigIoService } from "./conventional-config-io.service";
import { ConventionalConfigValidatorsService } from "./conventional-config-validators.service";

import type { ConventionalConfig } from "./conventional-config.types";

const fileContents = new Map<string, string>();

vi.mock("node:fs", () => {
  return {
    readFileSync: vi.fn<(filePath: string) => string>((filePath: string) => {
      const value = fileContents.get(filePath);
      if (value === undefined) {
        throw new Error(`File not found: ${filePath}`);
      }
      return value;
    }),
  };
});

describe(ConventionalConfigValidatorsService, () => {
  let io: ConventionalConfigIoService;
  let logger: LoggerService;
  let service: ConventionalConfigValidatorsService;

  const workspaceRoot = process.cwd();
  const config: ConventionalConfig = {
    scopes: [{ description: "tools scope", name: "tools" }],
    types: [{ code: "fix", description: "fixing", emoji: "🐛", name: "fix" }],
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ConventionalConfigValidatorsService,
        {
          provide: ConventionalConfigIoService,
          useValue: createMock<ConventionalConfigIoService>(),
        },
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    io = await module.resolve(ConventionalConfigIoService);
    logger = await module.resolve(LoggerService);
    service = await module.resolve(ConventionalConfigValidatorsService);
  });

  beforeEach(() => {
    fileContents.clear();
    vi.clearAllMocks();
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("sets logger context", async () => {
    const module = await Test.createTestingModule({
      providers: [
        ConventionalConfigValidatorsService,
        {
          provide: ConventionalConfigIoService,
          useValue: createMock<ConventionalConfigIoService>(),
        },
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    const localLogger = await module.resolve(LoggerService);

    expect(localLogger.setContext).toHaveBeenCalledWith(
      "ConventionalConfigValidatorsService",
    );
  });

  it("validates matching settings scopes", () => {
    expect(service.checkSettingsSync(["tools"], ["tools"])).toBe(true);
  });

  // `showDifference` now emits one event carrying `missing` and `extra`, so
  // what used to be told apart by two different messages is told apart by data.
  it.each([
    {
      currentScopes: ["tools"],
      expectedDifference: { extra: ["other"], missing: ["tools"] },
      expectedReordered: false,
      scenarioName: "detects settings scope mismatch",
      targetScopes: ["other"],
    },
    {
      currentScopes: ["tools", "alpha"],
      expectedDifference: { extra: [], missing: ["alpha"] },
      expectedReordered: false,
      scenarioName:
        "reports only missing settings values when target is subset",
      targetScopes: ["tools"],
    },
    {
      currentScopes: ["tools"],
      expectedDifference: { extra: ["alpha"], missing: [] },
      expectedReordered: false,
      scenarioName:
        "reports only extra settings values when target has additions",
      targetScopes: ["tools", "alpha"],
    },
    {
      currentScopes: ["tools", "alpha"],
      expectedDifference: undefined,
      expectedReordered: true,
      scenarioName: "detects settings ordering drift when values match",
      targetScopes: ["alpha", "tools"],
    },
  ])(
    "$scenarioName",
    ({
      currentScopes,
      expectedDifference,
      expectedReordered,
      targetScopes,
    }) => {
      expect(service.checkSettingsSync(currentScopes, targetScopes)).toBe(
        false,
      );

      const calls = vi.mocked(logger).info.mock.calls;
      const messages = calls.map(([message]) => message);

      const difference = calls.find(
        ([message]) => message === "🔀 Differing values",
      );

      expect(difference?.[2]).toStrictEqual(
        expectedDifference === undefined
          ? undefined
          : { ...expectedDifference, targetName: "settings.json" },
      );

      expect(messages.includes("🔀 Reordered scopes in settings.json")).toBe(
        expectedReordered,
      );
    },
  );

  it("detects issue template scope drift and ordering drift", () => {
    const templateFile = path.join(
      workspaceRoot,
      ".github/ISSUE_TEMPLATE/issue.yml",
    );
    fileContents.set(templateFile, "template-content");
    vi.mocked(io.parseIssueTemplateDropdown)
      .mockReturnValueOnce(["fix"])
      .mockReturnValueOnce(["other"]);

    expect(service.checkIssueTemplateSync(config, templateFile)).toBe(false);

    vi.mocked(io.parseIssueTemplateDropdown)
      .mockReturnValueOnce(["fix"])
      .mockReturnValueOnce(["tools", "alpha"]);

    expect(
      service.checkIssueTemplateSync(
        {
          scopes: [
            { description: "alpha scope", name: "alpha" },
            { description: "tools scope", name: "tools" },
          ],
          types: config.types,
        },
        templateFile,
      ),
    ).toBe(false);
  });

  it("validates issue template when types and scopes match exactly", () => {
    const templateFile = path.join(
      workspaceRoot,
      ".github/ISSUE_TEMPLATE/issue.yml",
    );
    fileContents.set(templateFile, "template-content");
    vi.mocked(io.parseIssueTemplateDropdown)
      .mockReturnValueOnce(["fix"])
      .mockReturnValueOnce(["tools"]);

    expect(service.checkIssueTemplateSync(config, templateFile)).toBe(true);
  });

  it("detects missing issue template markers", () => {
    const templateFile = path.join(
      workspaceRoot,
      ".github/ISSUE_TEMPLATE/issue.yml",
    );
    fileContents.set(templateFile, "template-content");
    vi.mocked(io.parseIssueTemplateDropdown)
      .mockReturnValueOnce([])
      .mockReturnValueOnce(["tools"]);

    expect(service.checkIssueTemplateSync(config, templateFile)).toBe(false);
    expect(logger.info).toHaveBeenCalledWith("📄 Missing markers", undefined, {
      marker: "types",
      templateName: path.relative(workspaceRoot, templateFile),
    });
  });

  it.each([
    {
      checkerName: "checkReleaseRulesSync",
      expectedResult: true,
      sourceTypes: ["fix"],
      targetTypes: ["fix"],
    },
    {
      checkerName: "checkReleaseRulesSync",
      expectedResult: false,
      sourceTypes: ["fix"],
      targetTypes: [],
    },
    {
      checkerName: "checkPresetConfigSync",
      expectedResult: true,
      sourceTypes: ["fix"],
      targetTypes: ["fix"],
    },
    {
      checkerName: "checkPresetConfigSync",
      expectedResult: false,
      sourceTypes: ["fix"],
      targetTypes: [],
    },
  ])(
    "$checkerName returns $expectedResult for source $sourceTypes and target $targetTypes",
    ({ checkerName, expectedResult, sourceTypes, targetTypes }) => {
      const checkResult =
        checkerName === "checkReleaseRulesSync"
          ? service.checkReleaseRulesSync(
              sourceTypes,
              targetTypes,
              "release.config.cjs",
            )
          : service.checkPresetConfigSync(
              sourceTypes,
              targetTypes,
              "release.config.cjs",
            );

      expect(checkResult).toBe(expectedResult);
    },
  );

  it("validates skill marker sync and missing marker handling", () => {
    const skillFile = path.join(workspaceRoot, ".agents/skills/test/SKILL.md");
    fileContents.set(skillFile, "skill-content");

    vi.mocked(io.extractMarkerContent)
      .mockReturnValueOnce("| `fix` | desc |\n")
      .mockReturnValueOnce("| `tools` | desc |\n");
    vi.mocked(io.parseMarkdownTableValues)
      .mockReturnValueOnce(["fix"])
      .mockReturnValueOnce(["tools"]);

    expect(service.checkSkillSync(config, skillFile)).toBe(true);

    vi.mocked(io.extractMarkerContent)
      .mockReturnValueOnce(undefined)
      .mockReturnValueOnce("| `tools` | desc |\n");
    vi.mocked(io.parseMarkdownTableValues).mockReturnValueOnce(["tools"]);

    expect(service.checkSkillSync(config, skillFile)).toBe(false);
  });

  it("detects skill marker value and ordering drift", () => {
    const skillFile = path.join(workspaceRoot, ".agents/skills/test/SKILL.md");
    fileContents.set(skillFile, "skill-content");

    vi.mocked(io.extractMarkerContent)
      .mockReturnValueOnce("| `other` | desc |\n")
      .mockReturnValueOnce("| `tools` | desc |\n");
    vi.mocked(io.parseMarkdownTableValues)
      .mockReturnValueOnce(["other"])
      .mockReturnValueOnce(["tools"]);

    expect(service.checkSkillSync(config, skillFile)).toBe(false);

    vi.mocked(io.extractMarkerContent)
      .mockReturnValueOnce("| `fix` | desc |\n")
      .mockReturnValueOnce("| `alpha` | desc |\n| `tools` | desc |\n");
    vi.mocked(io.parseMarkdownTableValues)
      .mockReturnValueOnce(["fix"])
      .mockReturnValueOnce(["alpha", "tools"]);

    expect(
      service.checkSkillSync(
        {
          scopes: [
            { description: "tools scope", name: "tools" },
            { description: "alpha scope", name: "alpha" },
          ],
          types: config.types,
        },
        skillFile,
      ),
    ).toBe(false);
  });

  it("aggregates all skills and templates validation", () => {
    const skillFile = path.join(workspaceRoot, ".agents/skills/test/SKILL.md");
    const templateFile = path.join(
      workspaceRoot,
      ".github/ISSUE_TEMPLATE/issue.yml",
    );

    const checkSkillSyncSpy = vi
      .spyOn(service, "checkSkillSync")
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);

    expect(service.checkAllSkillsSync(config, [skillFile, skillFile])).toBe(
      false,
    );

    checkSkillSyncSpy.mockRestore();

    const checkIssueTemplateSyncSpy = vi
      .spyOn(service, "checkIssueTemplateSync")
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);

    expect(
      service.checkAllTemplatesSync(config, [templateFile, templateFile]),
    ).toBe(false);

    checkIssueTemplateSyncSpy.mockRestore();
  });
});
