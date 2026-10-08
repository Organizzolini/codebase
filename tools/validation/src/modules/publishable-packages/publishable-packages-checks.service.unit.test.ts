import { existsSync } from "node:fs";
import path from "node:path";

import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logging";

import { PublishablePackagesChecksService } from "./publishable-packages-checks.service";
import { PLUGIN_TARGET_EXPECTATIONS } from "./publishable-packages-consumer.constants";
import { PublishablePackagesProcessService } from "./publishable-packages-process.service";

import type {
  ConsumerCommand,
  ConsumerCommandResult,
  ConsumerContext,
  PublishablePackage,
} from "./publishable-packages.types";
import type { DeepMocked } from "@golevelup/ts-vitest";

vi.mock("node:fs", () => ({
  existsSync: vi.fn<typeof existsSync>(() => true),
}));

const context: ConsumerContext = {
  directory: "/tmp/consumer",
  workspaceRoot: "/work/codebase",
};

const publishablePackages: PublishablePackage[] = [
  {
    binary: "codometer",
    name: "@codometer/cli",
    tarball: "codometer-cli",
    version: "0.0.7",
  },
  { name: "@codometer/core", tarball: "codometer-core", version: "0.0.7" },
];

const PASSED: ConsumerCommandResult = { output: "", status: 0 };

/**
 * What a healthy consumer prints for each command, keyed by the executable's
 * basename and its arguments.
 */
const healthyConsumer = (command: ConsumerCommand): ConsumerCommandResult => {
  const executable = path.basename(command.executable);
  const words = command.args.join(" ");

  if (executable === "codometer") {
    return { output: "Usage: main [options] [command]\n", status: 0 };
  }
  if (words.startsWith("show projects")) {
    return { output: '["healthy","broken"]\n', status: 0 };
  }
  const broken = PLUGIN_TARGET_EXPECTATIONS.find(
    ({ target }) =>
      words === `run broken:${target} --skip-nx-cache --output-style=static`,
  );
  if (broken) {
    return { output: `${broken.failure}\n`, status: 1 };
  }
  return PASSED;
};

