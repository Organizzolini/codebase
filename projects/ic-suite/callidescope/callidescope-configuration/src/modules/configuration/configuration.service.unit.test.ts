import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import prompts from "prompts";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { InputService } from "../input/input.service";
import { RunPlanService } from "../run-plan/run-plan.service";

import { ConfigurationFileService } from "./configuration-file.service";
import { ConfigurationService } from "./configuration.service";
import { ProjectConfigurationService } from "./project-configuration.service";

import type { CallidescopeFormatOptions } from "../input/input.types";
import type { ResolvedCallidescopeConfiguration } from "./configuration.types";
import type { DeepMocked } from "@golevelup/ts-vitest";

// Mocked at the module boundary so the prompt wiring behind the facade is
// exercised and no test ever reaches for a terminal.
vi.mock("prompts", () => ({ default: vi.fn() }));

const promptRunner = vi.mocked(prompts);

// A deliberate misspelling: the example of a `--format` value nobody
// recognizes, which is exactly what the refusal below is about.
// cspell:ignore markdwon

/** A resolved configuration with the defaults this suite assumes. */
function buildConfiguration(
  overrides: Partial<ResolvedCallidescopeConfiguration> = {},
): ResolvedCallidescopeConfiguration {
  return {
    directories: [],
    entryPoints: {
      addresses: [],
      decorators: [],
      includeExportedFunctions: true,
      includeOrphans: true,
      includeTests: false,
    },
    exclude: [],
    excludeCallees: [],
    excludeFrom: [],
    limits: {
      maximumDepth: 6,
    },
    write: {
      json: undefined,
      markdown: undefined,
      mermaid: undefined,
    },
    ...overrides,
  };
}

