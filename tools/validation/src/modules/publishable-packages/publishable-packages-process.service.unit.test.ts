import { spawnSync } from "node:child_process";
import path from "node:path";

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

import { PublishablePackagesProcessService } from "./publishable-packages-process.service";

import type { ConsumerContext } from "./publishable-packages.types";

vi.mock("node:child_process", () => ({
  spawnSync: vi.fn<typeof spawnSync>(),
}));

const context: ConsumerContext = {
  directory: "/tmp/publishable-packages-consumer-abc",
  workspaceRoot: "/work/codebase",
};

/** The environment the last `spawnSync` call received. */
const lastSpawnEnvironment = (): NodeJS.ProcessEnv => {
  const environment = vi.mocked(spawnSync).mock.lastCall?.[2]?.env;
  if (environment === undefined) {
    throw new Error("spawnSync was not called with an environment");
  }
  return environment;
};

describe(PublishablePackagesProcessService, () => {
  let service: PublishablePackagesProcessService;
  const originalEnvironment = { ...process.env };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PublishablePackagesProcessService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    service = await module.resolve(PublishablePackagesProcessService);
  });

  beforeEach(() => {
    vi.mocked(spawnSync).mockReset();
    vi.mocked(spawnSync).mockReturnValue({
      output: [],
      pid: 1,
      signal: null,
      status: 0,
      stderr: "",
      stdout: "",
    });
  });

  afterEach(() => {
    process.env = { ...originalEnvironment };
  });

  it("is defined", () => {
    expect.hasAssertions();
    expect(service).toBeDefined();
  });

  it("runs the executable inside the consumer without a shell", () => {
    expect.hasAssertions();

    service.run(context, {
      args: ["install"],
      executable: "pnpm",
      timeout: 1000,
    });

    expect(spawnSync).toHaveBeenCalledWith(
      "pnpm",
      ["install"],
      expect.objectContaining({
        cwd: context.directory,
        encoding: "utf8",
        timeout: 1000,
      }),
    );
  });

  it("returns standard output and error stripped of escape codes", () => {
    expect.hasAssertions();

    vi.mocked(spawnSync).mockReturnValue({
      output: [],
      pid: 1,
      signal: null,
      status: 1,
      stderr: "\u001B[31mERROR\u001B[39m\n",
      stdout: "\u001B[32mINFO\u001B[39m\n",
    });

    expect(
      service.run(context, { args: [], executable: "nx", timeout: 1 }),
    ).toStrictEqual({ output: "INFO\nERROR\n", status: 1 });
  });

  it("reports a command that never started", () => {
    expect.hasAssertions();

    vi.mocked(spawnSync).mockReturnValue({
      error: new Error("spawn pnpm ENOENT"),
      output: [],
      pid: 0,
      signal: null,
      status: null,
      stderr: "",
      stdout: "",
    });

    expect(
      service.run(context, { args: [], executable: "pnpm", timeout: 1 }),
    ).toStrictEqual({ output: "Error: spawn pnpm ENOENT", status: null });
  });

  it.each([
    ["publish"],
    ["release"],
    ["unpublish"],
    ["dist-tags"],
    ["login"],
    ["healthy:nx-release-publish"],
  ])("refuses to run a command carrying %s", (argument) => {
    expect.hasAssertions();
    expect(() =>
      service.run(context, {
        args: ["exec", argument],
        executable: "pnpm",
        timeout: 1,
      }),
    ).toThrow(/registry/u);
    expect(spawnSync).not.toHaveBeenCalled();
  });

  it("refuses a publishing executable", () => {
    expect.hasAssertions();
    expect(() =>
      service.run(context, {
        args: [],
        executable: "/usr/bin/publish",
        timeout: 1,
      }),
    ).toThrow(/registry/u);
  });

  it("drops registry tokens and this workspace's tool settings", () => {
    expect.hasAssertions();

    process.env = {
      FORCE_COLOR: "3",
      HOME: "/home/runner",
      NODE_AUTH_TOKEN: "secret",
      NODE_OPTIONS: "--import @swc-node/register/esm-register",
      NODE_PATH: "/work/codebase/node_modules",
      npm_config_registry: "http://localhost:4873",
      NPM_TOKEN: "secret",
      NX_WORKSPACE_ROOT: "/work/codebase",
      pnpm_config_verify_deps_before_run: "false",
      SWC_NODE_PROJECT: "/work/codebase/tsconfig.json",
    };

    service.run(context, { args: [], executable: "nx", timeout: 1 });

    expect(lastSpawnEnvironment()).toStrictEqual({
      FORCE_COLOR: "0",
      HOME: "/home/runner",
      npm_config_userconfig: path.join(context.directory, ".npmrc-user"),
      NX_DAEMON: "false",
      NX_NO_CLOUD: "true",
      NX_TUI: "false",
      PATH: "",
    });
  });

  it("drops every PATH entry inside the workspace", () => {
    expect.hasAssertions();

    process.env = {
      PATH: [
        "/work/codebase/node_modules/.bin",
        "/home/runner/setup-pnpm/node_modules/.bin",
        "/work/codebase",
        "/usr/bin",
      ].join(path.delimiter),
    };

    service.run(context, { args: [], executable: "nx", timeout: 1 });

    expect(lastSpawnEnvironment()["PATH"]).toBe(
      ["/home/runner/setup-pnpm/node_modules/.bin", "/usr/bin"].join(
        path.delimiter,
      ),
    );
  });
});
