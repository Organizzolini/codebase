import { spawnSync } from "node:child_process";

import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { PullRequestLabelsGithubService } from "./pull-request-labels-github.service";

vi.mock("node:child_process", () => ({
  spawnSync: vi.fn<typeof spawnSync>(),
}));

/** One `spawnSync` outcome, with the fields this service reads. */
const completion = (overrides: {
  error?: Error;
  status?: null | number;
  stderr?: string;
  stdout?: string;
}): ReturnType<typeof spawnSync> => ({
  output: [],
  pid: 1,
  signal: null,
  status: overrides.status ?? 0,
  stderr: overrides.stderr ?? "",
  stdout: overrides.stdout ?? "",
  ...(overrides.error === undefined ? {} : { error: overrides.error }),
});

describe(PullRequestLabelsGithubService, () => {
  let service: PullRequestLabelsGithubService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [PullRequestLabelsGithubService],
    }).compile();

    service = await module.resolve(PullRequestLabelsGithubService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("run", () => {
    it("passes the arguments straight through to gh", () => {
      vi.mocked(spawnSync).mockReturnValue(completion({ stdout: "[]" }));

      service.run(["label", "list"]);

      expect(vi.mocked(spawnSync)).toHaveBeenCalledWith(
        "gh",
        ["label", "list"],
        { encoding: "utf8" },
      );
    });

    it("reports a zero exit status as success", () => {
      vi.mocked(spawnSync).mockReturnValue(
        completion({ stdout: '[{"name":"type:feat"}]' }),
      );

      expect(service.run(["label", "list"])).toStrictEqual({
        available: true,
        standardError: "",
        standardOutput: '[{"name":"type:feat"}]',
        succeeded: true,
      });
    });

    // A gh notice on a successful call must never reach the document, or a
    // valid pull request fails for metadata that no longer parses as JSON.
    it("keeps a notice on standard error out of the document", () => {
      vi.mocked(spawnSync).mockReturnValue(
        completion({
          stderr: "A new release of gh is available\n",
          stdout: '{"title":"feat(lexico): ✨ add"}',
        }),
      );

      const result = service.run(["pr", "view", "236"]);

      expect(result.standardOutput).toBe('{"title":"feat(lexico): ✨ add"}');
      expect(result.standardError).toBe("A new release of gh is available");
      expect(result.succeeded).toBe(true);
    });

    it("reports a non-zero exit status as a failure that ran", () => {
      vi.mocked(spawnSync).mockReturnValue(
        completion({
          status: 1,
          stderr: "could not resolve to a PullRequest",
        }),
      );

      const result = service.run(["pr", "view", "999999"]);

      expect(result.available).toBe(true);
      expect(result.succeeded).toBe(false);
    });

    // A missing binary is an environment to fix rather than an answer from
    // GitHub, so the two are told apart.
    it("reports a missing binary as unavailable", () => {
      vi.mocked(spawnSync).mockReturnValue(
        completion({ error: new Error("spawnSync gh ENOENT") }),
      );

      expect(service.run(["label", "list"])).toStrictEqual({
        available: false,
        standardError: "spawnSync gh ENOENT",
        standardOutput: "",
        succeeded: false,
      });
    });
  });

  describe("describeFailure", () => {
    it("prefers what gh wrote to standard error", () => {
      expect(
        service.describeFailure({
          available: true,
          standardError: "HTTP 403",
          standardOutput: "",
          succeeded: false,
        }),
      ).toBe("HTTP 403");
    });

    it("falls back to standard output when that is where the reason went", () => {
      expect(
        service.describeFailure({
          available: true,
          standardError: "",
          standardOutput: "  already exists  ",
          succeeded: false,
        }),
      ).toBe("already exists");
    });

    // A failure reported with nothing to read would leave a reader with an
    // empty pair of parentheses and no idea what happened.
    it("says so when gh wrote nothing at all", () => {
      expect(
        service.describeFailure({
          available: true,
          standardError: "",
          standardOutput: "",
          succeeded: false,
        }),
      ).toBe("no output");
    });
  });
});
