import * as filesystem from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logging";

import { ConventionalConfigIoService } from "./conventional-config-io.service";
import { ConventionalConfigValidatorsService } from "./conventional-config-validators.service";
import {
  SYNC_CONVENTIONAL_CONFIG_ISSUE_TEMPLATE_FILES,
  SYNC_CONVENTIONAL_CONFIG_MARKDOWN_FILES,
} from "./conventional-config.constants";
import { ConventionalConfigService } from "./conventional-config.service";

import type {
  ConventionalConfig,
  ReleaseConfig,
  SyncContext,
} from "./conventional-config.types";

function resolveWorkspaceRoot(): string {
  const currentFilePath = fileURLToPath(import.meta.url);
  const currentFileDirectory = path.dirname(currentFilePath);
  const workspaceRoot = path.resolve(currentFileDirectory, "../../../../..");

  if (!filesystem.existsSync(path.join(workspaceRoot, "pnpm-workspace.yaml"))) {
    throw new Error("Could not find workspace root (pnpm-workspace.yaml)");
  }

  return workspaceRoot;
}

const fileContents = new Map<string, string>();
const requiredModules = new Map<string, unknown>();

vi.mock("node:fs", async (importOriginal) => {
  const importedModule = await importOriginal();
  const module =
    typeof importedModule === "object" && importedModule !== null
      ? importedModule
      : {};

  return {
    ...module,
    readFileSync: vi.fn<(filePath: string) => string>((filePath: string) => {
      const value = fileContents.get(filePath);
      if (value === undefined) {
        throw new Error(`File not found: ${filePath}`);
      }
      return value;
    }),
  };
});

vi.mock("node:module", () => {
  return {
    createRequire: vi.fn<() => (modulePath: string) => unknown>(() => {
      return (modulePath: string): unknown => {
        const value = requiredModules.get(modulePath);
        if (value === undefined) {
          throw new Error(`Module not found: ${modulePath}`);
        }
        return value;
      };
    }),
  };
});

