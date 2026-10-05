import { appendFileSync } from "node:fs";

import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { LoggerService } from "@codebase/logging";

import { mockProcessExit } from "../../../testing/mocks";

import { IssueMetadataGithubService } from "./issue-metadata-github.service";
import { IssueMetadataCommand } from "./issue-metadata.command";
import { STEP_SUMMARY_VARIABLE } from "./issue-metadata.constants";
import { IssueMetadataService } from "./issue-metadata.service";

import type { GithubCliResult } from "./issue-metadata.types";

vi.mock("node:fs", () => ({
  appendFileSync: vi.fn<(filePath: string, content: string) => void>(),
}));

/** A `gh` call that ran and worked, carrying this document. */
const succeeded = (standardOutput: string): GithubCliResult => ({
  available: true,
  standardError: "",
  standardOutput,
  succeeded: true,
});

/** A `gh` call that ran and failed, saying this. */
const failed = (standardError: string): GithubCliResult => ({
  available: true,
  standardError,
  standardOutput: "",
  succeeded: false,
});

describe(IssueMetadataCommand, () => {
  let command: IssueMetadataCommand;
  let githubService: IssueMetadataGithubService;
  let reportLines: string[];

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        IssueMetadataCommand,
        IssueMetadataService,
        {
          provide: IssueMetadataGithubService,
          useValue: createMock<IssueMetadataGithubService>(),
        },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    command = await module.resolve(IssueMetadataCommand);
    githubService = await module.resolve(IssueMetadataGithubService);
  });

  beforeEach(() => {
    vi.clearAllMocks();

    for (const variableName of [
      "ISSUE_BODY",
      "ISSUE_LABELS",
      "ISSUE_NUMBER",
      STEP_SUMMARY_VARIABLE,
    ]) {
      Reflect.deleteProperty(process.env, variableName);
    }

    reportLines = [];
    vi.spyOn(console, "info").mockImplementation((line: unknown): void => {
      reportLines.push(String(line));
    });
    vi.spyOn(console, "warn").mockImplementation((line: unknown): void => {
      reportLines.push(String(line));
    });
    vi.mocked(githubService.isAvailable).mockReturnValue(true);
    vi.mocked(githubService.describeFailure).mockImplementation(
      (result: GithubCliResult) =>
        result.standardError === "" ? "no output" : result.standardError,
    );
  });

  afterEach(() => {
    vi.mocked(appendFileSync).mockReset();
  });

  /** Runs the command and reports whether it exited non-zero. */
  const runCommand = async (
    passedParameters: string[] = [],
  ): Promise<boolean> => {
    const processExitSpy = mockProcessExit();

    try {
      await command.run(passedParameters);

      return false;
    } catch (error) {
      expect(error).toStrictEqual(new Error("process.exit:1"));

      return true;
    } finally {
      processExitSpy.mockRestore();
    }
  };

  /** Puts a valid, template-submitted issue in the environment. */
  const setValidEnvironment = (): void => {
    process.env["ISSUE_BODY"] = [
      "### Type",
      "",
      "feat",
      "",
      "### Scope",
      "",
      "lexico",
      "",
    ].join("\n");
    process.env["ISSUE_LABELS"] = JSON.stringify([
      { name: "scope:lexico" },
      { name: "source:human" },
      { name: "type:feat" },
    ]);
    process.env["ISSUE_NUMBER"] = "7";
  };

  it("is defined", () => {
    expect.hasAssertions();
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    expect.hasAssertions();

    const module = await Test.createTestingModule({
      providers: [
        IssueMetadataCommand,
        IssueMetadataService,
        {
          provide: IssueMetadataGithubService,
          useValue: createMock<IssueMetadataGithubService>(),
        },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();
    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("IssueMetadataCommand");
  });

  describe("the environment input mode", () => {
    it("passes a valid issue without calling gh", async () => {
      expect.hasAssertions();

      setValidEnvironment();

      await expect(runCommand()).resolves.toBe(false);
      expect(githubService.run).not.toHaveBeenCalled();
      expect(reportLines).toStrictEqual(["✅ Issue metadata is valid"]);
    });

    it("reports every failure and the commands that fix them", async () => {
      expect.hasAssertions();

      process.env["ISSUE_BODY"] = "Plain issue, no template.";
      process.env["ISSUE_LABELS"] = "[]";
      process.env["ISSUE_NUMBER"] = "7";

      await expect(runCommand()).resolves.toBe(true);
      expect(reportLines).toStrictEqual([
        "❌ Issue metadata is invalid",
        "",
        "- ❌ Expected exactly one type label (found: none)",
        "- ❌ No scope label",
        "- ❌ Expected exactly one source label: source:agent or source:human (found: none)",
        "",
        "🔧 Fix with:",
        "",
        "- add exactly one source label, either:",
        "- gh issue edit 7 --add-label source:agent",
        "- gh issue edit 7 --add-label source:human",
      ]);
    });

    it("names a placeholder when no number was supplied", async () => {
      expect.hasAssertions();

      process.env["ISSUE_BODY"] = "Plain issue, no template.";
      process.env["ISSUE_LABELS"] = "[]";

      await expect(runCommand()).resolves.toBe(true);
      expect(reportLines).toContain(
        "- gh issue edit <number> --add-label source:agent",
      );
    });

    it("reports an incomplete environment with the usage", async () => {
      expect.hasAssertions();

      await expect(runCommand()).resolves.toBe(true);
      expect(reportLines).toStrictEqual([
        "❌ Expected an issue number, or ISSUE_BODY and ISSUE_LABELS in the environment",
        "",
        "Usage: validation issue-metadata <issue-number>",
        "   or: validation issue-metadata --all",
        "   or: ISSUE_BODY=… ISSUE_LABELS=… validation issue-metadata",
      ]);
    });

    it("reports a labels document that is not JSON", async () => {
      expect.hasAssertions();

      setValidEnvironment();
      process.env["ISSUE_LABELS"] = "not json";

      await expect(runCommand()).resolves.toBe(true);
      expect(reportLines[0]).toContain(
        "❌ Unable to parse ISSUE_LABELS as JSON: ",
      );
    });
  });

  describe("the live input mode", () => {
    it("reads the issue through gh issue view", async () => {
      expect.hasAssertions();

      vi.mocked(githubService.run).mockReturnValue(
        succeeded(
          JSON.stringify({
            body: "### Type\n\nfeat\n\n### Scope\n\nlexico\n",
            labels: [
              { name: "scope:lexico" },
              { name: "source:human" },
              { name: "type:feat" },
            ],
          }),
        ),
      );

      await expect(runCommand(["7"])).resolves.toBe(false);
      expect(githubService.run).toHaveBeenCalledWith([
        "issue",
        "view",
        "7",
        "--json",
        "body,labels",
      ]);
    });

    it("prefers the argument over ISSUE_NUMBER in remediation commands", async () => {
      expect.hasAssertions();

      process.env["ISSUE_NUMBER"] = "99";
      vi.mocked(githubService.run).mockReturnValue(
        succeeded(JSON.stringify({ body: "no template", labels: [] })),
      );

      await expect(runCommand(["7"])).resolves.toBe(true);
      expect(reportLines).toContain(
        "- gh issue edit 7 --add-label source:agent",
      );
    });

    it("reports a gh that is not available", async () => {
      expect.hasAssertions();

      vi.mocked(githubService.isAvailable).mockReturnValue(false);

      await expect(runCommand(["7"])).resolves.toBe(true);
      expect(reportLines[0]).toBe(
        "❌ Unable to read issue 7: gh is not available",
      );
    });

    it("reports a failed gh issue view", async () => {
      expect.hasAssertions();

      vi.mocked(githubService.run).mockReturnValue(failed("no such issue"));

      await expect(runCommand(["7"])).resolves.toBe(true);
      expect(reportLines[0]).toBe(
        "❌ Unable to read issue 7: gh issue view failed (no such issue)",
      );
    });

    it("refuses an argument that is not a number", async () => {
      expect.hasAssertions();

      await expect(runCommand(["seven"])).resolves.toBe(true);
      expect(reportLines[0]).toBe("❌ Not an issue number: seven");
    });

    it("refuses more than one argument", async () => {
      expect.hasAssertions();

      await expect(runCommand(["7", "8"])).resolves.toBe(true);
      expect(reportLines[0]).toBe(
        "❌ Expected at most one argument, the issue number",
      );
    });
  });

  describe("the step summary", () => {
    it("mirrors the report when the variable is set", async () => {
      expect.hasAssertions();

      setValidEnvironment();
      process.env[STEP_SUMMARY_VARIABLE] = "/tmp/summary";

      await expect(runCommand()).resolves.toBe(false);
      expect(appendFileSync).toHaveBeenCalledWith(
        "/tmp/summary",
        "✅ Issue metadata is valid\n",
        "utf8",
      );
    });

    it("writes nothing when the variable is unset", async () => {
      expect.hasAssertions();

      setValidEnvironment();

      await expect(runCommand()).resolves.toBe(false);
      expect(appendFileSync).not.toHaveBeenCalled();
    });

    it("logs a warning when writing step summary throws an error", async () => {
      expect.hasAssertions();

      setValidEnvironment();
      process.env[STEP_SUMMARY_VARIABLE] = "/tmp/summary";
      vi.mocked(appendFileSync).mockImplementationOnce(() => {
        throw new Error("EACCES");
      });

      await expect(runCommand()).resolves.toBe(false);
      expect(reportLines).toContain(
        "⚠️ Unable to write the report to GITHUB_STEP_SUMMARY",
      );
    });

    it("writes nothing when the variable is empty", async () => {
      expect.hasAssertions();

      setValidEnvironment();
      process.env[STEP_SUMMARY_VARIABLE] = "";

      await expect(runCommand()).resolves.toBe(false);
      expect(appendFileSync).not.toHaveBeenCalled();
    });

    it("cannot turn a passing issue into a failing one", async () => {
      expect.hasAssertions();

      setValidEnvironment();
      process.env[STEP_SUMMARY_VARIABLE] = "/tmp/summary";
      vi.mocked(appendFileSync).mockImplementation((): never => {
        throw new Error("no space left on device");
      });

      await expect(runCommand()).resolves.toBe(false);
      expect(reportLines).toContain(
        "⚠️ Unable to write the report to GITHUB_STEP_SUMMARY",
      );
    });
  });

  describe("bulk audit mode (--all)", () => {
    it("passes when all open issues are compliant", async () => {
      expect.hasAssertions();

      vi.mocked(githubService.listOpenIssues).mockReturnValue({
        issues: [
          {
            body: "### Type\n\nfeat\n\n### Scope\n\nlexico\n",
            labels: [
              { name: "scope:lexico" },
              { name: "source:agent" },
              { name: "type:feat" },
            ],
            number: 1,
            title: "feat(lexico): ✨ feature",
          },
        ],
        success: true,
      });

      await expect(runCommand(["--all"])).resolves.toBe(false);
      expect(reportLines).toContain(
        "✅ All 1 open issues and hierarchy relationships are compliant",
      );
    });

    it("fails when gh is not available", async () => {
      expect.hasAssertions();

      vi.mocked(githubService.isAvailable).mockReturnValue(false);

      await expect(runCommand(["--all"])).resolves.toBe(true);
      expect(reportLines[0]).toBe(
        "❌ Unable to list open issues: gh is not available",
      );
    });

    it("fails when listing open issues errors", async () => {
      expect.hasAssertions();

      vi.mocked(githubService.listOpenIssues).mockReturnValue({
        error: "rate limit exceeded",
        success: false,
      });

      await expect(runCommand(["--all"])).resolves.toBe(true);
      expect(reportLines[0]).toBe(
        "❌ Unable to list open issues: rate limit exceeded",
      );
    });

    it("fails when non-compliant issues are found", async () => {
      expect.hasAssertions();

      vi.mocked(githubService.listOpenIssues).mockReturnValue({
        issues: [
          {
            body: "no template",
            labels: [],
            number: 1,
            title: "broken issue",
          },
        ],
        success: true,
      });

      await expect(runCommand(["--all"])).resolves.toBe(true);
      expect(reportLines[0]).toContain(
        "❌ Found 3 compliance issue(s) across 1 open issue(s)",
      );
    });

    it("supports parseAllOption and runs with options all: true", async () => {
      expect.hasAssertions();

      expect(command.parseAllOption()).toBe(true);

      vi.mocked(githubService.listOpenIssues).mockReturnValue({
        issues: [],
        success: true,
      });

      await expect(command.run([], { all: true })).resolves.toBeUndefined();
    });
  });
});
