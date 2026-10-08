import { beforeEach, describe, expect, it, vi } from "vitest";

interface CommandFactoryRunOptions {
  errorHandler: (error: Error) => void;
  serviceErrorHandler: (error: Error) => void;
}

const mockLoggerError = vi.fn<(message: unknown) => void>();
const mockLoggerSetContext = vi.fn<(context: string) => void>();
const mockCommandFactoryRun = vi.fn<
  (_module: unknown, _options: CommandFactoryRunOptions) => Promise<void>
>(async () => {});

// `main.ts` only reaches NestJS through `@codebase/logging`, so the logger
// package is the mock boundary — the real `LoggerService` is covered by its
// own package's tests.
vi.mock("@codebase/logging", () => {
  class MockLoggerService {
    error(message: unknown): void {
      mockLoggerError(message);
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

vi.mock("./main.module.js", () => {
  function MockMainModule(): void {}

  return {
    MainModule: MockMainModule,
  };
});

function getRunOptions(): CommandFactoryRunOptions {
  const firstCall = mockCommandFactoryRun.mock.calls[0];

  if (firstCall === undefined) {
    throw new Error("Expected CommandFactory.run to be called once.");
  }

  const options = firstCall[1] as CommandFactoryRunOptions | undefined;

  if (!options) {
    throw new Error("Expected CommandFactory.run options to be defined.");
  }

  return options;
}

async function importMainModule(): Promise<void> {
  await import("./main");
}

describe("main", () => {
  beforeEach(() => {
    vi.resetModules();
    mockLoggerError.mockClear();
    mockLoggerSetContext.mockClear();
    mockCommandFactoryRun.mockClear();
    process.exitCode = 0;
    process.argv = ["node", "conformetry"];
  });

  it("bootstraps the command factory without rewriting argv", async () => {
    process.argv = [
      "node",
      "conformetry",
      "generate",
      "--name",
      "react-component",
      "--project",
      "lexico-components",
    ];

    await importMainModule();

    expect(mockCommandFactoryRun).toHaveBeenCalledTimes(1);
    expect(mockLoggerSetContext).toHaveBeenCalledWith("CommandFactory");
    expect(process.argv).toStrictEqual([
      "node",
      "conformetry",
      "generate",
      "--name",
      "react-component",
      "--project",
      "lexico-components",
    ]);
    expect(process.env["CONFORMETRY_GENERATOR_OPTIONS"]).toBeUndefined();
  });

  it("wires command error handler to mark process as failed", async () => {
    await importMainModule();

    const runOptions = getRunOptions();
    const failure = new Error("command failure");

    runOptions.errorHandler(failure);

    expect(process.exitCode).toBe(1);
    expect(mockLoggerError).toHaveBeenCalledWith(failure);
  });

  it("wires service error handler to mark process as failed", async () => {
    await importMainModule();

    const runOptions = getRunOptions();
    const failure = new Error("service failure");

    runOptions.serviceErrorHandler(failure);

    expect(process.exitCode).toBe(1);
    expect(mockLoggerError).toHaveBeenCalledWith(failure);
  });
});
