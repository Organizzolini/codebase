import { spawnSync } from "node:child_process";

import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { PullRequestMetadataGithubService } from "./pull-request-metadata-github.service";
import { GITHUB_CLI_BINARY } from "./pull-request-metadata.constants";

vi.mock("node:child_process", () => ({
  spawnSync: vi.fn<typeof spawnSync>(),
}));

/** What `spawnSync` hands back, as much of it as this service reads. */
interface SpawnCompletion {
  error?: Error;
  status?: null | number;
  stderr?: string;
  stdout?: string;
}

describe(PullRequestMetadataGithubService, () => {
  let service: PullRequestMetadataGithubService;

  /** Makes the next `spawnSync` call complete like this. */
  const completeWith = (completion: SpawnCompletion): void => {
    vi.mocked(spawnSync).mockReturnValue({
      output: [],
      pid: 1,
      signal: null,
      status: completion.status ?? 0,
      stderr: completion.stderr ?? "",
      stdout: completion.stdout ?? "",
      ...(completion.error === undefined ? {} : { error: completion.error }),
    });
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [PullRequestMetadataGithubService],
    }).compile();

    service = await module.resolve(PullRequestMetadataGithubService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is defined", () => {
    expect.hasAssertions();
    expect(service).toBeDefined();
  });

  describe("run", () => {
    it("invokes gh with the arguments it was given", () => {
      expect.hasAssertions();

      completeWith({ stdout: "{}" });

      expect(service.run(["pr", "view", "7"])).toStrictEqual({
        available: true,
        standardError: "",
        standardOutput: "{}",
        succeeded: true,
      });
      expect(spawnSync).toHaveBeenCalledWith(
        GITHUB_CLI_BINARY,
        ["pr", "view", "7"],
        { encoding: "utf8" },
      );
    });

    it("keeps a notice on standard error out of the captured document", () => {
      expect.hasAssertions();

      completeWith({ stderr: "A new release of gh\n", stdout: '{"a":1}' });

      expect(service.run(["pr", "view", "7"])).toStrictEqual({
        available: true,
        standardError: "A new release of gh",
        standardOutput: '{"a":1}',
        succeeded: true,
      });
    });

    it("reports a non-zero exit as a failed call", () => {
      expect.hasAssertions();

      completeWith({ status: 1, stderr: "no such pull request" });

      expect(service.run(["pr", "view", "7"]).succeeded).toBe(false);
    });

    it("reports a missing binary as unavailable", () => {
      expect.hasAssertions();

      completeWith({ error: new Error("spawnSync gh ENOENT") });

      expect(service.run(["--version"])).toStrictEqual({
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

      completeWith(error === undefined ? {} : { error });

      expect(service.isAvailable()).toBe(expected);
    });
  });

  describe("describeFailure", () => {
    it.each([
      [
        "both streams",
        "stderr line",
        "stdout line ",
        "stderr line stdout line",
      ],
      ["standard error alone", "stderr line", "", "stderr line"],
      ["standard output alone", "", "stdout line", "stdout line"],
      ["neither", "", "", "no output"],
    ])("reads %s", (_description, standardError, standardOutput, expected) => {
      expect.hasAssertions();
      expect(
        service.describeFailure({
          available: true,
          standardError,
          standardOutput,
          succeeded: false,
        }),
      ).toBe(expected);
    });
  });
});
