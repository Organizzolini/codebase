import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logging";

import { IssueLabelsGithubService } from "./issue-labels-github.service";
import { IssueLabelsCommand } from "./issue-labels.command";
import { IssueLabelsService } from "./issue-labels.service";

import type { GithubCliResult } from "./issue-labels.types";

/** A `gh` call that ran and worked. */
const succeeded: GithubCliResult = {
  available: true,
  standardError: "",
  standardOutput: "",
  succeeded: true,
};

/** A `gh` call that ran and failed, saying this. */
const failed = (standardError: string): GithubCliResult => ({
  available: true,
  standardError,
  standardOutput: "",
  succeeded: false,
});

describe(IssueLabelsCommand, () => {
  let command: IssueLabelsCommand;
  let githubService: IssueLabelsGithubService;
  let logger: LoggerService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        IssueLabelsCommand,
        IssueLabelsService,
        {
          provide: IssueLabelsGithubService,
          useValue: createMock<IssueLabelsGithubService>(),
        },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    command = await module.resolve(IssueLabelsCommand);
    githubService = await module.resolve(IssueLabelsGithubService);
    logger = await module.resolve(LoggerService);
  });

  beforeEach(() => {
    vi.clearAllMocks();

    for (const variableName of ["ISSUE_BODY", "ISSUE_LABELS", "ISSUE_NUMBER"]) {
      Reflect.deleteProperty(process.env, variableName);
    }

    vi.mocked(githubService.isAvailable).mockReturnValue(true);
    vi.mocked(githubService.describeFailure).mockImplementation(
      (result: GithubCliResult) =>
        result.standardError === "" ? "no output" : result.standardError,
    );
  });

  it("is defined", () => {
    expect.hasAssertions();
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    expect.hasAssertions();

    const module = await Test.createTestingModule({
      providers: [
        IssueLabelsCommand,
        IssueLabelsService,
        {
          provide: IssueLabelsGithubService,
          useValue: createMock<IssueLabelsGithubService>(),
        },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();
    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("IssueLabelsCommand");
  });

  it("does nothing without an issue number", async () => {
    expect.hasAssertions();

    await command.run();

    expect(githubService.run).not.toHaveBeenCalled();
    expect(logger.log).toHaveBeenCalledWith(
      "📄 Skipping: no issue number in the environment",
    );
  });

  it("adds the labels a template submission implies", async () => {
    expect.hasAssertions();

    process.env["ISSUE_NUMBER"] = "7";
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
    process.env["ISSUE_LABELS"] = JSON.stringify([{ name: "source:human" }]);
    vi.mocked(githubService.run).mockReturnValue(succeeded);

    await command.run();

    expect(githubService.run).toHaveBeenNthCalledWith(1, [
      "issue",
      "edit",
      "7",
      "--add-label",
      "type:feat",
    ]);
    expect(githubService.run).toHaveBeenNthCalledWith(2, [
      "issue",
      "edit",
      "7",
      "--add-label",
      "scope:lexico",
    ]);
    expect(logger.log).toHaveBeenCalledWith("🏷️ Added type:feat to issue 7");
    expect(logger.log).toHaveBeenCalledWith("🏷️ Added scope:lexico to issue 7");
  });

  it("adds nothing already present, and skips a plain-body issue entirely", async () => {
    expect.hasAssertions();

    process.env["ISSUE_NUMBER"] = "7";
    process.env["ISSUE_BODY"] = "Plain issue, no template.";
    process.env["ISSUE_LABELS"] = "not json";

    await command.run();

    expect(githubService.run).not.toHaveBeenCalled();
    expect(logger.log).toHaveBeenCalledWith(
      "📇 Verified issue labels were already in sync",
    );
  });

  it("skips labels already on the issue", async () => {
    expect.hasAssertions();

    process.env["ISSUE_NUMBER"] = "7";
    process.env["ISSUE_BODY"] = ["### Type", "", "feat", ""].join("\n");
    process.env["ISSUE_LABELS"] = JSON.stringify(["type:feat"]);

    await command.run();

    expect(githubService.run).not.toHaveBeenCalled();
  });

  it("drops label entries with no readable name and ignores a document that is not an array", async () => {
    expect.hasAssertions();

    process.env["ISSUE_NUMBER"] = "7";
    process.env["ISSUE_BODY"] = ["### Type", "", "feat", ""].join("\n");
    process.env["ISSUE_LABELS"] = JSON.stringify([42, { tint: "red" }]);
    vi.mocked(githubService.run).mockReturnValue(succeeded);

    await command.run();

    expect(githubService.run).toHaveBeenCalledWith([
      "issue",
      "edit",
      "7",
      "--add-label",
      "type:feat",
    ]);

    vi.clearAllMocks();
    vi.mocked(githubService.isAvailable).mockReturnValue(true);
    process.env["ISSUE_LABELS"] = "{}";
    vi.mocked(githubService.run).mockReturnValue(succeeded);

    await command.run();

    expect(githubService.run).toHaveBeenCalledWith([
      "issue",
      "edit",
      "7",
      "--add-label",
      "type:feat",
    ]);
  });

  it("reports when gh is unavailable", async () => {
    expect.hasAssertions();

    process.env["ISSUE_NUMBER"] = "7";
    process.env["ISSUE_BODY"] = ["### Type", "", "feat", ""].join("\n");
    vi.mocked(githubService.isAvailable).mockReturnValue(false);

    await command.run();

    expect(logger.log).toHaveBeenCalledWith(
      "⚠️ Skipping label reconciliation: gh is not available",
    );
  });

  it("reports a failed gh issue edit without throwing", async () => {
    expect.hasAssertions();

    process.env["ISSUE_NUMBER"] = "7";
    process.env["ISSUE_BODY"] = ["### Type", "", "feat", ""].join("\n");
    vi.mocked(githubService.run).mockReturnValue(failed("HTTP 403"));

    await command.run();

    expect(logger.log).toHaveBeenCalledWith(
      "⚠️ Failed to add type:feat to issue 7: HTTP 403",
    );
  });
});
