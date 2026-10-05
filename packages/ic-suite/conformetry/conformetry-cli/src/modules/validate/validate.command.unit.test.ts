import { ConfigurationService } from "@conformetry/configuration";
import { ReportingService } from "@conformetry/output";
import { ValidationService } from "@conformetry/validation";
import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logging";

import { ValidateCommand } from "./validate.command";

import type {
  ConformetryConfiguration,
  Instance,
  TemplateDefinition,
} from "@conformetry/configuration";

const CONFIGURATION: ConformetryConfiguration = [
  {
    inputs: {},
    instances: [{ patterns: ["packages/*/src/modules/*"] }],
    name: "widget",
    templatePath: "configuration/templates/widget",
  },
];

const INSTANCE: Instance = {
  nameStem: "gears",
  path: "/w/packages/widgets/src/modules",
};

const TEMPLATE: TemplateDefinition = {
  directoryPath: "/w/configuration/templates/widget",
  filePaths: [],
  name: "widget",
};

const GADGET_INSTANCE: Instance = {
  nameStem: "cogs",
  path: "/w/applications/gadgets/src/modules",
};

/** Two templates, so a narrowing has something to leave behind. */
const TWO_TEMPLATES: ConformetryConfiguration = [
  {
    description: "A widget module",
    inputs: {},
    instances: [{ patterns: ["packages/*/src/modules/*"] }],
    name: "widget",
    templatePath: "configuration/templates/widget",
  },
  {
    inputs: {},
    instances: [{ patterns: ["applications/*/src/modules/*"] }],
    name: "gadget",
    templatePath: "configuration/templates/gadget",
  },
];

/**
 * Dependencies are mocked here; that the real graph wires is proven by
 * `main.integration.test.ts`, which compiles the whole application.
 */