describe(PublishablePackagesChecksService, () => {
  let service: PublishablePackagesChecksService;
  let processService: DeepMocked<PublishablePackagesProcessService>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PublishablePackagesChecksService,
        {
          provide: PublishablePackagesProcessService,
          useValue: createMock<PublishablePackagesProcessService>(),
        },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    service = await module.resolve(PublishablePackagesChecksService);
    processService = module.get(PublishablePackagesProcessService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(existsSync).mockReturnValue(true);
    processService.run.mockImplementation((_context, command) =>
      healthyConsumer(command),
    );
  });

  /** Makes one command, matched by its arguments, print something else. */
  const overrideCommand = (
    matches: (command: ConsumerCommand) => boolean,
    result: ConsumerCommandResult,
  ): void => {
    processService.run.mockImplementation((_context, command) =>
      matches(command) ? result : healthyConsumer(command),
    );
  };

  it("is defined", () => {
    expect.hasAssertions();
    expect(service).toBeDefined();
  });

  it("passes a consumer whose every check behaves", () => {
    expect.hasAssertions();
    expect(service.verifyConsumer(context, publishablePackages)).toStrictEqual(
      [],
    );
  });

  it("typechecks under the consumer's own TypeScript", () => {
    expect.hasAssertions();

    service.verifyConsumer(context, publishablePackages);

    expect(processService.run).toHaveBeenCalledWith(context, {
      args: [
        "/tmp/consumer/node_modules/typescript/bin/tsc",
        "--project",
        "tsconfig.typecheck.json",
      ],
      executable: process.execPath,
      timeout: 300_000,
    });
  });

  it("reports a failed typecheck", () => {
    expect.hasAssertions();

    overrideCommand((command) => command.args.includes("--project"), {
      output: "typecheck/codometer-core.ts(1,20): error TS2307",
      status: 2,
    });

    expect(service.verifyConsumer(context, publishablePackages)).toStrictEqual([
      "❌ Failed to typecheck the packages' imports from the consumer (exit 2):\ntypecheck/codometer-core.ts(1,20): error TS2307",
    ]);
  });

  it("runs each command line from the consumer's own bin directory", () => {
    expect.hasAssertions();

    service.verifyConsumer(context, publishablePackages);

    expect(processService.run).toHaveBeenCalledWith(context, {
      args: ["--help"],
      executable: "/tmp/consumer/node_modules/.bin/codometer",
      timeout: 300_000,
    });
  });

  it("reports a command line that prints no usage", () => {
    expect.hasAssertions();

    overrideCommand((command) => command.args[0] === "--help", {
      output: "Error [ERR_MODULE_NOT_FOUND]: Cannot find package",
      status: 0,
    });

    expect(service.verifyConsumer(context, publishablePackages)).toStrictEqual([
      "❌ Failed to run codometer --help (exit 0):\nError [ERR_MODULE_NOT_FOUND]: Cannot find package",
    ]);
  });

  it("reports a project graph missing a fixture", () => {
    expect.hasAssertions();

    overrideCommand((command) => command.args[0] === "show", {
      output: '["healthy"]',
      status: 0,
    });

    expect(service.verifyConsumer(context, publishablePackages)).toStrictEqual([
      `❌ Failed to build the consumer's project graph with the plugins registered (exit 0):\n["healthy"]`,
    ]);
  });

  it("generates an instance into the healthy fixture", () => {
    expect.hasAssertions();

    service.verifyConsumer(context, publishablePackages);

    expect(processService.run).toHaveBeenCalledWith(
      context,
      expect.objectContaining({
        args: [
          "generate",
          "conformetry:greeting",
          "--name=generated",
          "--project=healthy",
          "--no-interactive",
        ],
      }),
    );
    expect(existsSync).toHaveBeenCalledWith(
      "/tmp/consumer/projects/healthy/src/greetings/generated/generated.md",
    );
  });

  it("reports a generator plugin that fails to emit", () => {
    expect.hasAssertions();

    overrideCommand(
      (command) =>
        path.basename(command.executable) ===
        "conformetry-nx-bootstrap-generators",
      { output: "Cannot read the configuration", status: 1 },
    );

    expect(service.verifyConsumer(context, publishablePackages)).toStrictEqual([
      "❌ Failed to emit the conformetry generator plugin (exit 1):\nCannot read the configuration",
    ]);
  });

  it("reports a generator that wrote nothing", () => {
    expect.hasAssertions();

    vi.mocked(existsSync).mockReturnValue(false);

    expect(service.verifyConsumer(context, publishablePackages)).toStrictEqual([
      "❌ Failed to generate conformetry:greeting (exit 0):\n",
    ]);
  });

  it("reports a healthy fixture whose gate failed", () => {
    expect.hasAssertions();

    overrideCommand(
      (command) => command.args[1] === "healthy:codependix-gate",
      { output: "Could not resolve schema", status: 1 },
    );

    expect(service.verifyConsumer(context, publishablePackages)).toStrictEqual([
      "❌ @codependix/nx failed healthy:codependix-gate, which should pass (exit 1):\nCould not resolve schema",
    ]);
  });

  it("reports a broken fixture that failed for the wrong reason", () => {
    expect.hasAssertions();

    overrideCommand(
      (command) => command.args[1] === "broken:conformetry-validate",
      { output: "Unable to resolve @conformetry/nx:validate.", status: 1 },
    );

    expect(service.verifyConsumer(context, publishablePackages)).toStrictEqual([
      '❌ @conformetry/nx did not fail broken:conformetry-validate with "Missing markdown heading: "Usage"" (exit 1):\nUnable to resolve @conformetry/nx:validate.',
    ]);
  });

  it("reports a broken fixture whose gate passed", () => {
    expect.hasAssertions();

    overrideCommand(
      (command) => command.args[1] === "broken:callidescope-gate",
      { output: "Call stacks over the depth limit (1)", status: 0 },
    );

    expect(service.verifyConsumer(context, publishablePackages)).toStrictEqual([
      '❌ @callidescope/nx did not fail broken:callidescope-gate with "Call stacks over the depth limit (1)" (exit 0):\nCall stacks over the depth limit (1)',
    ]);
  });
});
