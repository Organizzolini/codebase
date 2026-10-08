import { createMock } from "@golevelup/ts-vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { IssueLabelsModule } from "./modules/issue-labels/issue-labels.module";
import type { SynchronizationModule } from "./modules/synchronization/synchronization.module";
import type { LoggerService } from "@codebase/logging";

type CommandFactoryRun = (
  module: unknown,
  options: {
    bufferLogs: boolean;
    logger: unknown;
    serviceErrorHandler?: (error: Error) => void;
  },
) => Promise<void>;

const run = vi.fn<CommandFactoryRun>().mockResolvedValue(undefined);
const loggerServiceMock = createMock<LoggerService>();
const issueLabelsModuleMock = createMock<IssueLabelsModule>();
const synchronizationModuleMock = createMock<SynchronizationModule>();

vi.mock("nest-commander", () => ({
  CommandFactory: {
    run,
  },
}));

vi.mock("@codebase/logging", () => ({
  // `main.module` imports `LoggerModule` from the same specifier, so the mock
  // has to stand in for the whole package, not just the service.
  LoggerModule: function LoggerModule() {},
  LoggerService: function LoggerService() {
    return loggerServiceMock;
  },
}));

vi.mock("./modules/issue-labels/issue-labels.module", () => ({
  IssueLabelsModule: function IssueLabelsModule() {
    return issueLabelsModuleMock;
  },
}));

vi.mock("./modules/synchronization/synchronization.module", () => ({
  SynchronizationModule: function SynchronizationModule() {
    return synchronizationModuleMock;
  },
}));

describe("main bootstrap", () => {
  const originalExitCode = process.exitCode;

  beforeEach(() => {
    run.mockClear();
    loggerServiceMock.setContext.mockClear();
    loggerServiceMock.error.mockClear();
    process.exitCode = undefined;
    vi.resetModules();
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
  });

  it("runs the synchronization command factory with a configured logger", async () => {
    await import("./main");

    expect(loggerServiceMock.setContext).toHaveBeenCalledWith("CommandFactory");
    expect(run).toHaveBeenCalledTimes(1);

    const firstCall = run.mock.calls[0];

    expect(firstCall).toBeDefined();
    expect(firstCall?.[1]).toStrictEqual(
      expect.objectContaining({ bufferLogs: true }),
    );
  });

  it("exits non-zero and logs when a command throws", async () => {
    expect.hasAssertions();

    await import("./main");

    const serviceErrorHandler = run.mock.calls[0]?.[1].serviceErrorHandler;

    if (serviceErrorHandler === undefined) {
      throw new Error("serviceErrorHandler is undefined");
    }

    const error = new Error("💥 command exploded");
    serviceErrorHandler(error);

    expect(process.exitCode).toBe(1);
    expect(loggerServiceMock.error).toHaveBeenCalledWith(
      error.message,
      error.stack,
    );
  });
});
