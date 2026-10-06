import { CommandFactory } from "nest-commander";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const setContextMock = vi.fn<(context: string) => void>();
const loggerConstructorMock = vi.fn<() => void>();
const errorMock =
  vi.fn<
    (message: string, trace?: string, data?: Record<string, unknown>) => void
  >();

vi.mock("./main.module", () => ({
  MainModule: function MainModule() {
    return undefined;
  },
}));

vi.mock("@codebase/logging", () => ({
  LoggerService: class MockLoggerService {
    constructor() {
      loggerConstructorMock();
    }

    error = errorMock;

    setContext = setContextMock;
  },
}));

describe("main bootstrap", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("boots command factory with buffered logs", async () => {
    const runSpy = vi.spyOn(CommandFactory, "run").mockResolvedValue(undefined);

    await import("./main");

    await vi.waitFor(() => {
      expect(runSpy).toHaveBeenCalledTimes(1);
    });

    expect(loggerConstructorMock).toHaveBeenCalledTimes(1);
    expect(setContextMock).toHaveBeenCalledWith("CommandFactory");

    expect(runSpy).toHaveBeenCalledWith(
      expect.any(Function),
      expect.anything(),
    );
  }, 15_000);

  it("fails the process when a command throws", async () => {
    const runSpy = vi.spyOn(CommandFactory, "run").mockResolvedValue(undefined);
    const previousExitCode = process.exitCode;

    await import("./main");

    await vi.waitFor(() => {
      expect(runSpy).toHaveBeenCalledTimes(1);
    });

    const options = runSpy.mock.calls[0]?.[1];
    const serviceErrorHandler =
      typeof options === "object" && "serviceErrorHandler" in options
        ? options.serviceErrorHandler
        : undefined;
    const error = new Error('Start lemma "nope" not found in the dataset.');

    try {
      await serviceErrorHandler?.(error);

      expect(serviceErrorHandler).toBeTypeOf("function");
      expect(process.exitCode).toBe(1);
      expect(errorMock).toHaveBeenCalledWith(
        "💥 Failed running command",
        error.stack,
        {
          message: error.message,
        },
      );
    } finally {
      process.exitCode = previousExitCode;
    }
  }, 15_000);
});
