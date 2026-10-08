import path from "node:path";

import { ConfigurationService } from "@conformetry/configuration";
import { InventoryService } from "@conformetry/output";
import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logging";

import { InstancesCommand } from "./instances.command";

import type { InventoriedInstance } from "@conformetry/core";
import type { DeepMocked } from "@golevelup/ts-vitest";

const GEARS: InventoriedInstance = {
  /** Discovery reports absolute paths, so the fixtures do too. */
  path: path.join(process.cwd(), "packages/widgets/src/modules/gears"),
  templates: [
    {
      matchedFileCount: 5,
      matchRatio: 1,
      name: "nestjs-command-module",
      templateFileCount: 5,
    },
    {
      matchedFileCount: 3,
      matchRatio: 0.6,
      name: "nestjs-service-module",
      templateFileCount: 5,
    },
  ],
};

const COGS: InventoriedInstance = {
  path: path.join(process.cwd(), "packages/widgets/src/modules/cogs"),
  templates: [
    {
      matchedFileCount: 5,
      matchRatio: 1,
      name: "nestjs-service-module",
      templateFileCount: 5,
    },
  ],
};

/** Standard output collected during one test. */
const output: string[] = [];

/** Every line the command wrote, joined so a single assertion can span lines. */
const written = (): string => output.join("\n");

/**
 * Dependencies are mocked here; that the real graph wires is proven by
 * `main.integration.test.ts`, which compiles the whole application.
 *
 * The listing renderer is the exception, provided real: it is pure string
 * formatting with no I/O, and mocking it would leave every assertion below
 * checking a stub rather than the output a caller sees.
 */
describe(InstancesCommand, () => {
  let command: InstancesCommand;
  let configurationService: DeepMocked<ConfigurationService>;
  let commandLogger: DeepMocked<LoggerService>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        InstancesCommand,
        InventoryService,
        {
          provide: ConfigurationService,
          useValue: createMock<ConfigurationService>(),
        },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    command = await module.resolve(InstancesCommand);
    configurationService = await module.resolve(ConfigurationService);
    commandLogger = await module.resolve(LoggerService);
  });

  // The shared setup clears every mock before each test, so the return values
  // are re-applied here rather than alongside the module.
  beforeEach(() => {
    process.exitCode = undefined;
    output.length = 0;
    vi.spyOn(console, "info").mockImplementation((...data: unknown[]) => {
      output.push(data.map(String).join(" "));
    });
    configurationService.resolveInventoriedInstances.mockReturnValue([
      GEARS,
      COGS,
    ]);
  });

  it("is defined", () => {
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    // Its own module: the shared setup clears mocks between tests, so a
    // constructor call recorded during `beforeAll` is no longer observable.
    const module = await Test.createTestingModule({
      providers: [
        InstancesCommand,
        InventoryService,
        {
          provide: ConfigurationService,
          useValue: createMock<ConfigurationService>(),
        },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();
    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("InstancesCommand");
  });

  describe("run", () => {
    // A path is only readable next to the directory the caller is standing in.
    it("lists every instance found, shortened against the working directory", async () => {
      await command.run([], {});
      const lines = written();

      expect(lines).toContain("packages/widgets/src/modules/gears");
      expect(lines).toContain("packages/widgets/src/modules/cogs");
      expect(lines).not.toContain(GEARS.path);
    });

    it("names the templates that explain each instance, and how well", async () => {
      await command.run([], {});
      const lines = written();

      expect(lines).toContain("Templates:");
      expect(lines).toContain("nestjs-command-module 5/5 files 100%");
      expect(lines).toContain("nestjs-service-module 3/5 files 60%");
    });

    it("passes the template filter through", async () => {
      await command.run([], { templates: ["nestjs-service-module"] });

      expect(
        configurationService.resolveInventoriedInstances,
      ).toHaveBeenCalledWith(
        expect.objectContaining({ templateNames: ["nestjs-service-module"] }),
      );
    });

    it("reads the configuration path the caller named", async () => {
      const scopedConfigurationService = createMock<ConfigurationService>();
      const module = await Test.createTestingModule({
        providers: [
          InstancesCommand,
          InventoryService,
          {
            provide: ConfigurationService,
            useValue: scopedConfigurationService,
          },
          { provide: LoggerService, useValue: createMock<LoggerService>() },
        ],
      }).compile();
      const scoped = await module.resolve(InstancesCommand);

      await scoped.run([], { config: "custom/conformetry.config.ts" });

      expect(
        scopedConfigurationService.loadConformetryConfiguration,
      ).toHaveBeenCalledWith("custom/conformetry.config.ts");
    });

    it("says so when the configured globs find nothing", async () => {
      configurationService.resolveInventoriedInstances.mockReturnValue([]);

      await command.run([], {});

      expect(written()).toContain("No instances were found");
    });

    it("distinguishes an unmatched filter from an empty workspace", async () => {
      configurationService.resolveInventoriedInstances.mockReturnValue([]);

      await command.run([], { templates: ["react-component"] });

      expect(written()).toContain(
        "No instance is explained by those templates",
      );
    });

    // The shared logger asserts every message opens with an emoji and a verb,
    // which is why the report-printing commands throw outside production.
    it("writes program output without going through the logger", async () => {
      await command.run([], {});

      expect(output).not.toHaveLength(0);
      expect(commandLogger.info).not.toHaveBeenCalled();
    });

    it("does not fail the command", async () => {
      await command.run([], {});

      expect(process.exitCode).toBeUndefined();
    });

    it("logs a debug entry marker naming the template filter", async () => {
      await command.run([], { templates: ["nestjs-service-module"] });

      expect(commandLogger.debug).toHaveBeenCalledWith(
        "📋 Listing conformetry instances",
        undefined,
        { templateFilter: ["nestjs-service-module"] },
      );
    });
  });

  describe("machine-readable output", () => {
    // Each path is usable as the templates command's --instances argument, so
    // the two commands compose without reformatting — which means the parseable
    // listing is shortened too, not only the readable one.
    it("writes parseable output carrying every instance", async () => {
      await command.run([], { json: true });

      expect(JSON.parse(written())).toStrictEqual([
        { ...GEARS, path: "packages/widgets/src/modules/gears" },
        { ...COGS, path: "packages/widgets/src/modules/cogs" },
      ]);
    });

    it("writes an empty collection when nothing is found", async () => {
      configurationService.resolveInventoriedInstances.mockReturnValue([]);

      await command.run([], { json: true });

      expect(JSON.parse(written())).toStrictEqual([]);
    });
  });

  describe("option parsing", () => {
    it("parses each option through the input service", () => {
      expect(command.parseJson()).toBe(true);
      expect(command.parseConfig("path")).toBeDefined();
      expect(command.parseTemplates("a,b")).toBeDefined();
    });
  });
});