describe(ValidateCommand, () => {
  let command: ValidateCommand;
  let configurationService: ConfigurationService;
  let commandLogger: LoggerService;
  let reportingService: ReportingService;
  let validationService: ValidationService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ValidateCommand,
        {
          provide: ConfigurationService,
          useValue: createMock<ConfigurationService>(),
        },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        { provide: ReportingService, useValue: createMock<ReportingService>() },
        {
          provide: ValidationService,
          useValue: createMock<ValidationService>(),
        },
      ],
    }).compile();

    command = await module.resolve(ValidateCommand);
    configurationService = await module.resolve(ConfigurationService);
    commandLogger = await module.resolve(LoggerService);
    reportingService = await module.resolve(ReportingService);
    validationService = await module.resolve(ValidationService);
  });

  // The shared setup clears every mock before each test, so the return values
  // are re-applied here rather than alongside the module.
  beforeEach(() => {
    process.exitCode = undefined;
    vi.mocked(
      configurationService.loadConformetryConfiguration,
    ).mockResolvedValue(CONFIGURATION);
    vi.mocked(configurationService.findInstances).mockReturnValue([INSTANCE]);
    vi.mocked(configurationService.collectTemplates).mockReturnValue([
      TEMPLATE,
    ]);
    vi.mocked(validationService.validate).mockReturnValue({
      checkedPaths: [],
      fileResults: [],
      ok: true,
      scores: [],
      unmatched: [],
    });
    vi.mocked(configurationService.isAtTerminal).mockReturnValue(false);
    // Which groups this host can locate is the discovery service's rule, and
    // is tested there. Here every group is locatable unless a test says
    // otherwise, so these cases exercise the command's reaction rather than
    // restating the rule.
    vi.mocked(configurationService.readWorkspaceGroups).mockImplementation(
      (groups) => [...groups],
    );
  });

  it("is defined", () => {
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    // Its own module: the shared setup clears mocks between tests, so a
    // constructor call recorded during `beforeAll` is no longer observable.
    const module = await Test.createTestingModule({
      providers: [
        ValidateCommand,
        {
          provide: ConfigurationService,
          useValue: createMock<ConfigurationService>(),
        },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        { provide: ReportingService, useValue: createMock<ReportingService>() },
        {
          provide: ValidationService,
          useValue: createMock<ValidationService>(),
        },
      ],
    }).compile();
    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("ValidateCommand");
  });

  describe("run", () => {
    it("validates the configured instances and reports the outcome", async () => {
      await command.run([], {});

      expect(configurationService.findInstances).toHaveBeenCalledWith(
        expect.objectContaining({ patterns: ["packages/*/src/modules/*"] }),
      );
      expect(validationService.validate).toHaveBeenCalledWith(
        expect.objectContaining({ instances: [INSTANCE] }),
      );
      expect(commandLogger.info).toHaveBeenCalledTimes(1);
    });

    it("writes the report to stdout rather than through the logger", async () => {
      const write = vi.spyOn(process.stdout, "write").mockReturnValue(true);

      vi.mocked(reportingService.formatReport).mockReturnValue(
        "All checked files conform.",
      );

      await command.run([], {});

      // The report is a document for a reader, and the logger rejects any
      // message that does not open with an emoji and a verb — which every
      // report, success message included, does not.
      expect(write).toHaveBeenCalledWith("All checked files conform.\n");
      expect(commandLogger.info).not.toHaveBeenCalledWith(
        expect.stringContaining("All checked files conform."),
      );
    });

    it("logs the outcome as a conventional message with the counts as data", async () => {
      await command.run([], {});

      expect(commandLogger.info).toHaveBeenCalledWith(
        expect.stringMatching(/^👔 Validated /u),
        undefined,
        { count: 0, failedCount: 0, unmatchedCount: 0 },
      );
    });

    it("logs a debug entry marker naming the instance filter", async () => {
      await command.run([], { instances: ["tools/*"] });

      expect(commandLogger.debug).toHaveBeenCalledWith(
        "🔍 Validating conformetry instances",
        undefined,
        { instanceFilter: ["tools/*"] },
      );
    });

    it("lets an explicit glob override the configured instances", async () => {
      await command.run([], { instances: ["tools/*"] });

      expect(configurationService.findInstances).toHaveBeenCalledWith(
        expect.objectContaining({ patterns: ["tools/*"] }),
      );
    });

    it("passes a group's substitutions to glob expansion", async () => {
      vi.mocked(
        configurationService.loadConformetryConfiguration,
      ).mockResolvedValue([
        {
          inputs: {},
          instances: [
            {
              patterns: ["packages/*"],
              substitutions: { type: "packages" },
            },
          ],
          name: "widget",
          templatePath: "configuration/templates/widget",
        },
      ]);

      await command.run([], {});

      expect(configurationService.findInstances).toHaveBeenCalledWith(
        expect.objectContaining({ substitutions: { type: "packages" } }),
      );
    });

    it("expands a group that names no patterns to an empty glob list", async () => {
      vi.mocked(
        configurationService.loadConformetryConfiguration,
      ).mockResolvedValue([
        {
          inputs: {},
          instances: [{ tags: ["language:typescript"] }],
          name: "widget",
          templatePath: "configuration/templates/widget",
        },
      ]);

      await command.run([], {});

      expect(configurationService.findInstances).toHaveBeenCalledWith(
        expect.objectContaining({ patterns: [] }),
      );
    });

    it("passes a run-level threshold through to validation", async () => {
      await command.run([], { threshold: 0.9 });

      expect(validationService.validate).toHaveBeenCalledWith(
        expect.objectContaining({ threshold: 0.9 }),
      );
    });

    it("passes an instance group's threshold to glob expansion", async () => {
      vi.mocked(
        configurationService.loadConformetryConfiguration,
      ).mockResolvedValue([
        {
          inputs: {},
          instances: [{ patterns: ["packages/*"], threshold: 0.75 }],
          name: "widget",
          templatePath: "configuration/templates/widget",
        },
      ]);

      await command.run([], {});

      expect(configurationService.findInstances).toHaveBeenCalledWith(
        expect.objectContaining({ threshold: 0.75 }),
      );
    });

    it("names the unmatched instances in the failure message", async () => {
      vi.mocked(validationService.validate).mockReturnValue({
        checkedPaths: [],
        fileResults: [],
        ok: false,
        scores: [],
        unmatched: [
          { instance: INSTANCE, reason: "no-match", tiedTemplateNames: [] },
        ],
      });

      // An unmatched instance has no score to report, so the count is the only
      // thing that can explain why the run failed.
      await expect(command.run([], {})).rejects.toThrow(
        "1 instance(s) matched no template",
      );
      expect(commandLogger.warn).toHaveBeenCalledWith(
        "⚠️ Rejected non-conforming instances",
        undefined,
        { failedCount: 0, unmatchedCount: 1 },
      );

      process.exitCode = undefined;
    });

    it("passes a language filter through", async () => {
      await command.run([], { languages: ["typescript"] });

      expect(validationService.validate).toHaveBeenCalledWith(
        expect.objectContaining({ languageNames: ["typescript"] }),
      );
    });

    it("reads the configuration path the caller named", async () => {
      await command.run([], { config: "custom/conformetry.config.ts" });

      expect(
        configurationService.loadConformetryConfiguration,
      ).toHaveBeenCalledWith("custom/conformetry.config.ts");
    });

    it("fails the command when an instance does not conform", async () => {
      vi.mocked(validationService.validate).mockReturnValue({
        checkedPaths: [],
        fileResults: [
          {
            differences: [],
            filename: "gears.ts",
            instanceFilePath: "/w/gears.ts",
            templateFilePath: "/w/template.ts",
            totalWeight: 4,
          },
        ],
        ok: false,
        scores: [
          {
            failedWeight: 1,
            instancePath: "/w",
            ok: false,
            score: 0.75,
            templateName: "widget",
            threshold: 1,
            totalWeight: 4,
          },
        ],
        unmatched: [],
      });

      await expect(command.run([], {})).rejects.toThrow("Validation failed");
      expect(process.exitCode).toBe(1);
      expect(commandLogger.warn).toHaveBeenCalledWith(
        "⚠️ Rejected non-conforming instances",
        undefined,
        { failedCount: 1, unmatchedCount: 0 },
      );

      process.exitCode = undefined;
    });
  });

  describe("template narrowing", () => {
    /** Answers each glob with the instance that configuration locates. */
    function locateInstancesByPattern(): void {
      vi.mocked(configurationService.findInstances).mockImplementation(
        (args) => {
          if (args.patterns.includes("packages/*/src/modules/*")) {
            return [INSTANCE];
          }

          return args.patterns.includes("applications/*/src/modules/*")
            ? [GADGET_INSTANCE]
            : [];
        },
      );
    }

    beforeEach(() => {
      vi.mocked(
        configurationService.loadConformetryConfiguration,
      ).mockResolvedValue(TWO_TEMPLATES);
      locateInstancesByPattern();
    });

    // The case most able to read as a green run when it is not one: a
    // narrowing that matches nothing produces no findings, and an empty
    // findings list is what a clean report looks like.
    it("says nothing matched rather than reporting a vacuous pass", async () => {
      vi.mocked(configurationService.findInstances).mockReturnValue([]);

      const write = vi.spyOn(process.stdout, "write").mockReturnValue(true);

      await command.run([], { templates: ["widget"] });

      expect(write).toHaveBeenCalledWith(
        expect.stringContaining("No instances belong to widget"),
      );
      expect(validationService.validate).not.toHaveBeenCalled();
      expect(process.exitCode).toBeUndefined();
    });

    // A tagged group's globs are read inside each project its tags select, and
    // this host resolves no tags. Saying so is the difference between "I
    // cannot see this template's instances" and "it has none".
    it("says a tag-scoped template needs a tag-resolving host", async () => {
      vi.mocked(
        configurationService.loadConformetryConfiguration,
      ).mockResolvedValue([
        {
          inputs: {},
          instances: [
            { patterns: ["src/modules/*"], tags: ["framework:nestjs"] },
          ],
          name: "widget",
          templatePath: "configuration/templates/widget",
        },
      ]);

      vi.mocked(configurationService.readWorkspaceGroups).mockReturnValue([]);

      const write = vi.spyOn(process.stdout, "write").mockReturnValue(true);

      await command.run([], { templates: ["widget"] });

      expect(write).toHaveBeenCalledWith(
        expect.stringContaining("locates instances by project tag"),
      );
      expect(process.exitCode).toBeUndefined();
    });

    // Expanding it from the working directory would match whatever sat at the
    // same relative path and measure it against a template scoped elsewhere.
    it("never globs a tag-scoped group from the working directory", async () => {
      vi.mocked(
        configurationService.loadConformetryConfiguration,
      ).mockResolvedValue([
        {
          inputs: {},
          instances: [
            { patterns: ["src/modules/*"], tags: ["framework:nestjs"] },
          ],
          name: "widget",
          templatePath: "configuration/templates/widget",
        },
      ]);

      vi.mocked(configurationService.readWorkspaceGroups).mockReturnValue([]);

      await command.run([], { templates: ["widget"] });

      expect(configurationService.findInstances).not.toHaveBeenCalledWith(
        expect.objectContaining({ patterns: ["src/modules/*"] }),
      );
    });

    it("validates only the selected template's instances", async () => {
      await command.run([], { templates: ["gadget"] });

      expect(validationService.validate).toHaveBeenCalledWith(
        expect.objectContaining({ instances: [GADGET_INSTANCE] }),
      );
    });

    it("measures against only the selected templates", async () => {
      await command.run([], { templates: ["gadget"] });

      expect(configurationService.collectTemplates).toHaveBeenCalledWith(
        expect.objectContaining({
          configuration: [TWO_TEMPLATES[1]],
        }),
      );
    });

    it("accepts several templates at once", async () => {
      await command.run([], { templates: ["gadget", "widget"] });

      expect(validationService.validate).toHaveBeenCalledWith(
        expect.objectContaining({
          instances: [GADGET_INSTANCE, INSTANCE],
        }),
      );
    });

    // Neither flag overrides the other: each removes candidates from one side
    // before the pairing, so the run is their intersection.
    it("intersects an instance glob with the selected templates", async () => {
      vi.mocked(configurationService.findInstances).mockImplementation(
        (args) => {
          if (args.patterns.includes("tools/*")) {
            return [INSTANCE, GADGET_INSTANCE];
          }

          return args.patterns.includes("applications/*/src/modules/*")
            ? [GADGET_INSTANCE]
            : [];
        },
      );

      await command.run([], {
        instances: ["tools/*"],
        templates: ["gadget"],
      });

      expect(validationService.validate).toHaveBeenCalledWith(
        expect.objectContaining({ instances: [GADGET_INSTANCE] }),
      );
    });

    it("composes with a language filter", async () => {
      await command.run([], {
        languages: ["typescript"],
        templates: ["gadget"],
      });

      expect(validationService.validate).toHaveBeenCalledWith(
        expect.objectContaining({
          instances: [GADGET_INSTANCE],
          languageNames: ["typescript"],
        }),
      );
    });

    // Silently dropping the name would produce a narrower run than asked for
    // and, with nothing left, a vacuous pass.
    it("names the real templates when given one that does not exist", async () => {
      await expect(command.run([], { templates: ["nope"] })).rejects.toThrow(
        'Unknown template "nope". Available: widget, gadget',
      );
    });

    it("covers every template when told all, without asking", async () => {
      vi.mocked(configurationService.isAtTerminal).mockReturnValue(true);

      await command.run([], { templates: ["all"] });

      expect(configurationService.promptForTemplates).not.toHaveBeenCalled();
      expect(validationService.validate).toHaveBeenCalledWith(
        expect.objectContaining({ instances: [INSTANCE, GADGET_INSTANCE] }),
      );
    });

    // The regression that matters most: every invocation that exists today
    // omits this flag, and a prompt nobody can answer would hang the job.
    it("covers every template when nobody can be asked", async () => {
      await command.run([], {});

      expect(configurationService.promptForTemplates).not.toHaveBeenCalled();
      expect(validationService.validate).toHaveBeenCalledWith(
        expect.objectContaining({ instances: [INSTANCE, GADGET_INSTANCE] }),
      );
    });

    it("offers the configured templates when none was named", async () => {
      vi.mocked(configurationService.isAtTerminal).mockReturnValue(true);
      vi.mocked(configurationService.promptForTemplates).mockResolvedValue([
        "gadget",
      ]);

      await command.run([], {});

      // The loaded configuration itself, not a mapping of it: the picker can
      // then never disagree with what this command would actually run.
      expect(configurationService.promptForTemplates).toHaveBeenCalledWith(
        TWO_TEMPLATES,
      );
      expect(validationService.validate).toHaveBeenCalledWith(
        expect.objectContaining({ instances: [GADGET_INSTANCE] }),
      );
    });

    it("covers every template when the picker is cancelled", async () => {
      vi.mocked(configurationService.isAtTerminal).mockReturnValue(true);
      vi.mocked(configurationService.promptForTemplates).mockResolvedValue(
        undefined,
      );

      await command.run([], {});

      expect(validationService.validate).toHaveBeenCalledWith(
        expect.objectContaining({ instances: [INSTANCE, GADGET_INSTANCE] }),
      );
    });

    it("covers every template when all is picked alongside a name", async () => {
      vi.mocked(configurationService.isAtTerminal).mockReturnValue(true);
      vi.mocked(configurationService.promptForTemplates).mockResolvedValue([
        "all",
        "gadget",
      ]);

      await command.run([], {});

      expect(validationService.validate).toHaveBeenCalledWith(
        expect.objectContaining({ instances: [INSTANCE, GADGET_INSTANCE] }),
      );
    });

    // Today's `--instances` behavior, which existing scripts rely on: the
    // globbed paths are measured against every template, not narrowed.
    it("leaves an instance glob alone when no template is named", async () => {
      vi.mocked(configurationService.findInstances).mockReturnValue([INSTANCE]);

      await command.run([], { instances: ["tools/*"] });

      expect(configurationService.findInstances).toHaveBeenCalledWith(
        expect.objectContaining({ patterns: ["tools/*"] }),
      );
      expect(configurationService.collectTemplates).toHaveBeenCalledWith(
        expect.objectContaining({ configuration: TWO_TEMPLATES }),
      );
    });
  });

  describe("option parsing", () => {
    it("parses each option through the input service", () => {
      expect(command.parseConfig("path")).toBeDefined();
      expect(command.parseInstances("a,b")).toBeDefined();
      expect(command.parseLanguages("typescript")).toBeDefined();
      expect(command.parseTemplates("widget,gadget")).toBeDefined();
      expect(command.parseThreshold("0.9")).toBeDefined();
    });
  });
});
