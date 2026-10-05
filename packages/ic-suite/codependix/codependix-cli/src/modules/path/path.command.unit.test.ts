import {
  type GraphRunContext,
  RunContextService,
} from "@codependix/boundaries";
import { ConfigurationService } from "@codependix/configuration";
import { PathQueryService, ReportingService } from "@codependix/output";
import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logging";

import { PathCommand } from "./path.command";
import { PATH_MISSING_ARGUMENTS_ERROR } from "./path.constants";

describe(PathCommand, () => {
  let command: PathCommand;
  let configurationService: ConfigurationService;
  let loggerService: LoggerService;
  let pathQueryService: PathQueryService;
  let reportingService: ReportingService;
  let runContextService: RunContextService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PathCommand,
        {
          provide: ConfigurationService,
          useValue: createMock<ConfigurationService>(),
        },
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: PathQueryService,
          useValue: createMock<PathQueryService>(),
        },
        {
          provide: ReportingService,
          useValue: createMock<ReportingService>(),
        },
        {
          provide: RunContextService,
          useValue: createMock<RunContextService>(),
        },
      ],
    }).compile();

    command = await module.resolve(PathCommand);
  });

  beforeEach(() => {
    configurationService = createMock<ConfigurationService>();
    loggerService = createMock<LoggerService>();
    pathQueryService = createMock<PathQueryService>();
    reportingService = createMock<ReportingService>();
    runContextService = createMock<RunContextService>();

    pathQueryService.resolveFormat = vi
      .fn<typeof pathQueryService.resolveFormat>()
      .mockImplementation((fmt: string | undefined) => {
        if (fmt === "invalid-fmt") {
          return {
            errors: [
              '--format does not accept "invalid-fmt". It takes one of "json" and "markdown" and "mermaid", as in "--format markdown".',
            ],
            format: "markdown",
          };
        }
        if (fmt === "json" || fmt === "mermaid") {
          return {
            errors: [],
            format: fmt,
          };
        }
        return {
          errors: [],
          format: "markdown",
        };
      });
    pathQueryService.render = vi
      .fn<typeof pathQueryService.render>()
      .mockReturnValue("### Nx Neighborhood\n\n`app` → `lib`");

    command = new PathCommand(
      configurationService,
      loggerService,
      pathQueryService,
      reportingService,
      runContextService,
    );

    process.exitCode = 0;
  });

  it("is defined", () => {
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    const module = await Test.createTestingModule({
      providers: [
        PathCommand,
        {
          provide: ConfigurationService,
          useValue: createMock<ConfigurationService>(),
        },
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: PathQueryService,
          useValue: createMock<PathQueryService>(),
        },
        {
          provide: ReportingService,
          useValue: createMock<ReportingService>(),
        },
        {
          provide: RunContextService,
          useValue: createMock<RunContextService>(),
        },
      ],
    }).compile();

    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("PathCommand");
  });

  describe("parsing options", () => {
    it("parses config option", () => {
      vi.mocked(configurationService.parseOptionalOption).mockReturnValue(
        "custom.config.ts",
      );

      expect(command.parseConfig("custom.config.ts")).toBe("custom.config.ts");
    });

    it("parses directory option", () => {
      vi.mocked(configurationService.parsePathOption).mockReturnValue(
        "/custom/dir",
      );

      expect(command.parseDirectory("/custom/dir")).toBe("/custom/dir");
    });

    it("parses exclude and include options", () => {
      vi.mocked(configurationService.parseCommaDelimitedOption).mockReturnValue(
        ["a", "b"],
      );

      expect(command.parseExclude("a,b")).toStrictEqual(["a", "b"]);
      expect(command.parseInclude("a,b")).toStrictEqual(["a", "b"]);
    });

    it("parses toggle flags", () => {
      expect(command.parseFileImports()).toBe(true);
      expect(command.parseNoFileImports()).toBe(false);
      expect(command.parseNestjsModules()).toBe(true);
      expect(command.parseNoNestjsModules()).toBe(false);
      expect(command.parseNxProjects()).toBe(true);
      expect(command.parseNoNxProjects()).toBe(false);
    });

    it("parses format, projects, and tags options", () => {
      vi.mocked(configurationService.parseOptionalOption).mockImplementation(
        (value) => value,
      );

      expect(command.parseFormat("json")).toBe("json");
      expect(command.parseProjects("proj-*")).toBe("proj-*");
      expect(command.parseTags("tag-a")).toBe("tag-a");
    });
  });

  describe("run", () => {
    it("rejects when fewer than two positional arguments are passed", async () => {
      await command.run(["only-one"]);

      expect(loggerService.error).toHaveBeenCalledWith(
        "🕸️ Rejected the command line",
        undefined,
        { reasons: [PATH_MISSING_ARGUMENTS_ERROR] },
      );
      expect(process.exitCode).toBe(1);
    });

    it("rejects when format is invalid", async () => {
      await command.run(["a", "b"], { format: "invalid-fmt" });

      expect(loggerService.error).toHaveBeenCalledWith(
        "🕸️ Rejected the command line",
        undefined,
        {
          reasons: [
            '--format does not accept "invalid-fmt". It takes one of "json" and "markdown" and "mermaid", as in "--format markdown".',
          ],
        },
      );
      expect(process.exitCode).toBe(1);
    });

    it("executes query and prints report to stdout", async () => {
      const writeSpy = vi.spyOn(process.stdout, "write").mockReturnValue(true);
      const mockContext = createMock<GraphRunContext>();
      vi.mocked(runContextService.build).mockResolvedValue(mockContext);
      vi.mocked(pathQueryService.query).mockResolvedValue({
        nxProjects: {
          from: "app",
          path: ["app", "lib"],
          to: "lib",
        },
      });

      await command.run(["app", "lib"], { format: "markdown" });

      expect(runContextService.build).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: "check",
          options: { format: "markdown" },
        }),
      );
      expect(pathQueryService.query).toHaveBeenCalledWith({
        context: mockContext,
        from: "app",
        to: "lib",
      });
      expect(writeSpy).toHaveBeenCalledWith(
        expect.stringContaining("`app` → `lib`"),
      );
      expect(process.exitCode).toBe(0);

      writeSpy.mockRestore();
    });

    it("handles errors by delegating to reportingService.reportFailure", async () => {
      const error = new Error("Failed query");
      vi.mocked(runContextService.build).mockRejectedValue(error);

      await command.run(["app", "lib"]);

      expect(reportingService.reportFailure).toHaveBeenCalledWith(error);
    });
  });
});