describe(ConventionalConfigService, () => {
  const workspaceRoot = resolveWorkspaceRoot();

  let io: ConventionalConfigIoService;
  let logger: LoggerService;
  let service: ConventionalConfigService;
  let validators: ConventionalConfigValidatorsService;

  const conventionalConfigFile = path.join(
    workspaceRoot,
    "configuration/conventional.config.cjs",
  );
  const releaseConfigFile = path.join(
    workspaceRoot,
    "configuration/release.config.cjs",
  );
  const settingsFile = path.join(workspaceRoot, ".vscode/settings.json");
  const skillFiles = SYNC_CONVENTIONAL_CONFIG_MARKDOWN_FILES.map((skillFile) =>
    path.join(workspaceRoot, skillFile),
  );
  const templateFiles = SYNC_CONVENTIONAL_CONFIG_ISSUE_TEMPLATE_FILES.map(
    (templateFile) => path.join(workspaceRoot, templateFile),
  );

  const conventionalConfig: ConventionalConfig = {
    scopes: [{ description: "tools scope", name: "tools" }],
    types: [{ code: "fix", description: "fixing", emoji: "🐛", name: "fix" }],
  };
  const releaseConfig: ReleaseConfig = {
    plugins: [
      [
        "@semantic-release/commit-analyzer",
        { releaseRules: [{ release: "patch", type: "fix" }] },
      ],
      [
        "@semantic-release/release-notes-generator",
        {
          presetConfig: {
            types: [{ section: "Fixes", type: "fix" }],
          },
        },
      ],
    ],
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ConventionalConfigService,
        {
          provide: ConventionalConfigIoService,
          useValue: createMock<ConventionalConfigIoService>(),
        },
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: ConventionalConfigValidatorsService,
          useValue: createMock<ConventionalConfigValidatorsService>(),
        },
      ],
    }).compile();

    io = await module.resolve(ConventionalConfigIoService);
    logger = await module.resolve(LoggerService);
    service = await module.resolve(ConventionalConfigService);
    validators = await module.resolve(ConventionalConfigValidatorsService);
  });

  beforeEach(() => {
    fileContents.clear();
    requiredModules.clear();
    vi.clearAllMocks();

    requiredModules.set(conventionalConfigFile, conventionalConfig);
    requiredModules.set(releaseConfigFile, releaseConfig);
    fileContents.set(
      settingsFile,
      '{ "conventionalCommits.scopes": ["tools"] }',
    );
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("passes check mode when all validations succeed", () => {
    vi.mocked(validators.checkSettingsSync).mockReturnValue(true);
    vi.mocked(validators.checkAllSkillsSync).mockReturnValue(true);
    vi.mocked(validators.checkAllTemplatesSync).mockReturnValue(true);
    vi.mocked(validators.checkReleaseRulesSync).mockReturnValue(true);
    vi.mocked(validators.checkPresetConfigSync).mockReturnValue(true);
    vi.mocked(io.getReleaseRulesTypes).mockReturnValue(["fix"]);
    vi.mocked(io.getPresetConfigTypes).mockReturnValue(["fix"]);

    service.handleCheckMode({
      config: conventionalConfig,
      scopeNames: ["tools"],
      settingsScopes: ["tools"],
      typeNames: ["fix"],
    });

    expect(logger.info).toHaveBeenCalledWith(
      "📇 Summarized the conventional-config check",
      undefined,
      {
        presetOk: true,
        releaseRulesOk: true,
        settingsOk: true,
        skillsOk: true,
        templatesOk: true,
      },
    );
    expect(logger.info).toHaveBeenCalledWith(
      "📇 Verified the conventional commit config",
    );
  });

  it("reports failure from check mode when any validation fails", () => {
    vi.mocked(validators.checkSettingsSync).mockReturnValue(false);
    vi.mocked(validators.checkAllSkillsSync).mockReturnValue(true);
    vi.mocked(validators.checkAllTemplatesSync).mockReturnValue(true);
    vi.mocked(validators.checkReleaseRulesSync).mockReturnValue(true);
    vi.mocked(validators.checkPresetConfigSync).mockReturnValue(true);
    vi.mocked(io.getReleaseRulesTypes).mockReturnValue(["fix"]);
    vi.mocked(io.getPresetConfigTypes).mockReturnValue(["fix"]);

    // Reports rather than exits: the aggregate `synchronization` command runs
    // every check before exiting once, so drift here must not kill the process.
    const inSync = service.handleCheckMode({
      config: conventionalConfig,
      scopeNames: ["tools"],
      settingsScopes: [],
      typeNames: ["fix"],
    });

    expect(inSync).toBe(false);
    expect(logger.info).toHaveBeenCalledWith(
      "📇 Summarized the conventional-config check",
      undefined,
      {
        presetOk: true,
        releaseRulesOk: true,
        settingsOk: false,
        skillsOk: true,
        templatesOk: true,
      },
    );
    expect(logger.info).toHaveBeenCalledWith(
      "💡 Suggested a fix",
      undefined,
      expect.any(Object),
    );
  });

  it("returns early in write mode when everything is in sync", () => {
    vi.mocked(validators.checkSettingsSync).mockReturnValue(true);
    vi.mocked(validators.checkSkillSync).mockReturnValue(true);
    vi.mocked(validators.checkIssueTemplateSync).mockReturnValue(true);

    service.handleWriteMode({
      config: conventionalConfig,
      scopeNames: ["tools"],
      settingsScopes: ["tools"],
      typeNames: ["fix"],
    });

    expect(logger.info).toHaveBeenCalledWith(
      "📇 Verified everything was already in sync",
    );
    expect(io.writeSettingsSync).not.toHaveBeenCalled();
  });

  it("writes out-of-sync settings, skills, and templates", () => {
    vi.mocked(validators.checkSettingsSync).mockReturnValue(false);
    vi.mocked(validators.checkSkillSync).mockReturnValue(false);
    vi.mocked(validators.checkIssueTemplateSync).mockReturnValue(false);
    vi.mocked(io.getReleaseRulesTypes).mockReturnValue([]);
    vi.mocked(io.getPresetConfigTypes).mockReturnValue([]);

    service.handleWriteMode({
      config: conventionalConfig,
      scopeNames: ["tools"],
      settingsScopes: [],
      typeNames: ["fix"],
    });

    expect(io.writeSettingsSync).toHaveBeenCalledWith(
      conventionalConfig.scopes,
    );

    for (const skillFile of skillFiles) {
      expect(io.writeSkillSync).toHaveBeenCalledWith(
        conventionalConfig,
        skillFile,
      );
    }
    for (const templateFile of templateFiles) {
      expect(io.writeIssueTemplateSync).toHaveBeenCalledWith(
        conventionalConfig,
        templateFile,
      );
    }

    expect(io.writeReleaseConfigSync).toHaveBeenCalledWith(
      conventionalConfig.types,
    );
  });

  it.each([
    {
      expectedWriteCalls: [[conventionalConfig.types]],
      presetConfigTypes: [],
      releaseRuleTypes: ["fix"],
      scenarioName: "syncs release config when only preset types are missing",
    },
    {
      expectedWriteCalls: [[conventionalConfig.types]],
      presetConfigTypes: ["fix"],
      releaseRuleTypes: [],
      scenarioName: "syncs release config when only release rules are missing",
    },
    {
      expectedWriteCalls: [],
      presetConfigTypes: ["fix"],
      releaseRuleTypes: ["fix"],
      scenarioName:
        "does not write release config when no release types are missing",
    },
  ])(
    "$scenarioName",
    ({ expectedWriteCalls, presetConfigTypes, releaseRuleTypes }) => {
      vi.mocked(validators.checkSettingsSync).mockReturnValue(true);
      vi.mocked(validators.checkSkillSync).mockReturnValue(false);
      vi.mocked(validators.checkIssueTemplateSync).mockReturnValue(true);
      vi.mocked(io.getReleaseRulesTypes).mockReturnValue(releaseRuleTypes);
      vi.mocked(io.getPresetConfigTypes).mockReturnValue(presetConfigTypes);

      service.handleWriteMode({
        config: conventionalConfig,
        scopeNames: ["tools"],
        settingsScopes: ["tools"],
        typeNames: ["fix"],
      });

      expect(vi.mocked(io.writeReleaseConfigSync).mock.calls).toStrictEqual(
        expectedWriteCalls,
      );
    },
  );

  it("loads conventional config from CommonJS module", () => {
    expect(service.loadConventionalConfig()).toStrictEqual(conventionalConfig);
  });

  it("dispatches runSynchronization for check and write modes", () => {
    const handleCheckModeSpy = vi
      .spyOn(service, "handleCheckMode")
      .mockReturnValue(true);
    const handleWriteModeSpy = vi
      .spyOn(service, "handleWriteMode")
      .mockImplementation(() => {});
    vi.mocked(io.parseSettingsScopes).mockReturnValue(["tools"]);

    service.runSynchronization("check");
    service.runSynchronization("write");

    expect(handleCheckModeSpy).toHaveBeenCalledWith({
      config: conventionalConfig,
      scopeNames: ["tools"],
      settingsScopes: ["tools"],
      typeNames: ["fix"],
    } satisfies SyncContext);
    expect(handleWriteModeSpy).toHaveBeenCalledWith({
      config: conventionalConfig,
      scopeNames: ["tools"],
      settingsScopes: ["tools"],
      typeNames: ["fix"],
    } satisfies SyncContext);

    handleCheckModeSpy.mockRestore();
    handleWriteModeSpy.mockRestore();
  });

  it("throws when workspace root cannot be resolved", async () => {
    const existsSyncSpy = vi
      .spyOn(filesystem, "existsSync")
      .mockReturnValue(false);

    await expect(
      Test.createTestingModule({
        providers: [
          ConventionalConfigService,
          {
            provide: ConventionalConfigIoService,
            useValue: createMock<ConventionalConfigIoService>(),
          },
          {
            provide: LoggerService,
            useValue: createMock<LoggerService>(),
          },
          {
            provide: ConventionalConfigValidatorsService,
            useValue: createMock<ConventionalConfigValidatorsService>(),
          },
        ],
      }).compile(),
    ).rejects.toThrow("Could not find workspace root (pnpm-workspace.yaml)");

    existsSyncSpy.mockRestore();
  });
});
