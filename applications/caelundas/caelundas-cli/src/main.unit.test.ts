import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MainModule } from "./main.module";

import type * as NestCommanderModule from "nest-commander";

interface CommandFactoryModule {
  readonly name?: string;
}

interface CommandFactoryOptions {
  readonly bufferLogs?: boolean;
  readonly logger?: LoggerLike;
  readonly serviceErrorHandler?: (error: Error) => Promise<void> | void;
}

interface LoggerLike {
  error: (message: unknown, stackOrContext?: string) => void;
}

const { mockCommandFactoryRun } = vi.hoisted(() => ({
  mockCommandFactoryRun: vi
    .fn<
      (
        rootModule: CommandFactoryModule,
        options: CommandFactoryOptions,
      ) => Promise<void>
    >()
    .mockResolvedValue(undefined),
}));

vi.mock("nest-commander", async (importOriginal) => {
  const actual = await importOriginal<typeof NestCommanderModule>();
  return {
    ...actual,
    CommandFactory: {
      run: mockCommandFactoryRun,
    },
  };
});

describe("main", () => {
  const originalExitCode = process.exitCode;

  beforeEach(() => {
    vi.resetModules();
    mockCommandFactoryRun.mockClear();
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
  });

  it("bootstraps the command factory with the root module", async () => {
    await import("./main");

    expect(mockCommandFactoryRun).toHaveBeenCalledTimes(1);

    const firstCall = mockCommandFactoryRun.mock.calls[0];

    if (firstCall === undefined) throw new Error("firstCall is undefined");

    const module = firstCall[0];

    expect(module.name).toBe(MainModule.name);

    const options = firstCall[1];

    expect(options.bufferLogs).toBe(true);
    expect(options.logger).toBeDefined();
  });

  it("sets a non-zero exit code when the command factory rejects", async () => {
    await import("./main");

    const firstCall = mockCommandFactoryRun.mock.calls[0];

    if (firstCall === undefined) throw new Error("firstCall is undefined");

    const options = firstCall[1];
    const { logger, serviceErrorHandler } = options;

    if (logger === undefined) throw new Error("logger is undefined");
    if (serviceErrorHandler === undefined) {
      throw new Error("serviceErrorHandler is undefined");
    }

    const errorSpy = vi.spyOn(logger, "error").mockReturnValue(undefined);

    expect(process.exitCode).not.toBe(1);

    await serviceErrorHandler(new Error("💥 command exploded"));

    expect(process.exitCode).toBe(1);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });
});
