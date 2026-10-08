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

import { PullRequestMetadataGithubService } from "./pull-request-metadata-github.service";
import { PullRequestMetadataCommand } from "./pull-request-metadata.command";
import { STEP_SUMMARY_VARIABLE } from "./pull-request-metadata.constants";
import { PullRequestMetadataService } from "./pull-request-metadata.service";

import type { GithubCliResult } from "./pull-request-metadata.types";

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

describe(PullRequestMetadataCommand, () => {
  let command: PullRequestMetadataCommand;
  let githubService: PullRequestMetadataGithubService;
  let reportLines: string[];

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PullRequestMetadataCommand,
        PullRequestMetadataService,
        {
          provide: PullRequestMetadataGithubService,
          useValue: createMock<PullRequestMetadataGithubService>(),
        },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    command = await module.resolve(PullRequestMetadataCommand);
    githubService = await module.resolve(PullRequestMetadataGithubService);
  });

  beforeEach(() => {
    vi.clearAllMocks();

    for (const variableName of [
      "PULL_REQUEST_ASSIGNEES",
      "PULL_REQUEST_LABELS",
      "PULL_REQUEST_NUMBER",
      "PULL_REQUEST_TITLE",
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

  /** Puts a valid pull request in the environment. */
  const setValidEnvironment = (): void => {
    process.env["PULL_REQUEST_TITLE"] = "feat(lexico): ✨ add a page";
    process.env["PULL_REQUEST_LABELS"] = JSON.stringify([
      { name: "scope:lexico" },
      { name: "source:agent" },
      { name: "type:feat" },
    ]);
    process.env["PULL_REQUEST_ASSIGNEES"] = JSON.stringify([
      { login: "JimmyPaolini" },
    ]);
    process.env["PULL_REQUEST_NUMBER"] = "7";
  };

  it("is defined", () => {
    expect.hasAssertions();
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    expect.hasAssertions();

    const module = await Test.createTestingModule({
      providers: [
        PullRequestMetadataCommand,
        PullRequestMetadataService,
        {
          provide: PullRequestMetadataGithubService,
          useValue: createMock<PullRequestMetadataGithubService>(),
        },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();
    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith(
      "PullRequestMetadataCommand",
    );
  });

  describe("the environment input mode", () => {
    it("passes a valid pull request without calling gh", async () => {
      expect.hasAssertions();

      setValidEnvironment();

      await expect(runCommand()).resolves.toBe(false);
      expect(githubService.run).not.toHaveBeenCalled();
      expect(reportLines).toStrictEqual(["✅ Pull request metadata is valid"]);
    });

    it("reports every failure and the commands that fix them", async () => {
      expect.hasAssertions();

      process.env["PULL_REQUEST_TITLE"] = "feat(lexico): ✨ add a page";
      process.env["PULL_REQUEST_LABELS"] = JSON.stringify([
        { name: "do-not-merge" },
      ]);
      process.env["PULL_REQUEST_ASSIGNEES"] = "[]";
      process.env["PULL_REQUEST_NUMBER"] = "7";

      await expect(runCommand()).resolves.toBe(true);
      expect(reportLines).toStrictEqual([
        "❌ Pull request metadata is invalid",
        "",
        "- ❌ Expected exactly one type label: type:feat (found: none)",
        "- ❌ Missing scope label: scope:lexico",
        "- ❌ Blocked by the do-not-merge label",
        "- ❌ No assignee",
        "- ❌ Expected exactly one source label: source:agent or source:human (found: none)",
        "",
        "🔧 Fix with:",
        "",
        "- gh pr edit 7 --add-label type:feat",
        "- gh pr edit 7 --add-label scope:lexico",
        "- gh pr edit 7 --remove-label do-not-merge",
        "- gh pr edit 7 --add-assignee @me",
        "- add exactly one source label, either:",
        "- gh pr edit 7 --add-label source:agent",
        "- gh pr edit 7 --add-label source:human",
      ]);
    });

    it("names a placeholder when no number was supplied", async () => {
      expect.hasAssertions();

      process.env["PULL_REQUEST_TITLE"] = "feat(lexico): ✨ add a page";
      process.env["PULL_REQUEST_LABELS"] = JSON.stringify([
        { name: "scope:lexico" },
        { name: "source:agent" },
        { name: "type:feat" },
      ]);
      process.env["PULL_REQUEST_ASSIGNEES"] = "[]";

      await expect(runCommand()).resolves.toBe(true);
      expect(reportLines).toContain("- gh pr edit <number> --add-assignee @me");
    });

    it("reports a title that does not parse", async () => {
      expect.hasAssertions();

      setValidEnvironment();
      process.env["PULL_REQUEST_TITLE"] = "not a conventional title";

      await expect(runCommand()).resolves.toBe(true);
      expect(reportLines).toStrictEqual([
        "❌ Unable to parse type and scope from title: not a conventional title",
      ]);
    });

    it("reports a labels document that is not JSON", async () => {
      expect.hasAssertions();

      setValidEnvironment();
      process.env["PULL_REQUEST_LABELS"] = "not json";

      await expect(runCommand()).resolves.toBe(true);
      expect(reportLines[0]).toContain(
        "❌ Unable to parse PULL_REQUEST_LABELS as JSON: ",
      );
    });

    it("reports an incomplete environment with the usage", async () => {
      expect.hasAssertions();

      await expect(runCommand()).resolves.toBe(true);
      expect(reportLines).toStrictEqual([
        "❌ Expected a pull request number, or PULL_REQUEST_TITLE, PULL_REQUEST_LABELS, and PULL_REQUEST_ASSIGNEES in the environment",
        "",
        "Usage: validation pull-request-metadata <pull-request-number>",
        "   or: PULL_REQUEST_TITLE=… PULL_REQUEST_LABELS=… PULL_REQUEST_ASSIGNEES=… validation pull-request-metadata",
      ]);
    });
  });

  describe("the live input mode", () => {
    it("reads the pull request through gh pr view", async () => {
      expect.hasAssertions();

      vi.mocked(githubService.run).mockReturnValue(
        succeeded(
          JSON.stringify({
            assignees: [{ login: "JimmyPaolini" }],
            labels: [
              { name: "scope:lexico" },
              { name: "source:human" },
              { name: "type:feat" },
            ],
            title: "feat(lexico): ✨ add a page",
          }),
        ),
      );

      await expect(runCommand(["7"])).resolves.toBe(false);
      expect(githubService.run).toHaveBeenCalledWith([
        "pr",
        "view",
        "7",
        "--json",
        "assignees,labels,title",
      ]);
    });

    it("prefers the argument over PULL_REQUEST_NUMBER in remediationCommands", async () => {
      expect.hasAssertions();

      process.env["PULL_REQUEST_NUMBER"] = "99";
      vi.mocked(githubService.run).mockReturnValue(
        succeeded(
          JSON.stringify({
            assignees: [],
            labels: [
              { name: "scope:lexico" },
              { name: "source:human" },
              { name: "type:feat" },
            ],
            title: "feat(lexico): ✨ add a page",
          }),
        ),
      );

      await expect(runCommand(["7"])).resolves.toBe(true);
      expect(reportLines).toContain("- gh pr edit 7 --add-assignee @me");
    });

    it("reports a gh that is not available", async () => {
      expect.hasAssertions();

      vi.mocked(githubService.isAvailable).mockReturnValue(false);

      await expect(runCommand(["7"])).resolves.toBe(true);
      expect(reportLines[0]).toBe(
        "❌ Unable to read pull request 7: gh is not available",
      );
    });

    it("reports a failed gh pr view", async () => {
      expect.hasAssertions();

      vi.mocked(githubService.run).mockReturnValue(
        failed("no such pull request"),
      );

      await expect(runCommand(["7"])).resolves.toBe(true);
      expect(reportLines[0]).toBe(
        "❌ Unable to read pull request 7: gh pr view failed (no such pull request)",
      );
    });

    it("ignores a gh notice on standard error of a successful call", async () => {
      expect.hasAssertions();

      vi.mocked(githubService.run).mockReturnValue({
        available: true,
        standardError: "A new release of gh is available",
        standardOutput: JSON.stringify({
          assignees: [{ login: "JimmyPaolini" }],
          labels: [
            { name: "scope:lexico" },
            { name: "source:human" },
            { name: "type:feat" },
          ],
          title: "feat(lexico): ✨ add a page",
        }),
        succeeded: true,
      });

      await expect(runCommand(["7"])).resolves.toBe(false);
      expect(reportLines).toStrictEqual(["✅ Pull request metadata is valid"]);
    });

    it("refuses an argument that is not a number", async () => {
      expect.hasAssertions();

      await expect(runCommand(["seven"])).resolves.toBe(true);
      expect(reportLines[0]).toBe("❌ Not a pull request number: seven");
    });

    it("refuses more than one argument", async () => {
      expect.hasAssertions();

      await expect(runCommand(["7", "8"])).resolves.toBe(true);
      expect(reportLines[0]).toBe(
        "❌ Expected at most one argument, the pull request number",
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
        "✅ Pull request metadata is valid\n",
        "utf8",
      );
    });

    it("writes nothing when the variable is unset", async () => {
      expect.hasAssertions();

      setValidEnvironment();

      await expect(runCommand()).resolves.toBe(false);
      expect(appendFileSync).not.toHaveBeenCalled();
    });

    it("writes nothing when the variable is empty", async () => {
      expect.hasAssertions();

      setValidEnvironment();
      process.env[STEP_SUMMARY_VARIABLE] = "";

      await expect(runCommand()).resolves.toBe(false);
      expect(appendFileSync).not.toHaveBeenCalled();
    });

    it("cannot turn a passing pull request into a failing one", async () => {
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
});
