import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

interface CommandFactoryRunOptions {
  readonly bufferLogs?: boolean;
  readonly logger?: unknown;
  readonly serviceErrorHandler?: (error: Error) => void;
}

const mockLoggerError = vi.fn<(message: unknown, stack?: string) => void>();
const mockLoggerSetContext = vi.fn<(context: string) => void>();
const mockLogToStandardError = vi.fn<() => void>();
const mockCommandFactoryRun = vi.fn<
  (_module: unknown, _options: CommandFactoryRunOptions) => Promise<void>
>(async () => {});

// `main.ts` only reaches NestJS through `@codebase/logging`, so the logger
// package is the mock boundary — the real `LoggerService` is covered by its
// own package's tests.
vi.mock("@codebase/logging", () => {
  class MockLoggerService {
    static logToStandardError(): void {
      mockLogToStandardError();
    }

    error(message: unknown, stack?: string): void {
      mockLoggerError(message, stack);
    }

    setContext(context: string): void {
      mockLoggerSetContext(context);
    }
  }

  return {
    LoggerModule: function MockLoggerModule() {},
    LoggerService: MockLoggerService,
  };
});

vi.mock("nest-commander", () => {
  return {
    CommandFactory: {
      run: mockCommandFactoryRun,
    },
  };
});

vi.mock("./main.module", () => {
  function MockMainModule(): void {}

  return {
    MainModule: MockMainModule,
  };
});

function getRunOptions(): CommandFactoryRunOptions {
  const options = mockCommandFactoryRun.mock.calls[0]?.[1];

  if (options === undefined) {
    throw new Error("Expected CommandFactory.run to be called once.");
  }

  return options;
}

describe("main", () => {
  const originalArgv = process.argv;
  const originalExitCode = process.exitCode;

  beforeEach(() => {
    vi.resetModules();
    mockLoggerError.mockClear();
    mockLoggerSetContext.mockClear();
    mockLogToStandardError.mockClear();
    mockCommandFactoryRun.mockClear();
    process.argv = ["node", "codometer"];
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.argv = originalArgv;
    process.exitCode = originalExitCode;
  });

  it("bootstraps the command factory with a buffered stderr logger", async () => {
    await import("./main");

    expect(mockLogToStandardError).toHaveBeenCalledTimes(1);
    expect(mockLoggerSetContext).toHaveBeenCalledWith("CommandFactory");
    expect(mockCommandFactoryRun).toHaveBeenCalledTimes(1);
    expect(process.argv).toStrictEqual(["node", "codometer", "measure"]);

    const options = getRunOptions();

    expect(options.bufferLogs).toBe(true);
    expect(options.logger).toBeDefined();
  });

  it("exits non-zero and logs when a command throws", async () => {
    await import("./main");

    const { serviceErrorHandler } = getRunOptions();

    if (serviceErrorHandler === undefined) {
      throw new Error("serviceErrorHandler is undefined");
    }

    const error = new Error("💥 command exploded");
    serviceErrorHandler(error);

    expect(process.exitCode).toBe(1);
    expect(mockLoggerError).toHaveBeenCalledWith(error.message, error.stack);
  });
});
