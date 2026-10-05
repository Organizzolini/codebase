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
import { SynchronizationService } from "../synchronization/synchronization.service";

import { PullRequestLabelsGithubService } from "./pull-request-labels-github.service";
import { PullRequestLabelsCommand } from "./pull-request-labels.command";
import { STEP_SUMMARY_VARIABLE } from "./pull-request-labels.constants";
import { PullRequestLabelsService } from "./pull-request-labels.service";

import type { GithubCliResult } from "./pull-request-labels.types";

/** What the mocked `require` hands back, or throws when it is an error. */
let conventionalConfig: unknown = { scopes: [], types: [] };

vi.mock("node:fs", () => ({
  appendFileSync: vi.fn<(filePath: string, content: string) => void>(),
}));

vi.mock("node:module", () => ({
  createRequire: () => (): unknown => {
    if (conventionalConfig instanceof Error) {
      throw conventionalConfig;
    }

    return conventionalConfig;
  },
}));

/** One label as `gh label list --json name,color,description` returns it. */
interface RepositoryLabel {
  color: string;
  description: string;
  name: string;
}

describe(PullRequestLabelsCommand, () => {
  let command: PullRequestLabelsCommand;
  let githubService: PullRequestLabelsGithubService;

  /** A `gh` call that ran and worked, carrying this document. */
  const succeeded = (standardOutput: string): GithubCliResult => ({
    available: true,
    standardError: "",
    standardOutput,
    succeeded: true,
  });

  /** A `gh` call that ran and failed. */
  const failed = (standardError: string): GithubCliResult => ({
    available: true,
    standardError,
    standardOutput: "",
    succeeded: false,
  });

  /** Every argument list `gh` was invoked with, in order. */
  const ghInvocations = (): string[][] =>
    vi
      .mocked(githubService.run)
      .mock.calls.map(([commandArguments]) => [...commandArguments]);

  /** Every line the command printed, captured as it was printed. */
  const reportedLines: string[] = [];

  /** Every line the command printed. */
  const printedLines = (): string[] => reportedLines;

  /** Answers `gh label list` with these labels and every write with success. */
  const setRepositoryLabels = (labels: RepositoryLabel[]): void => {
    vi.mocked(githubService.run).mockImplementation((commandArguments) =>
      commandArguments[1] === "list"
        ? succeeded(JSON.stringify(labels))
        : succeeded(""),
    );
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PullRequestLabelsCommand,
        PullRequestLabelsService,
        SynchronizationService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        {
          provide: PullRequestLabelsGithubService,
          useValue: createMock<PullRequestLabelsGithubService>(),
        },
      ],
    }).compile();

    command = await module.resolve(PullRequestLabelsCommand);
    githubService = await module.resolve(PullRequestLabelsGithubService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    reportedLines.length = 0;
    vi.spyOn(console, "info").mockImplementation((reportLine: unknown) => {
      reportedLines.push(String(reportLine));
    });
    vi.mocked(githubService.describeFailure).mockReturnValue("HTTP 403");
    conventionalConfig = {
      scopes: [{ description: "The portfolio", name: "JimmyPaolini" }],
      types: [{ description: "A new feature", name: "feat" }],
    };
    setRepositoryLabels([]);
    process.env[STEP_SUMMARY_VARIABLE] = "/tmp/step-summary.md";
  });

  afterEach(() => {
    Reflect.deleteProperty(process.env, STEP_SUMMARY_VARIABLE);
  });

  it("is defined", () => {
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    const module = await Test.createTestingModule({
      providers: [
        PullRequestLabelsCommand,
        PullRequestLabelsService,
        SynchronizationService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        {
          provide: PullRequestLabelsGithubService,
          useValue: createMock<PullRequestLabelsGithubService>(),
        },
      ],
    }).compile();
    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("PullRequestLabelsCommand");
  });

  it("declares its synchronization label", () => {
    expect(command.synchronizationLabel).toBe("pull-request-labels");
  });

  describe("expected vocabulary", () => {
    it("derives a label from every type and every scope", async () => {
      await command.synchronize("check");

      expect(printedLines()).toContain("- ⚠️ Missing label: type:feat");
      expect(printedLines()).toContain(
        "- ⚠️ Missing label: scope:jimmypaolini",
      );
    });

    // A label name is case-sensitive and `JimmyPaolini` is a scope spelled
    // with capitals, so the derived name has to be lowercased.
    it("lowercases a scope spelled with capitals", async () => {
      await command.synchronize("write");

      expect(ghInvocations()).toContainEqual([
        "label",
        "create",
        "scope:jimmypaolini",
        "--color",
        "1d76db",
        "--description",
        "The portfolio",
      ]);
    });

    it("includes the three labels no configuration derives", async () => {
      await command.synchronize("check");

      expect(printedLines()).toContain("- ⚠️ Missing label: do-not-merge");
      expect(printedLines()).toContain("- ⚠️ Missing label: source:agent");
      expect(printedLines()).toContain("- ⚠️ Missing label: source:human");
    });
  });

  describe("check", () => {
    // With the repository already reconciled this is the normal path, and the
    // standing stale label means the report is otherwise never empty enough
    // to imply it.
    it("says so explicitly when nothing needs creating or updating", async () => {
      setRepositoryLabels([
        { color: "d93f0b", description: "A new feature", name: "type:feat" },
        {
          color: "1d76db",
          description: "The portfolio",
          name: "scope:jimmypaolini",
        },
        {
          color: "b60205",
          description: "Do not merge this pull request yet",
          name: "do-not-merge",
        },
        {
          color: "e99695",
          description: "Opened by a coding agent",
          name: "source:agent",
        },
        {
          color: "e99695",
          description: "Opened by a human",
          name: "source:human",
        },
      ]);

      await expect(command.synchronize("check")).resolves.toBe(true);

      expect(printedLines()).toStrictEqual([
        "- ✅ All conventional labels are present and match the configuration",
      ]);
    });

    it("names a drifted description without touching it", async () => {
      setRepositoryLabels([
        { color: "d93f0b", description: "Something else", name: "type:feat" },
      ]);

      await command.synchronize("check");

      expect(printedLines()).toContain(
        "- ⚠️ Drifted label: type:feat — its color or description differs from the configuration",
      );
      expect(ghInvocations()).toStrictEqual([
        ["label", "list", "--limit", "500", "--json", "name,color,description"],
      ]);
    });

    it("names a drifted color", async () => {
      setRepositoryLabels([
        { color: "ffffff", description: "A new feature", name: "type:feat" },
      ]);

      await command.synchronize("check");

      expect(printedLines()).toContain(
        "- ⚠️ Drifted label: type:feat — its color or description differs from the configuration",
      );
    });

    it("makes no mutating call at all", async () => {
      await command.synchronize("check");

      for (const invocation of ghInvocations()) {
        expect(invocation[1]).toBe("list");
      }
    });
  });

  describe("write", () => {
    it("creates every missing label and says which", async () => {
      await command.synchronize("write");

      expect(ghInvocations()).toContainEqual([
        "label",
        "create",
        "type:feat",
        "--color",
        "d93f0b",
        "--description",
        "A new feature",
      ]);
      expect(printedLines()).toContain("- ✅ Created label: type:feat");
    });

    it("edits every drifted label and says which", async () => {
      setRepositoryLabels([
        { color: "ffffff", description: "A new feature", name: "type:feat" },
      ]);

      await command.synchronize("write");

      expect(ghInvocations()).toContainEqual([
        "label",
        "edit",
        "type:feat",
        "--color",
        "d93f0b",
        "--description",
        "A new feature",
      ]);
      expect(printedLines()).toContain("- ✅ Updated label: type:feat");
    });

    it("warns about a failed creation and carries on with the rest", async () => {
      vi.mocked(githubService.run).mockImplementation((commandArguments) =>
        commandArguments[1] === "list"
          ? succeeded("[]")
          : commandArguments[2] === "type:feat"
            ? failed("HTTP 403")
            : succeeded(""),
      );

      await expect(command.synchronize("write")).resolves.toBe(true);

      expect(printedLines()).toContain(
        "- ⚠️ Unable to reconcile labels: gh label create failed for type:feat (HTTP 403)",
      );
      expect(printedLines()).toContain(
        "- ✅ Created label: scope:jimmypaolini",
      );
    });

    it("warns about a failed edit", async () => {
      setRepositoryLabels([
        { color: "ffffff", description: "A new feature", name: "type:feat" },
      ]);
      vi.mocked(githubService.run).mockImplementation((commandArguments) =>
        commandArguments[1] === "list"
          ? succeeded(
              JSON.stringify([
                {
                  color: "ffffff",
                  description: "A new feature",
                  name: "type:feat",
                },
              ]),
            )
          : failed("HTTP 403"),
      );

      await expect(command.synchronize("write")).resolves.toBe(true);

      expect(printedLines()).toContain(
        "- ⚠️ Unable to reconcile labels: gh label edit failed for type:feat (HTTP 403)",
      );
    });
  });

  describe("stale labels", () => {
    // A label the configuration dropped may still be on open pull requests, so
    // removing it loses information no run can put back.
    it("reports a stale label with the command that would remove it", async () => {
      setRepositoryLabels([
        { color: "d93f0b", description: "A new feature", name: "type:feat" },
        {
          color: "1d76db",
          description: "The portfolio",
          name: "scope:jimmypaolini",
        },
        {
          color: "b60205",
          description: "Do not merge this pull request yet",
          name: "do-not-merge",
        },
        {
          color: "e99695",
          description: "Opened by a coding agent",
          name: "source:agent",
        },
        {
          color: "e99695",
          description: "Opened by a human",
          name: "source:human",
        },
        { color: "1d76db", description: "Gone", name: "scope:conformance" },
        { color: "e99695", description: "Gone", name: "source:superpowers" },
      ]);

      await command.synchronize("write");

      expect(printedLines()).toContain(
        '- ⚠️ Stale label (not in conventional.config.cjs): scope:conformance — remove with: gh label delete "scope:conformance"',
      );
      expect(printedLines()).toContain(
        '- ⚠️ Stale label (not in conventional.config.cjs): source:superpowers — remove with: gh label delete "source:superpowers"',
      );
    });

    it("never runs gh label delete", async () => {
      setRepositoryLabels([
        { color: "1d76db", description: "Gone", name: "scope:conformance" },
      ]);

      await command.synchronize("write");

      for (const invocation of ghInvocations()) {
        expect(invocation).not.toContain("delete");
      }
    });

    // Anything outside the three tracked prefixes belongs to somebody else.
    it("leaves an untracked label alone", async () => {
      setRepositoryLabels([
        { color: "0e8a16", description: "Renovate", name: "dependencies" },
      ]);

      await command.synchronize("check");

      expect(printedLines().join("\n")).not.toContain("dependencies");
    });
  });

  describe("always succeeds", () => {
    it("warns rather than fails when gh label list cannot run", async () => {
      vi.mocked(githubService.run).mockReturnValue(failed("HTTP 401"));
      vi.mocked(githubService.describeFailure).mockReturnValue("HTTP 401");

      await expect(command.synchronize("check")).resolves.toBe(true);

      expect(printedLines()).toStrictEqual([
        "- ⚠️ Unable to reconcile labels: gh label list failed (HTTP 401)",
      ]);
    });

    it("warns rather than fails when the configuration cannot be read", async () => {
      conventionalConfig = new Error("Cannot find module");

      await expect(command.synchronize("check")).resolves.toBe(true);

      expect(printedLines()).toStrictEqual([
        "- ⚠️ Unable to reconcile labels: label comparison failed (Cannot find module)",
      ]);
    });

    it("warns rather than fails when the configuration is the wrong shape", async () => {
      conventionalConfig = { scopes: "nope", types: [] };

      await expect(command.synchronize("check")).resolves.toBe(true);
      expect(printedLines()[0]).toContain(
        "- ⚠️ Unable to reconcile labels: label comparison failed (",
      );
    });

    it("warns rather than fails when gh returns something that is not JSON", async () => {
      vi.mocked(githubService.run).mockReturnValue(succeeded("not json"));

      await expect(command.synchronize("check")).resolves.toBe(true);
      expect(printedLines()[0]).toContain(
        "- ⚠️ Unable to reconcile labels: label comparison failed (",
      );
    });

    // The outer net: nothing this command does may become a reason for a red
    // pull request, not even something it never anticipated.
    it("warns rather than fails when gh itself throws", async () => {
      vi.mocked(githubService.run).mockImplementation(() => {
        throw new Error("EMFILE: too many open files");
      });

      await expect(command.synchronize("check")).resolves.toBe(true);

      expect(printedLines()).toStrictEqual([
        "- ⚠️ Unable to reconcile labels: EMFILE: too many open files",
      ]);
    });

    it("warns rather than fails when gh throws something that is not an error", async () => {
      const sideways: unknown = "sideways";

      vi.mocked(githubService.run).mockImplementation(() => {
        throw sideways;
      });

      await expect(command.synchronize("check")).resolves.toBe(true);

      expect(printedLines()).toStrictEqual([
        "- ⚠️ Unable to reconcile labels: sideways",
      ]);
    });

    it("exits zero from run even when nothing could be reconciled", async () => {
      vi.mocked(githubService.run).mockReturnValue(failed("HTTP 401"));
      const exit = mockProcessExit();

      await command.run(["write"]);

      expect(exit).not.toHaveBeenCalled();

      exit.mockRestore();
    });

    it("does not exit when the vocabulary is already reconciled", async () => {
      const exit = mockProcessExit();

      await command.run(["check"]);

      expect(exit).not.toHaveBeenCalled();

      exit.mockRestore();
    });
  });

  describe("step summary", () => {
    it("mirrors every report line", async () => {
      await command.synchronize("check");

      expect(vi.mocked(appendFileSync)).toHaveBeenCalledWith(
        "/tmp/step-summary.md",
        `${printedLines().join("\n")}\n`,
        "utf8",
      );
    });

    // Outside a workflow the variable is unset, which is what keeps the
    // command runnable from a terminal unchanged.
    it("writes nothing when the variable is unset", async () => {
      Reflect.deleteProperty(process.env, STEP_SUMMARY_VARIABLE);

      await command.synchronize("check");

      expect(vi.mocked(appendFileSync)).not.toHaveBeenCalled();
    });

    it("writes nothing when the variable is empty", async () => {
      process.env[STEP_SUMMARY_VARIABLE] = "";

      await command.synchronize("check");

      expect(vi.mocked(appendFileSync)).not.toHaveBeenCalled();
    });

    // The report is a courtesy; the verdict is not. A full disk must never
    // turn a passing pull request into a failing one.
    it("swallows a write failure rather than failing the run", async () => {
      vi.mocked(appendFileSync).mockImplementation(() => {
        throw new Error("ENOSPC: no space left on device");
      });
      const warn = vi.spyOn(console, "warn").mockReturnValue(undefined);

      await expect(command.synchronize("check")).resolves.toBe(true);

      expect(warn).toHaveBeenCalledWith(
        "⚠️ Unable to write the report to GITHUB_STEP_SUMMARY",
      );

      warn.mockRestore();
    });
  });
});
