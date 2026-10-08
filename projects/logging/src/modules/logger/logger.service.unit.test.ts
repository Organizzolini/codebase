import path from "node:path";

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

import { LoggerService } from "./logger.service";

const { existsSyncMock, mkdirSyncMock } = vi.hoisted(() => ({
  existsSyncMock: vi.fn<(path: string) => boolean>(),
  mkdirSyncMock:
    vi.fn<
      (path: string, options?: { recursive?: boolean }) => string | undefined
    >(),
}));

vi.mock("node:fs", () => ({
  existsSync: existsSyncMock,
  mkdirSync: mkdirSyncMock,
}));

describe(LoggerService, () => {
  const originalLogLevel = process.env["LOG_LEVEL"];
  const originalNodeEnvironment = process.env["NODE_ENV"];

  interface LoggerChildMock {
    debug: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
    trace: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
  }

  let service: LoggerService;

  const createLoggerChildMock = (): LoggerChildMock => ({
    debug: vi.fn<(...parameters: unknown[]) => void>(),
    error: vi.fn<(...parameters: unknown[]) => void>(),
    info: vi.fn<(...parameters: unknown[]) => void>(),
    trace: vi.fn<(...parameters: unknown[]) => void>(),
    warn: vi.fn<(...parameters: unknown[]) => void>(),
  });

  // `child` is private on the service, so it is replaced by assignment rather
  // than a cast — a double cast to `unknown` would cost the package its 100%
  // type coverage.
  const setLoggerChildMock = (loggerChildMock: LoggerChildMock): void => {
    Object.assign(service, { child: loggerChildMock });
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [LoggerService],
    }).compile();

    service = await module.resolve(LoggerService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe("environment initialization", () => {
    afterEach(() => {
      if (originalNodeEnvironment === undefined) {
        delete process.env["NODE_ENV"];
      } else {
        process.env["NODE_ENV"] = originalNodeEnvironment;
      }

      if (originalLogLevel === undefined) {
        delete process.env["LOG_LEVEL"];
      } else {
        process.env["LOG_LEVEL"] = originalLogLevel;
      }

      vi.resetModules();
    });

    // That the bytes actually leave on file descriptor 2 is proved where it can
    // be observed — `codometer-cli`'s end-to-end suite runs the CLI as a real
    // process and reads the two streams apart. Here the branches are covered
    // and the destination is built without complaint.
    it("sends production output to standard error when asked to", async () => {
      process.env["NODE_ENV"] = "production";
      process.env["LOG_LEVEL"] = "silent";
      vi.resetModules();

      const { LoggerService: LoggerServiceForEnvironment } =
        await import("./logger.service");

      LoggerServiceForEnvironment.logToStandardError();

      const logger = new LoggerServiceForEnvironment();

      expect(() => {
        logger.setContext("StandardErrorContext");
        logger.log("🚀 Started on standard error");
      }).not.toThrow();
    });

    it("sends development output to standard error when asked to", async () => {
      process.env["NODE_ENV"] = "development";
      process.env["LOG_LEVEL"] = "silent";
      vi.resetModules();

      const { LoggerService: LoggerServiceForEnvironment } =
        await import("./logger.service");

      LoggerServiceForEnvironment.logToStandardError();

      const logger = new LoggerServiceForEnvironment();

      expect(() => {
        logger.setContext("StandardErrorContext");
        logger.log("🚀 Started on standard error");
      }).not.toThrow();
    });

    // The next adopter's hazard: a second command-line tool calling this after
    // its first log line would otherwise get no signal and quietly corrupt its
    // own piped output.
    it("warns rather than pretending when asked too late", async () => {
      process.env["NODE_ENV"] = "development";
      process.env["LOG_LEVEL"] = "silent";
      vi.resetModules();

      const { LoggerService: LoggerServiceForEnvironment } =
        await import("./logger.service");
      const emitWarningSpy = vi
        .spyOn(process, "emitWarning")
        .mockReturnValue(undefined);

      // Building a logger is what fixes the destination, first line or not.
      const logger = new LoggerServiceForEnvironment();
      logger.setContext("TooLateContext");

      LoggerServiceForEnvironment.logToStandardError();

      expect(emitWarningSpy).toHaveBeenCalledExactlyOnceWith(
        expect.stringContaining(
          "was called after the first log line",
        ) as string,
      );

      emitWarningSpy.mockRestore();
    });

    it("initializes logger in production mode with explicit log level", async () => {
      process.env["NODE_ENV"] = "production";
      process.env["LOG_LEVEL"] = "debug";
      vi.resetModules();

      const { LoggerService: LoggerServiceForEnvironment } =
        await import("./logger.service");
      const logger = new LoggerServiceForEnvironment();

      expect(() => {
        logger.setContext("ProductionTestContext");
        logger.log("🚀 Started in production mode");
      }).not.toThrow();
    });

    it("initializes logger in production mode with default log level", async () => {
      process.env["NODE_ENV"] = "production";
      delete process.env["LOG_LEVEL"];
      vi.resetModules();

      const { LoggerService: LoggerServiceForEnvironment } =
        await import("./logger.service");
      const logger = new LoggerServiceForEnvironment();

      expect(() => {
        logger.setContext("ProductionDefaultTestContext");
        logger.log("🚀 Started with the default log level");
      }).not.toThrow();
    });

    it("initializes logger in development mode", async () => {
      process.env["NODE_ENV"] = "development";
      delete process.env["LOG_LEVEL"];
      vi.resetModules();

      const { LoggerService: LoggerServiceForEnvironment } =
        await import("./logger.service");
      const logger = new LoggerServiceForEnvironment();

      expect(() => {
        logger.setContext("DevelopmentTestContext");
        logger.log("🚀 Started in development mode");
      }).not.toThrow();
    });

    it("neither validates nor tags an emoji in production", async () => {
      process.env["NODE_ENV"] = "production";
      vi.resetModules();

      const { LoggerService: ProductionLoggerService } =
        await import("./logger.service");
      const logger = new ProductionLoggerService();
      const loggerChildMock = createLoggerChildMock();

      logger.setContext("ProductionValidationContext");
      Object.assign(logger, { child: loggerChildMock });

      // A message that would throw in development passes untouched here — a
      // logger must never be the reason production falls over.
      expect(() => {
        logger.log("no emoji and no verb");
      }).not.toThrow();

      expect(loggerChildMock.info).toHaveBeenCalledWith(
        { context: "ProductionValidationContext" },
        "no emoji and no verb",
      );
    });
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("message convention", () => {
    beforeEach(() => {
      service.setContext("ConventionContext");
      setLoggerChildMock(createLoggerChildMock());
    });

    it("rejects a message without a leading emoji", () => {
      expect(() => {
        service.log("Downloading sources");
      }).toThrow(/must start with an emoji/);
    });

    it("rejects a message whose first word is not a verb", () => {
      expect(() => {
        service.log("⚠️ Options: everything");
      }).toThrow(/present progressive or past tense/);
    });

    it("rejects a message with an emoji but no word after it", () => {
      expect(() => {
        service.log("📥 123");
      }).toThrow(/present progressive or past tense/);
    });

    it("accepts a present progressive verb", () => {
      expect(() => {
        service.log("📥 Downloading sources");
      }).not.toThrow();
    });

    it("accepts a regular past verb", () => {
      expect(() => {
        service.log("📥 Downloaded sources");
      }).not.toThrow();
    });

    it("accepts a verb no dictionary carries", () => {
      expect(() => {
        service.log("🔑 Upserting lexemes");
      }).not.toThrow();
    });

    it("accepts an irregular past verb", () => {
      expect(() => {
        service.log("✏️ Wrote the calendar file");
      }).not.toThrow();
    });

    it("exempts framework-owned contexts", () => {
      // `nest-commander` logs through this very instance, and its messages are
      // not ours to rephrase.
      expect(() => {
        service.log("CommanderError: (outputHelp)", "CommandFactory");
      }).not.toThrow();
    });

    it("exempts @nestjs/typeorm's connection-retry warning", () => {
      // `TypeOrmModule`'s own connection-retry logic logs through this
      // instance when it is registered as Nest's global logger. A first
      // connection attempt failing is routine, not a reason to crash.
      expect(() => {
        service.error(
          "Unable to connect to the database. Retrying (1)...",
          "error stack",
          "TypeOrmModule",
        );
      }).not.toThrow();
    });

    it("exempts @nestjs/core's uncaught bootstrap exception handler", () => {
      // `ExceptionHandler` is @nestjs/core's catch-all for any unhandled
      // exception during dependency initialization — a native module ABI
      // mismatch, a database driver failing to load, anything. It logs the
      // raw exception with no message convention of its own, and Nest's
      // default `abortOnError` turns a throw here into a fatal
      // `process.abort()`, so this path must never throw either.
      expect(() => {
        service.error(
          new Error("The module was compiled against a different version"),
          undefined,
          "ExceptionHandler",
        );
      }).not.toThrow();
    });
  });

  describe("structured data", () => {
    it("carries the emoji as a field and the prose as the message", () => {
      const loggerChildMock = createLoggerChildMock();

      service.setContext("DataContext");
      setLoggerChildMock(loggerChildMock);
      service.log("📥 Downloading sources");

      expect(loggerChildMock.info).toHaveBeenCalledWith(
        { context: "DataContext", emoji: "📥" },
        "Downloading sources",
      );
    });

    it("merges the data argument into the log bindings", () => {
      const loggerChildMock = createLoggerChildMock();

      service.setContext("DataContext");
      setLoggerChildMock(loggerChildMock);
      service.log("📥 Downloaded sources", undefined, {
        count: 412,
        durationMs: 1421,
        total: 428,
      });

      expect(loggerChildMock.info).toHaveBeenCalledWith(
        {
          context: "DataContext",
          count: 412,
          durationMs: 1421,
          emoji: "📥",
          total: 428,
        },
        "Downloaded sources",
      );
    });

    it("keeps reserved bindings from being overwritten by data", () => {
      const loggerChildMock = createLoggerChildMock();

      service.setContext("DataContext");
      setLoggerChildMock(loggerChildMock);
      service.log("📥 Downloaded sources", undefined, { context: "spoofed" });

      expect(loggerChildMock.info).toHaveBeenCalledWith(
        { context: "DataContext", emoji: "📥" },
        "Downloaded sources",
      );
    });
  });

  describe("setContext", () => {
    it("should apply context to subsequent log calls", () => {
      const loggerChildMock = createLoggerChildMock();

      service.setContext("TestService");
      setLoggerChildMock(loggerChildMock);
      service.log("📝 Logged a message");

      expect(loggerChildMock.info).toHaveBeenCalledWith(
        { context: "TestService", emoji: "📝" },
        "Logged a message",
      );
    });
  });

  describe("info", () => {
    it("should log message with current context", () => {
      const loggerChildMock = createLoggerChildMock();

      service.setContext("TestContext");
      setLoggerChildMock(loggerChildMock);

      service.info("📝 Logged a test message");

      expect(loggerChildMock.info).toHaveBeenCalledWith(
        { context: "TestContext", emoji: "📝" },
        "Logged a test message",
      );
    });

    it("should prefer provided context over instance context", () => {
      const loggerChildMock = createLoggerChildMock();

      service.setContext("InstanceContext");
      setLoggerChildMock(loggerChildMock);

      service.info("📝 Logged a test message", "CustomContext");

      expect(loggerChildMock.info).toHaveBeenCalledWith(
        { context: "CustomContext", emoji: "📝" },
        "Logged a test message",
      );
    });
  });

  describe("log", () => {
    it("should delegate to info for NestJS's own LoggerService contract", () => {
      const infoSpy = vi.spyOn(service, "info").mockReturnValue(undefined);

      service.log("📝 Logged a test message", "CustomContext", { count: 1 });

      expect(infoSpy).toHaveBeenCalledExactlyOnceWith(
        "📝 Logged a test message",
        "CustomContext",
        { count: 1 },
      );

      infoSpy.mockRestore();
    });
  });

  describe("debug", () => {
    it("should log debug messages with current context", () => {
      const loggerChildMock = createLoggerChildMock();

      service.setContext("TestContext");
      setLoggerChildMock(loggerChildMock);

      service.debug("🔍 Inspecting the parsed tree", undefined, { count: 3 });

      expect(loggerChildMock.debug).toHaveBeenCalledWith(
        { context: "TestContext", count: 3, emoji: "🔍" },
        "Inspecting the parsed tree",
      );
    });
  });

  describe("warn", () => {
    it("should log warning messages with current context", () => {
      const loggerChildMock = createLoggerChildMock();

      service.setContext("TestContext");
      setLoggerChildMock(loggerChildMock);

      service.warn("📄 Missing a data file");

      expect(loggerChildMock.warn).toHaveBeenCalledWith(
        { context: "TestContext", emoji: "📄" },
        "Missing a data file",
      );
    });
  });

  describe("error", () => {
    it("should log error messages with optional stack trace", () => {
      const loggerChildMock = createLoggerChildMock();

      service.setContext("TestContext");
      setLoggerChildMock(loggerChildMock);
      const stack = "Error: test stack trace";

      service.error("📥 Failed downloading sources", stack);

      expect(loggerChildMock.error).toHaveBeenCalledWith(
        { context: "TestContext", emoji: "📥", stack },
        "Failed downloading sources",
      );
    });

    it("should log error without stack trace", () => {
      const loggerChildMock = createLoggerChildMock();

      service.setContext("ErrorContext");
      setLoggerChildMock(loggerChildMock);

      service.error("📥 Failed downloading sources");

      expect(loggerChildMock.error).toHaveBeenCalledWith(
        { context: "ErrorContext", emoji: "📥", stack: undefined },
        "Failed downloading sources",
      );
    });

    it("should read a third string argument as NestJS's context", () => {
      const loggerChildMock = createLoggerChildMock();

      service.setContext("InstanceContext");
      setLoggerChildMock(loggerChildMock);

      service.error("📥 Failed downloading sources", "stack", "CustomContext");

      expect(loggerChildMock.error).toHaveBeenCalledWith(
        { context: "CustomContext", emoji: "📥", stack: "stack" },
        "Failed downloading sources",
      );
    });

    it("should read a third object argument as structured data", () => {
      const loggerChildMock = createLoggerChildMock();

      service.setContext("ErrorContext");
      setLoggerChildMock(loggerChildMock);

      service.error("📥 Failed downloading sources", "stack", { count: 7 });

      expect(loggerChildMock.error).toHaveBeenCalledWith(
        { context: "ErrorContext", count: 7, emoji: "📥", stack: "stack" },
        "Failed downloading sources",
      );
    });
  });

  describe("verbose", () => {
    it("should log verbose messages at trace level", () => {
      const loggerChildMock = createLoggerChildMock();

      service.setContext("TestContext");
      setLoggerChildMock(loggerChildMock);

      service.verbose("🔬 Tracing the resolution order");

      expect(loggerChildMock.trace).toHaveBeenCalledWith(
        { context: "TestContext", emoji: "🔬" },
        "Tracing the resolution order",
      );
    });
  });

  describe("buildErrorLogEntry", () => {
    it("should prefer stack trace when error includes a stack", () => {
      const error = new Error("fallback message");
      error.stack = "stack trace content";

      const result = service.buildErrorLogEntry("LoggerService", error);

      expect(result.errorMessage).toBe("stack trace content");
      expect(result.logLine).toContain("LoggerService: stack trace content");
    });

    it("should use message when stack trace is empty", () => {
      const error = new Error("message content");
      error.stack = "";

      const result = service.buildErrorLogEntry("LoggerService", error);

      expect(result.errorMessage).toBe("message content");
      expect(result.logLine).toContain("LoggerService: message content");
    });

    it("should normalize non-error values", () => {
      const result = service.buildErrorLogEntry("LoggerService", {
        detail: "value",
      });

      expect(result.errorMessage).toBe("[object Object]");
      expect(result.logLine).toContain("LoggerService: [object Object]");
    });
  });

  describe("createTimestampedOutputLogFilePath", () => {
    it("should create output directory when missing", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-02T03:04:05.678Z"));

      existsSyncMock.mockReturnValue(false);
      mkdirSyncMock.mockReturnValue(undefined);

      const filePath = service.createTimestampedOutputLogFilePath("errors");

      const expectedOutputDirectory = path.join(process.cwd(), "output");

      expect(existsSyncMock).toHaveBeenCalledWith(expectedOutputDirectory);
      expect(mkdirSyncMock).toHaveBeenCalledWith(expectedOutputDirectory, {
        recursive: true,
      });
      expect(filePath).toBe(
        path.join(
          expectedOutputDirectory,
          "errors-2026-01-02T03-04-05-678Z.log",
        ),
      );
    });

    it("should skip directory creation when output directory already exists", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-02T03:04:05.678Z"));

      existsSyncMock.mockReturnValue(true);
      mkdirSyncMock.mockReturnValue(undefined);

      const filePath = service.createTimestampedOutputLogFilePath("errors");

      const expectedOutputDirectory = path.join(process.cwd(), "output");

      expect(existsSyncMock).toHaveBeenCalledWith(expectedOutputDirectory);
      expect(mkdirSyncMock).not.toHaveBeenCalled();
      expect(filePath).toBe(
        path.join(
          expectedOutputDirectory,
          "errors-2026-01-02T03-04-05-678Z.log",
        ),
      );
    });
  });
});
