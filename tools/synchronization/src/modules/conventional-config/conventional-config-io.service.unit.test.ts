import { writeFileSync } from "node:fs";
import path from "node:path";

import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logging";

import { ConventionalConfigIoService } from "./conventional-config-io.service";

import type { ReleaseConfig, Type } from "./conventional-config.types";

const fileContents = new Map<string, string>();
const requiredModules = new Map<string, unknown>();

vi.mock("node:fs", () => {
  return {
    readFileSync: vi.fn<(filePath: string) => string>((filePath: string) => {
      const value = fileContents.get(filePath);
      if (value === undefined) {
        throw new Error(`File not found: ${filePath}`);
      }
      return value;
    }),
    writeFileSync: vi.fn<(filePath: string, content: string) => void>(
      (filePath: string, content: string) => {
        fileContents.set(filePath, content);
      },
    ),
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

describe(ConventionalConfigIoService, () => {
  let logger: LoggerService;
  let service: ConventionalConfigIoService;

  const workspaceRoot = process.cwd();
  const releaseConfigFile = path.join(
    workspaceRoot,
    "configuration/release.config.cjs",
  );
  const settingsFile = path.join(workspaceRoot, ".vscode/settings.json");

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ConventionalConfigIoService,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    logger = await module.resolve(LoggerService);
    service = await module.resolve(ConventionalConfigIoService);
  });

  beforeEach(() => {
    fileContents.clear();
    requiredModules.clear();
    vi.clearAllMocks();
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("formats scopes and markdown tables", () => {
    expect(
      service.formatScopesForSettings([
        { description: "first", name: "alpha" },
        { description: "second", name: "beta" },
      ]),
    ).toBe('    "alpha", // first\n    "beta" // second');

    expect(
      service.generateMarkdownTable(
        [
          { description: "first", value: "alpha" },
          { description: "second", value: "beta" },
        ],
        { column1: "Scope", column2: "Description" },
      ),
    ).toContain("| `alpha` | first |");
  });

  it("extracts and replaces marker blocks", () => {
    const content = ["<!-- types-start -->", "old", "<!-- types-end -->"].join(
      "\n",
    );

    expect(service.extractMarkerContent(content, "types")).toContain("old");
    expect(service.extractMarkerContent(content, "missing")).toBeUndefined();
    expect(service.replaceMarkerContent(content, "types", "new")).toContain(
      "<!-- types-start -->\n\nnew\n\n<!-- types-end -->",
    );
  });

  it("parses issue template dropdown options and markdown values", () => {
    const issueTemplate = [
      "# <!-- scopes-start -->",
      "options:",
      "        - alpha",
      "        - beta",
      "validations:",
      "# <!-- scopes-end -->",
    ].join("\n");

    expect(
      service.parseIssueTemplateDropdown(issueTemplate, "scopes"),
    ).toStrictEqual(["alpha", "beta"]);
    expect(
      service.parseIssueTemplateDropdown(issueTemplate, "types"),
    ).toStrictEqual([]);

    const markdownTable = ["| `alpha` | desc |", "| `beta` | desc |"].join(
      "\n",
    );

    expect(service.parseMarkdownTableValues(markdownTable)).toStrictEqual([
      "alpha",
      "beta",
    ]);
  });

  it("returns empty parsed values when issue template or markdown rows are missing", () => {
    expect(
      service.parseIssueTemplateDropdown("no markers", "scopes"),
    ).toStrictEqual([]);
    expect(
      service.parseIssueTemplateDropdown(
        [
          "# <!-- scopes-start -->",
          "options:",
          "        - alpha",
          "        malformed",
          "validations:",
          "# <!-- scopes-end -->",
        ].join("\n"),
        "scopes",
      ),
    ).toStrictEqual(["alpha"]);

    expect(service.parseMarkdownTableValues("not-a-table-row")).toStrictEqual(
      [],
    );
    expect(
      service.parseMarkdownTableValues("| alpha | missing-code-format |"),
    ).toStrictEqual([]);
  });

  it("parses settings scopes from JSON5 content", () => {
    const settingsContent =
      '{ "conventionalCommits.scopes": ["alpha", "beta"] }';

    expect(service.parseSettingsScopes(settingsContent)).toStrictEqual([
      "alpha",
      "beta",
    ]);
  });

  it("throws when settings scopes key is missing", () => {
    expect(() => service.parseSettingsScopes("{}")).toThrow(
      'Could not find "conventionalCommits.scopes" array in settings.json',
    );
  });

  it("appends missing release rules and preset types", () => {
    const baseContent = [
      "module.exports = {",
      "  plugins: [",
      "    ['@semantic-release/commit-analyzer', {",
      "      releaseRules: [",
      '        { type: "feat", release: "minor" },',
      "      ],",
      "    }],",
      "    ['@semantic-release/release-notes-generator', {",
      "      presetConfig: {",
      "        types: [",
      '          { type: "feat", section: "Features", hidden: false },',
      "        ],",
      "      },",
      "    }],",
      "  ],",
      "};",
    ].join("\n");
    const sourceTypes: Type[] = [
      { code: "feat", description: "feature", emoji: "✨", name: "feat" },
      { code: "fix", description: "bugfix", emoji: "🐛", name: "fix" },
    ];

    const withRules = service.appendToReleaseRules(baseContent, ["fix"]);
    const withTypes = service.appendToPresetTypes(
      withRules,
      ["fix"],
      sourceTypes,
    );

    expect(withTypes).toContain('{ type: "fix", release: false }');
    expect(withTypes).toContain(
      '{ type: "fix", section: "⚠️ Fix", hidden: true }',
    );
  });

  it("returns unchanged content when no release or preset types are missing", () => {
    const content = "module.exports = { plugins: [] };";

    expect(service.appendToReleaseRules(content, [])).toBe(content);
    expect(
      service.appendToPresetTypes(
        content,
        [],
        [{ code: "feat", description: "feature", emoji: "✨", name: "feat" }],
      ),
    ).toBe(content);
  });

  it("adds preset type entry with fallback description when source type is missing", () => {
    const content = ["presetConfig: {", "  types: [", "  ],", "}"].join("\n");

    const updated = service.appendToPresetTypes(content, ["unknown"], []);

    expect(updated).toContain("⚠️ Added by sync — add description");
  });

  it("reads release config type values", () => {
    const releaseConfig: ReleaseConfig = {
      plugins: [
        [
          "@semantic-release/commit-analyzer",
          {
            releaseRules: [
              { release: "minor", type: "feat" },
              { release: "patch", type: "fix" },
              { release: false },
            ],
          },
        ],
        [
          "@semantic-release/release-notes-generator",
          {
            presetConfig: {
              types: [
                { section: "Features", type: "feat" },
                { section: "Bug Fixes", type: "fix" },
              ],
            },
          },
        ],
      ],
    };

    expect(service.getReleaseRulesTypes(releaseConfig)).toStrictEqual([
      "feat",
      "fix",
    ]);
    expect(service.getPresetConfigTypes(releaseConfig)).toStrictEqual([
      "feat",
      "fix",
    ]);
  });

  it("writes synchronized issue template and settings content", () => {
    const issueTemplateFile = path.join(
      workspaceRoot,
      ".github/ISSUE_TEMPLATE/issue.yml",
    );
    const issueTemplate = [
      "# <!-- types-start -->",
      "options:",
      "        - stale",
      "validations:",
      "# <!-- types-end -->",
      "# <!-- scopes-start -->",
      "options:",
      "        - stale",
      "validations:",
      "# <!-- scopes-end -->",
    ].join("\n");

    fileContents.set(issueTemplateFile, issueTemplate);
    service.writeIssueTemplateSync(
      {
        scopes: [
          { description: "first", name: "alpha" },
          { description: "second", name: "beta" },
        ],
        types: [
          { code: "fix", description: "fixing", emoji: "🐛", name: "fix" },
        ],
      },
      issueTemplateFile,
    );

    expect(writeFileSync).toHaveBeenCalledWith(
      issueTemplateFile,
      expect.stringContaining("        - alpha\n        - beta"),
      "utf8",
    );
    expect(writeFileSync).toHaveBeenCalledWith(
      issueTemplateFile,
      expect.stringContaining("        - fix"),
      "utf8",
    );
    expect(logger.info).toHaveBeenCalledWith(
      "🔄 Syncing type and scope dropdowns",
      undefined,
      { templateName: path.relative(workspaceRoot, issueTemplateFile) },
    );
    expect(logger.info).toHaveBeenCalledWith(
      "📇 Synced types and scopes",
      undefined,
      { templateName: path.relative(workspaceRoot, issueTemplateFile) },
    );

    fileContents.set(
      settingsFile,
      '{\n  "conventionalCommits.scopes": [\n    "stale"\n  ]\n}',
    );
    service.writeSettingsSync([
      { description: "first", name: "alpha" },
      { description: "second", name: "beta" },
    ]);

    expect(writeFileSync).toHaveBeenCalledWith(
      settingsFile,
      expect.stringContaining('"alpha", // first'),
      "utf8",
    );
    expect(logger.info).toHaveBeenCalledWith("🔄 Syncing settings.json scopes");
    expect(logger.info).toHaveBeenCalledWith(
      "📇 Synced scopes in settings.json",
    );
  });

  it("rewrites issue template dropdowns without accumulating blank lines", () => {
    const issueTemplateFile = path.join(
      workspaceRoot,
      ".github/ISSUE_TEMPLATE/issue.yml",
    );
    const issueTemplate = [
      "body:",
      "  # <!-- types-start -->",
      "  - type: dropdown",
      "    id: type",
      "    attributes:",
      "      label: Type",
      "      options:",
      "        - stale",
      "    validations:",
      "      required: true",
      "  # <!-- types-end -->",
      "",
      "  # <!-- scopes-start -->",
      "  - type: dropdown",
      "    id: scope",
      "    attributes:",
      "      label: Scope",
      "      options:",
      "        - stale",
      "    validations:",
      "      required: true",
      "  # <!-- scopes-end -->",
      "",
    ].join("\n");
    const config = {
      scopes: [
        { description: "first", name: "alpha" },
        { description: "second", name: "beta" },
      ],
      types: [{ code: "fix", description: "fixing", emoji: "🐛", name: "fix" }],
    };

    fileContents.set(issueTemplateFile, issueTemplate);
    service.writeIssueTemplateSync(config, issueTemplateFile);
    const firstWrite = fileContents.get(issueTemplateFile);
    service.writeIssueTemplateSync(config, issueTemplateFile);
    const secondWrite = fileContents.get(issueTemplateFile);

    expect(firstWrite).toContain("        - fix\n    validations:");
    expect(firstWrite).toContain(
      "        - alpha\n        - beta\n    validations:",
    );
    expect(firstWrite).not.toMatch(/\n[ \t]*\n[ \t]*validations:/);
    expect(secondWrite).toBe(firstWrite);
  });

  it("throws when issue template markers are missing", () => {
    const issueTemplateFile = path.join(
      workspaceRoot,
      ".github/ISSUE_TEMPLATE/issue.yml",
    );
    fileContents.set(issueTemplateFile, "name: issue");

    expect(() =>
      service.writeIssueTemplateSync(
        {
          scopes: [],
          types: [
            { code: "fix", description: "fixing", emoji: "🐛", name: "fix" },
          ],
        },
        issueTemplateFile,
      ),
    ).toThrow("Could not find types markers");
  });

  it("throws when settings scope array pattern is missing", () => {
    fileContents.set(settingsFile, '{"editor.formatOnSave": true}');

    expect(() =>
      service.writeSettingsSync([{ description: "first", name: "alpha" }]),
    ).toThrow(
      'Could not find "conventionalCommits.scopes" array in settings.json',
    );
  });

  it("writes synchronized release config and skill markers", () => {
    const releaseConfig: ReleaseConfig = {
      plugins: [
        [
          "@semantic-release/commit-analyzer",
          { releaseRules: [{ release: "minor", type: "feat" }] },
        ],
        [
          "@semantic-release/release-notes-generator",
          {
            presetConfig: {
              types: [{ section: "Features", type: "feat" }],
            },
          },
        ],
      ],
    };
    const releaseConfigSource = [
      "module.exports = {",
      "  plugins: [",
      "    ['@semantic-release/commit-analyzer', { releaseRules: [",
      '      { type: "feat", release: "minor" },',
      "    ] }],",
      "    ['@semantic-release/release-notes-generator', { presetConfig: { types: [",
      '      { type: "feat", section: "Features", hidden: false },',
      "    ] } }],",
      "  ],",
      "};",
    ].join("\n");

    requiredModules.set(releaseConfigFile, releaseConfig);
    fileContents.set(releaseConfigFile, releaseConfigSource);
    service.writeReleaseConfigSync([
      { code: "feat", description: "feature", emoji: "✨", name: "feat" },
      { code: "fix", description: "bugfix", emoji: "🐛", name: "fix" },
    ]);

    expect(writeFileSync).toHaveBeenCalledWith(
      releaseConfigFile,
      expect.stringContaining('{ type: "fix", release: false }'),
      "utf8",
    );
    expect(logger.info).toHaveBeenCalledWith("🔄 Syncing types", undefined, {
      relativeFile: path.relative(workspaceRoot, releaseConfigFile),
    });
    expect(logger.info).toHaveBeenCalledWith("🏷️ Synced types", undefined, {
      relativeFile: path.relative(workspaceRoot, releaseConfigFile),
    });

    const skillFile = path.join(workspaceRoot, ".agents/skills/test/SKILL.md");
    fileContents.set(
      skillFile,
      [
        "<!-- types-start -->",
        "old",
        "<!-- types-end -->",
        "<!-- scopes-start -->",
        "old",
        "<!-- scopes-end -->",
      ].join("\n"),
    );
    service.writeSkillSync(
      {
        scopes: [{ description: "scope", name: "tools" }],
        types: [
          { code: "fix", description: "fixing", emoji: "🐛", name: "fix" },
        ],
      },
      skillFile,
    );

    expect(writeFileSync).toHaveBeenCalledWith(
      skillFile,
      expect.stringContaining("| `fix` | fixing |"),
      "utf8",
    );
    expect(logger.info).toHaveBeenCalledWith(
      "🔄 Syncing types and scopes",
      undefined,
      { skillName: path.relative(workspaceRoot, skillFile) },
    );
    expect(logger.info).toHaveBeenCalledWith(
      "📇 Synced types and scopes",
      undefined,
      { skillName: path.relative(workspaceRoot, skillFile) },
    );
  });
});
