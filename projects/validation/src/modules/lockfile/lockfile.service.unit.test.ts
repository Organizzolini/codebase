import { spawnSync } from "node:child_process";
import path from "node:path";

import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import {
  FROZEN_INSTALL_ARGUMENTS,
  PACKAGE_MANAGER_BINARY,
} from "./lockfile.constants";
import { LockfileService } from "./lockfile.service";

import type { SpawnSyncReturns } from "node:child_process";

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

/** The candidate pnpm beside the Node running this suite. */
const nodeAdjacentPnpm = path.join(
  path.dirname(process.execPath),
  PACKAGE_MANAGER_BINARY,
);

describe(LockfileService, () => {
  let service: LockfileService;

  /** Makes each `spawnSync` call complete as this function says. */
  const completeWith = (
    complete: (candidate: string) => SpawnCompletion,
  ): void => {
    vi.mocked(spawnSync).mockImplementation((command: string) => {
      const completion = complete(command);
      const completed: SpawnSyncReturns<string> = {
        output: [],
        pid: 1,
        signal: null,
        status: completion.status ?? 0,
        stderr: completion.stderr ?? "",
        stdout: completion.stdout ?? "",
        ...(completion.error === undefined ? {} : { error: completion.error }),
      };

      return completed;
    });
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [LockfileService],
    }).compile();

    service = await module.resolve(LockfileService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is defined", () => {
    expect.hasAssertions();
    expect(service).toBeDefined();
  });

  describe("checkLockfile", () => {
    it("runs the frozen install through pnpm on the path", () => {
      expect.hasAssertions();

      completeWith(() => ({ stdout: "Already up to date" }));

      expect(service.checkLockfile()).toStrictEqual({
        available: true,
        output: "Already up to date",
        succeeded: true,
      });
      expect(spawnSync).toHaveBeenCalledExactlyOnceWith(
        PACKAGE_MANAGER_BINARY,
        FROZEN_INSTALL_ARGUMENTS,
        { encoding: "utf8" },
      );
    });

    it("resolves against the lockfile without writing node_modules", () => {
      expect.hasAssertions();

      completeWith(() => ({ stdout: "Already up to date" }));

      service.checkLockfile();

      expect(spawnSync).toHaveBeenCalledExactlyOnceWith(
        PACKAGE_MANAGER_BINARY,
        ["install", "--frozen-lockfile", "--lockfile-only"],
        { encoding: "utf8" },
      );
    });

    it("merges both streams into the reported output", () => {
      expect.hasAssertions();

      completeWith(() => ({
        status: 1,
        stderr: "specifiers do not match\n",
        stdout: "Scope: all\n",
      }));

      expect(service.checkLockfile()).toStrictEqual({
        available: true,
        output: "Scope: all\nspecifiers do not match",
        succeeded: false,
      });
    });

    it("falls back to the pnpm beside the running Node", () => {
      expect.hasAssertions();

      completeWith((candidate) =>
        candidate === PACKAGE_MANAGER_BINARY
          ? { error: new Error("spawnSync pnpm ENOENT") }
          : { stdout: "Already up to date" },
      );

      expect(service.checkLockfile()).toStrictEqual({
        available: true,
        output: "Already up to date",
        succeeded: true,
      });
      expect(spawnSync).toHaveBeenLastCalledWith(
        nodeAdjacentPnpm,
        FROZEN_INSTALL_ARGUMENTS,
        { encoding: "utf8" },
      );
    });

    it("reports pnpm as unavailable when neither candidate runs", () => {
      expect.hasAssertions();

      completeWith(() => ({ error: new Error("spawnSync pnpm ENOENT") }));

      expect(service.checkLockfile()).toStrictEqual({
        available: false,
        output: "",
        succeeded: false,
      });
      expect(spawnSync).toHaveBeenCalledTimes(2);
    });
  });
});