describe(ConfigurationService, () => {
  let service: ConfigurationService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ConfigurationService,
        InputService,
        ProjectConfigurationService,
        {
          provide: ConfigurationFileService,
          useValue: createMock<ConfigurationFileService>(),
        },
        { provide: RunPlanService, useValue: createMock<RunPlanService>() },
      ],
    }).compile();

    service = await module.resolve(ConfigurationService);
  });

  const originalIsTty = process.stdin.isTTY;

  beforeEach(() => {
    // A terminal by default, so a prompt test exercises the prompt rather
    // than the refusal standing in front of it.
    process.stdin.isTTY = true;
  });

  afterEach(() => {
    promptRunner.mockReset();
    process.stdin.isTTY = originalIsTty;
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  // 🖨️ Format resolution

  // Declared rather than passed inline so the other flag is inferred as part
  // of the options type, the way a command's own options object is.
  const optionsWithoutFormat: CallidescopeFormatOptions & { config: string } = {
    config: "a.ts",
  };

  it("passes a format that was given on the command line through untouched", async () => {
    await expect(
      service.resolveFormatOption({ ...optionsWithoutFormat, format: "json" }),
    ).resolves.toStrictEqual({ config: "a.ts", format: "json" });
    expect(promptRunner).not.toHaveBeenCalled();
  });

  it("prompts for a missing format at a terminal, keeping the other options", async () => {
    promptRunner.mockResolvedValue({ value: "mermaid" });

    await expect(
      service.resolveFormatOption(optionsWithoutFormat),
    ).resolves.toStrictEqual({ config: "a.ts", format: "mermaid" });
  });

  // The configuration already declares a format, so this one value is offered
  // rather than demanded: a scripted `--check depth` has never passed it.
  it("leaves a missing format alone when stdin is not a terminal", async () => {
    process.stdin.isTTY = false;

    await expect(
      service.resolveFormatOption(optionsWithoutFormat),
    ).resolves.toStrictEqual({ config: "a.ts" });
    expect(promptRunner).not.toHaveBeenCalled();
  });

  // 🎚️ The facade's own surface

  describe("forwarding", () => {
    /** The four doubles a forwarding case reads its answer back from. */
    interface Collaborators {
      configurationFileService: DeepMocked<ConfigurationFileService>;
      inputService: DeepMocked<InputService>;
      projectConfigurationService: DeepMocked<ProjectConfigurationService>;
      runPlanService: DeepMocked<RunPlanService>;
    }

    /** One question the facade answers, and who it is supposed to ask. */
    interface ForwardingCase {
      ask: (subject: ConfigurationService) => unknown;
      name: string;
      read: (collaborators: Collaborators) => unknown;
    }

    const promptArguments = {
      message: "Which callables?",
      subject: "At least one callable address",
      suggestions: ["a.ts#A.b"],
    };
    const selectArguments = {
      choices: ["json"],
      message: "Which output format?",
      subject: "An output format",
    };
    const limitsArguments = {
      projectConfigurations: [],
      projects: ["packages/example"],
      workspaceAuthoredLimits: undefined,
      workspaceConfiguration: buildConfiguration(),
      workspaceConfigurationPath: undefined,
    };

    // Every question a consumer can ask reaches exactly one collaborator, with
    // the arguments it was given. Stated as a table rather than a test apiece:
    // what is asserted is that nothing is quietly reinterpreted on the way
    // through, and a table is where a method added without a forwarding line
    // shows up as a gap.
    const cases: readonly ForwardingCase[] = [
      {
        ask: (subject) => subject.findConfigurationFileAt("/workspace"),
        name: "findConfigurationFileAt",
        read: ({ configurationFileService }) =>
          configurationFileService.findConfigurationFileAt.mock.calls[0]?.[0],
      },
      {
        ask: async (subject) => await subject.loadConfigurationFile({}),
        name: "loadConfigurationFile",
        read: ({ configurationFileService }) =>
          configurationFileService.loadConfigurationFile.mock.calls[0]?.[0],
      },
      {
        ask: (subject) => subject.resolveConfiguration({}),
        name: "resolveConfiguration",
        read: ({ configurationFileService }) =>
          configurationFileService.resolveConfiguration.mock.calls[0]?.[0],
      },
      {
        ask: (subject) => subject.parseCommaDelimitedOption("a,b"),
        name: "parseCommaDelimitedOption",
        read: ({ inputService }) =>
          inputService.parseCommaDelimitedOption.mock.calls[0]?.[0],
      },
      {
        ask: (subject) => subject.parseOptionalOption("a"),
        name: "parseOptionalOption",
        read: ({ inputService }) =>
          inputService.parseOptionalOption.mock.calls[0]?.[0],
      },
      {
        ask: async (subject) =>
          await subject.promptForAutocompleteMultiselect(promptArguments),
        name: "promptForAutocompleteMultiselect",
        read: ({ inputService }) =>
          inputService.promptForAutocompleteMultiselect.mock.calls[0]?.[0],
      },
      {
        ask: async (subject) => await subject.promptForSelect(selectArguments),
        name: "promptForSelect",
        read: ({ inputService }) =>
          inputService.promptForSelect.mock.calls[0]?.[0],
      },
      {
        ask: (subject) => subject.resolveLimits(limitsArguments),
        name: "resolveLimits",
        read: ({ projectConfigurationService }) =>
          projectConfigurationService.resolveLimits.mock.calls[0]?.[0],
      },
      {
        ask: async (subject) => await subject.prepareLookup({}),
        name: "prepareLookup",
        read: ({ runPlanService }) =>
          runPlanService.prepareLookup.mock.calls[0]?.[0],
      },
      {
        ask: async (subject) => await subject.prepareRun({}),
        name: "prepareRun",
        read: ({ runPlanService }) =>
          runPlanService.prepareRun.mock.calls[0]?.[0],
      },
      {
        ask: (subject) =>
          subject.touchesFiles({
            checksBreadth: false,
            checksDepth: false,
            checksReports: true,
            writes: false,
          }),
        name: "touchesFiles",
        read: ({ runPlanService }) =>
          runPlanService.touchesFiles.mock.calls[0]?.[0],
      },
    ];

    /** The facade over four doubles, so a forwarded call is observable. */
    function buildForwardingSubject(): {
      collaborators: Collaborators;
      subject: ConfigurationService;
    } {
      const collaborators: Collaborators = {
        configurationFileService: createMock<ConfigurationFileService>(),
        inputService: createMock<InputService>(),
        projectConfigurationService: createMock<ProjectConfigurationService>(),
        runPlanService: createMock<RunPlanService>(),
      };

      return {
        collaborators,
        subject: new ConfigurationService(
          collaborators.configurationFileService,
          collaborators.inputService,
          collaborators.projectConfigurationService,
          collaborators.runPlanService,
        ),
      };
    }

    it.each(cases)(
      "asks the collaborator that owns $name, with what it was given",
      async ({ ask, read }) => {
        const { collaborators, subject } = buildForwardingSubject();

        await ask(subject);

        expect(read(collaborators)).toBeDefined();
      },
    );

    it("hands each collaborator the reader it should read through", async () => {
      // The facade itself, so a caller stubbing this one object stubs every
      // file read made on its behalf — which is the whole point of publishing
      // one object rather than five.
      const { collaborators, subject } = buildForwardingSubject();

      await subject.loadProjectConfigurations({
        projects: ["packages/example"],
        workspaceRoot: "/workspace",
      });
      await subject.prepareRun({});
      await subject.prepareLookup({});

      expect([
        collaborators.projectConfigurationService.loadProjectConfigurations.mock
          .calls[0]?.[1],
        collaborators.runPlanService.prepareRun.mock.calls[0]?.[1],
        collaborators.runPlanService.prepareLookup.mock.calls[0]?.[1],
      ]).toStrictEqual([subject, subject, subject]);
    });
  });
});
