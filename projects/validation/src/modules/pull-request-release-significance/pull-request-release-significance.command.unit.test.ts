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

import { PullRequestReleaseSignificanceGithubService } from "./pull-request-release-significance-github.service";
import { PullRequestReleaseSignificanceCommand } from "./pull-request-release-significance.command";
import { STEP_SUMMARY_VARIABLE } from "./pull-request-release-significance.constants";
import { PullRequestReleaseSignificanceService } from "./pull-request-release-significance.service";

import type { GithubCliResult } from "./pull-request-release-significance.types";

vi.mock("node:fs", () => ({
  appendFileSync: vi.fn<(filePath: string, content: string) => void>(),
}));

/** What the mocked `require` hands back for `release.config.cjs`. */
const releaseConfig: unknown = {
  plugins: [
    [
      "@semantic-release/commit-analyzer",
      {
        releaseRules: [
          { release: "minor", type: "feat" },
          { release: false, type: "ci" },
        ],
      },
    ],
  ],
};

vi.mock("node:module", () => ({
  createRequire: () => (): unknown => releaseConfig,
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

/** A `gh pr view --json title,commits` document. */
const pullRequestDocument = (options: {
  commits?: { messageHeadline: string; oid: string }[];
  title: string;
}): string =>
  JSON.stringify({ commits: options.commits ?? [], title: options.title });

describe(PullRequestReleaseSignificanceCommand, () => {
  let command: PullRequestReleaseSignificanceCommand;
  let githubService: PullRequestReleaseSignificanceGithubService;
  let reportLines: string[];

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PullRequestReleaseSignificanceCommand,
        PullRequestReleaseSignificanceService,
        {
          provide: PullRequestReleaseSignificanceGithubService,
          useValue: createMock<PullRequestReleaseSignificanceGithubService>(),
        },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    command = await module.resolve(PullRequestReleaseSignificanceCommand);
    githubService = await module.resolve(
      PullRequestReleaseSignificanceGithubService,
    );
  });

  beforeEach(() => {
    vi.clearAllMocks();
    Reflect.deleteProperty(process.env, "PULL_REQUEST_NUMBER");
    Reflect.deleteProperty(process.env, STEP_SUMMARY_VARIABLE);

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

  it("is defined", () => {
    expect.hasAssertions();
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    expect.hasAssertions();

    const module = await Test.createTestingModule({
      providers: [
        PullRequestReleaseSignificanceCommand,
        PullRequestReleaseSignificanceService,
        {
          provide: PullRequestReleaseSignificanceGithubService,
          useValue: createMock<PullRequestReleaseSignificanceGithubService>(),
        },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();
    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith(
      "PullRequestReleaseSignificanceCommand",
    );
  });

  describe("resolving the pull request number", () => {
    it("reports an incomplete input with the usage", async () => {
      expect.hasAssertions();

      await expect(runCommand()).resolves.toBe(true);
      expect(reportLines).toStrictEqual([
        "❌ Expected a pull request number, or PULL_REQUEST_NUMBER in the environment",
        "",
        "Usage: validation pull-request-release-significance <pull-request-number>",
        "   or: PULL_REQUEST_NUMBER=… validation pull-request-release-significance",
      ]);
      expect(githubService.run).not.toHaveBeenCalled();
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

    it("reads PULL_REQUEST_NUMBER when no argument was passed", async () => {
      expect.hasAssertions();

      process.env["PULL_REQUEST_NUMBER"] = "99";
      vi.mocked(githubService.run).mockReturnValue(
        succeeded(pullRequestDocument({ title: "feat(lexico): add a page" })),
      );

      await expect(runCommand()).resolves.toBe(false);
      expect(githubService.run).toHaveBeenCalledWith([
        "pr",
        "view",
        "99",
        "--json",
        "title,commits",
      ]);
    });

    it("prefers the argument over PULL_REQUEST_NUMBER", async () => {
      expect.hasAssertions();

      process.env["PULL_REQUEST_NUMBER"] = "99";
      vi.mocked(githubService.run).mockReturnValue(
        succeeded(pullRequestDocument({ title: "feat(lexico): add a page" })),
      );

      await expect(runCommand(["7"])).resolves.toBe(false);
      expect(githubService.run).toHaveBeenCalledWith([
        "pr",
        "view",
        "7",
        "--json",
        "title,commits",
      ]);
    });
  });

  describe("reading the pull request", () => {
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

    it("reports a document that is not valid JSON", async () => {
      expect.hasAssertions();

      vi.mocked(githubService.run).mockReturnValue(succeeded("not json"));

      await expect(runCommand(["7"])).resolves.toBe(true);
      expect(reportLines[0]).toContain(
        "❌ Unable to parse the gh pr view output",
      );
    });

    it("reports a title that does not parse", async () => {
      expect.hasAssertions();

      vi.mocked(githubService.run).mockReturnValue(
        succeeded(pullRequestDocument({ title: "not a conventional title" })),
      );

      await expect(runCommand(["7"])).resolves.toBe(true);
      expect(reportLines).toStrictEqual([
        "❌ Unable to parse type and scope from title: not a conventional title",
      ]);
    });
  });

  describe("checking significance", () => {
    it("passes a title at least as significant as its commits", async () => {
      expect.hasAssertions();

      vi.mocked(githubService.run).mockReturnValue(
        succeeded(
          pullRequestDocument({
            commits: [
              { messageHeadline: "feat(lexico): add moon phases", oid: "abc" },
            ],
            title: "feat(lexico): ✨ add moon phases",
          }),
        ),
      );

      await expect(runCommand(["7"])).resolves.toBe(false);
      expect(reportLines).toStrictEqual([
        "✅ Pull request title is release-significant enough for its commits",
      ]);
    });

    it("reports every failure", async () => {
      expect.hasAssertions();

      vi.mocked(githubService.run).mockReturnValue(
        succeeded(
          pullRequestDocument({
            commits: [
              {
                messageHeadline: "feat(lexico): add moon phases",
                oid: "abcdef1234567",
              },
            ],
            title: "ci(lexico): 👷 add moon phases",
          }),
        ),
      );

      await expect(runCommand(["7"])).resolves.toBe(true);
      expect(reportLines[0]).toBe(
        "❌ Pull request title is not release-significant enough",
      );
      expect(reportLines[2]).toContain("abcdef1");
      expect(reportLines[2]).toContain("minor");
    });
  });

  describe("the step summary", () => {
    it("mirrors the report when the variable is set", async () => {
      expect.hasAssertions();

      process.env[STEP_SUMMARY_VARIABLE] = "/tmp/summary";
      vi.mocked(githubService.run).mockReturnValue(
        succeeded(pullRequestDocument({ title: "feat(lexico): add a page" })),
      );

      await expect(runCommand(["7"])).resolves.toBe(false);
      expect(appendFileSync).toHaveBeenCalledWith(
        "/tmp/summary",
        "✅ Pull request title is release-significant enough for its commits\n",
        "utf8",
      );
    });

    it("writes nothing when the variable is unset", async () => {
      expect.hasAssertions();

      vi.mocked(githubService.run).mockReturnValue(
        succeeded(pullRequestDocument({ title: "feat(lexico): add a page" })),
      );

      await expect(runCommand(["7"])).resolves.toBe(false);
      expect(appendFileSync).not.toHaveBeenCalled();
    });

    it("logs a warning when writing step summary throws an error", async () => {
      expect.hasAssertions();

      process.env[STEP_SUMMARY_VARIABLE] = "/tmp/summary";
      vi.mocked(githubService.run).mockReturnValue(
        succeeded(pullRequestDocument({ title: "feat(lexico): add a page" })),
      );
      vi.mocked(appendFileSync).mockImplementationOnce(() => {
        throw new Error("EACCES");
      });

      await expect(runCommand(["7"])).resolves.toBe(false);
      expect(reportLines).toContain(
        "⚠️ Unable to write the report to GITHUB_STEP_SUMMARY",
      );
    });

    it("writes nothing when the variable is empty", async () => {
      expect.hasAssertions();

      process.env[STEP_SUMMARY_VARIABLE] = "";
      vi.mocked(githubService.run).mockReturnValue(
        succeeded(pullRequestDocument({ title: "feat(lexico): add a page" })),
      );

      await expect(runCommand(["7"])).resolves.toBe(false);
      expect(appendFileSync).not.toHaveBeenCalled();
    });

    it("cannot turn a passing pull request into a failing one", async () => {
      expect.hasAssertions();

      process.env[STEP_SUMMARY_VARIABLE] = "/tmp/summary";
      vi.mocked(githubService.run).mockReturnValue(
        succeeded(pullRequestDocument({ title: "feat(lexico): add a page" })),
      );
      vi.mocked(appendFileSync).mockImplementation((): never => {
        throw new Error("no space left on device");
      });

      await expect(runCommand(["7"])).resolves.toBe(false);
      expect(reportLines).toContain(
        "⚠️ Unable to write the report to GITHUB_STEP_SUMMARY",
      );
    });
  });
});
