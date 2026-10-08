import { spawnSync } from "node:child_process";

import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { IssueLabelsGithubService } from "./issue-labels-github.service";
import { GITHUB_CLI_BINARY } from "./issue-labels.constants";

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

describe(IssueLabelsGithubService, () => {
  let service: IssueLabelsGithubService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [IssueLabelsGithubService],
    }).compile();

    service = await module.resolve(IssueLabelsGithubService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is defined", () => {
    expect.hasAssertions();
    expect(service).toBeDefined();
  });

  describe("run", () => {
    it("passes the arguments straight through to gh", () => {
      expect.hasAssertions();

      vi.mocked(spawnSync).mockReturnValue(completion({ stdout: "{}" }));

      service.run(["issue", "edit", "7", "--add-label", "type:feat"]);

      expect(vi.mocked(spawnSync)).toHaveBeenCalledWith(
        GITHUB_CLI_BINARY,
        ["issue", "edit", "7", "--add-label", "type:feat"],
        { encoding: "utf8" },
      );
    });

    it("reports a zero exit status as success", () => {
      expect.hasAssertions();

      vi.mocked(spawnSync).mockReturnValue(completion({ stdout: "{}" }));

      expect(service.run(["label", "list"])).toStrictEqual({
        available: true,
        standardError: "",
        standardOutput: "{}",
        succeeded: true,
      });
    });

    it("keeps a notice on standard error out of the document", () => {
      expect.hasAssertions();

      vi.mocked(spawnSync).mockReturnValue(
        completion({ stderr: "A new release of gh\n", stdout: "{}" }),
      );

      const result = service.run(["label", "list"]);

      expect(result.standardOutput).toBe("{}");
      expect(result.standardError).toBe("A new release of gh");
      expect(result.succeeded).toBe(true);
    });

    it("reports a non-zero exit status as a failure that ran", () => {
      expect.hasAssertions();

      vi.mocked(spawnSync).mockReturnValue(
        completion({ status: 1, stderr: "could not resolve to an Issue" }),
      );

      const result = service.run(["issue", "edit", "999999"]);

      expect(result.available).toBe(true);
      expect(result.succeeded).toBe(false);
    });

    it("reports a missing binary as unavailable", () => {
      expect.hasAssertions();

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

  describe("isAvailable", () => {
    it.each([
      ["true when gh runs", undefined, true],
      ["false when gh cannot be executed", new Error("ENOENT"), false],
    ])("is %s", (_description, error, expected) => {
      expect.hasAssertions();

      vi.mocked(spawnSync).mockReturnValue(
        completion(error === undefined ? {} : { error }),
      );

      expect(service.isAvailable()).toBe(expected);
    });
  });

  describe("describeFailure", () => {
    it("prefers what gh wrote to standard error", () => {
      expect.hasAssertions();
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
      expect.hasAssertions();
      expect(
        service.describeFailure({
          available: true,
          standardError: "",
          standardOutput: "  already exists  ",
          succeeded: false,
        }),
      ).toBe("already exists");
    });

    it("says so when gh wrote nothing at all", () => {
      expect.hasAssertions();
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
