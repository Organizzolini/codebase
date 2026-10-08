import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { InputPromptingService } from "../input/input-prompting.service";
import { InputService } from "../input/input.service";
import { InstanceDiscoveryService } from "../instance-discovery/instance-discovery.service";
import { InstanceGroupService } from "../instance-group/instance-group.service";
import { RenderingService } from "../rendering/rendering.service";
import { TemplateDiscoveryService } from "../template-discovery/template-discovery.service";

import { UnknownConfigurationFileTypeError } from "./configuration.constants";
import { ConfigurationService } from "./configuration.service";

import type { ConformetryConfiguration } from "./configuration.types";

function mockValue<T>(_unused?: T): T {
  // type-coverage:ignore-next-line
  return {} as unknown as T;
}

/** Writes a JSON config holding whatever the caller passes. */
async function writeConfiguration(configuration: unknown): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), "conformetry-config-"));
  const configurationPath = path.join(directory, "conformetry.config.json");

  await writeFile(configurationPath, JSON.stringify(configuration), "utf8");

  return configurationPath;
}
/** Writes a TypeScript config whose default export is the given source. */
async function writeTypescriptConfiguration(source: string): Promise<string> {
  const directory = await mkdtemp(
    path.join(tmpdir(), "conformetry-config-ts-"),
  );
  const configurationPath = path.join(directory, "conformetry.config.ts");

  await writeFile(configurationPath, source, "utf8");

  return configurationPath;
}

describe(ConfigurationService, () => {
  let service: ConfigurationService;
  let inputPromptingService: InputPromptingService;
  let inputService: InputService;
  let instanceDiscoveryService: InstanceDiscoveryService;
  let instanceGroupService: InstanceGroupService;
  let renderingService: RenderingService;
  let templateDiscoveryService: TemplateDiscoveryService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ConfigurationService,
        {
          provide: InputPromptingService,
          useValue: createMock<InputPromptingService>(),
        },
        { provide: InputService, useValue: createMock<InputService>() },
        {
          provide: InstanceDiscoveryService,
          useValue: createMock<InstanceDiscoveryService>(),
        },
        {
          provide: InstanceGroupService,
          useValue: createMock<InstanceGroupService>(),
        },
        { provide: RenderingService, useValue: createMock<RenderingService>() },
        {
          provide: TemplateDiscoveryService,
          useValue: createMock<TemplateDiscoveryService>(),
        },
      ],
    }).compile();

    service = await module.resolve(ConfigurationService);
    inputPromptingService = await module.resolve(InputPromptingService);
    inputService = await module.resolve(InputService);
    instanceDiscoveryService = await module.resolve(InstanceDiscoveryService);
    instanceGroupService = await module.resolve(InstanceGroupService);
    renderingService = await module.resolve(RenderingService);
    templateDiscoveryService = await module.resolve(TemplateDiscoveryService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("facade delegation", () => {
    it("delegates buildNameSubstitutions", () => {
      const result =
        mockValue<ReturnType<typeof renderingService.buildNameSubstitutions>>();
      vi.mocked(renderingService.buildNameSubstitutions).mockReturnValue(
        result,
      );

      expect(service.buildNameSubstitutions("test")).toBe(result);
      expect(renderingService.buildNameSubstitutions).toHaveBeenCalledWith(
        "test",
      );
    });

    it("delegates collectTemplate", () => {
      const result =
        mockValue<
          ReturnType<typeof templateDiscoveryService.collectTemplate>
        >();
      vi.mocked(templateDiscoveryService.collectTemplate).mockReturnValue(
        result,
      );

      expect(
        service.collectTemplate(
          mockValue<Parameters<typeof service.collectTemplate>[0]>(),
        ),
      ).toBe(result);
      expect(templateDiscoveryService.collectTemplate).toHaveBeenCalledWith({});
    });

    it("delegates collectTemplates", () => {
      const result =
        mockValue<
          ReturnType<typeof templateDiscoveryService.collectTemplates>
        >();
      vi.mocked(templateDiscoveryService.collectTemplates).mockReturnValue(
        result,
      );

      expect(
        service.collectTemplates(
          mockValue<Parameters<typeof service.collectTemplates>[0]>(),
        ),
      ).toBe(result);
      expect(templateDiscoveryService.collectTemplates).toHaveBeenCalledWith(
        {},
      );
    });

    it("delegates findInstances", () => {
      const result =
        mockValue<ReturnType<typeof instanceDiscoveryService.findInstances>>();
      vi.mocked(instanceDiscoveryService.findInstances).mockReturnValue(result);

      expect(
        service.findInstances(
          mockValue<Parameters<typeof service.findInstances>[0]>(),
        ),
      ).toBe(result);
      expect(instanceDiscoveryService.findInstances).toHaveBeenCalledWith({});
    });

    it("delegates isAtTerminal", () => {
      const result = true;
      vi.mocked(inputPromptingService.isAtTerminal).mockReturnValue(result);

      expect(service.isAtTerminal()).toBe(result);
      expect(inputPromptingService.isAtTerminal).toHaveBeenCalledWith();
    });

    it("delegates isProjectScoped", () => {
      const result = true;
      vi.mocked(instanceGroupService.isProjectScoped).mockReturnValue(result);

      expect(service.isProjectScoped({})).toBe(result);
      expect(instanceGroupService.isProjectScoped).toHaveBeenCalledWith({});
    });

    it("delegates matchInstances", () => {
      const result =
        mockValue<ReturnType<typeof instanceDiscoveryService.matchInstances>>();
      vi.mocked(instanceDiscoveryService.matchInstances).mockReturnValue(
        result,
      );

      expect(
        service.matchInstances(
          mockValue<Parameters<typeof service.matchInstances>[0]>(),
        ),
      ).toBe(result);
      expect(instanceDiscoveryService.matchInstances).toHaveBeenCalledWith({});
    });

    it("delegates parseCommaDelimitedOption", () => {
      const result =
        mockValue<ReturnType<typeof inputService.parseCommaDelimitedOption>>();
      vi.mocked(inputService.parseCommaDelimitedOption).mockReturnValue(result);

      expect(service.parseCommaDelimitedOption("test")).toBe(result);
      expect(inputService.parseCommaDelimitedOption).toHaveBeenCalledWith(
        "test",
      );
    });

    it("delegates parseOptionalOption", () => {
      const result = "test";
      vi.mocked(inputService.parseOptionalOption).mockReturnValue(result);

      expect(service.parseOptionalOption("test")).toBe(result);
      expect(inputService.parseOptionalOption).toHaveBeenCalledWith("test");
    });

    it("delegates parseThresholdOption", () => {
      const result = 1;
      vi.mocked(inputService.parseThresholdOption).mockReturnValue(result);

      expect(service.parseThresholdOption("test")).toBe(result);
      expect(inputService.parseThresholdOption).toHaveBeenCalledWith("test");
    });

    it("delegates prepareDocuments", () => {
      const result =
        mockValue<
          ReturnType<typeof instanceDiscoveryService.prepareDocuments>
        >();
      vi.mocked(instanceDiscoveryService.prepareDocuments).mockReturnValue(
        result,
      );

      expect(
        service.prepareDocuments(
          mockValue<Parameters<typeof service.prepareDocuments>[0]>(),
        ),
      ).toBe(result);
      expect(instanceDiscoveryService.prepareDocuments).toHaveBeenCalledWith(
        {},
      );
    });

    it("delegates promptForTemplate", async () => {
      const result = "test";
      vi.mocked(inputPromptingService.promptForTemplate).mockResolvedValue(
        result,
      );

      await expect(
        service.promptForTemplate(
          mockValue<Parameters<typeof service.promptForTemplate>[0]>(),
        ),
      ).resolves.toBe(result);
      expect(inputPromptingService.promptForTemplate).toHaveBeenCalledWith({});
    });

    it("delegates promptForTemplates", async () => {
      const result = ["test"];
      vi.mocked(inputPromptingService.promptForTemplates).mockResolvedValue(
        result,
      );

      await expect(
        service.promptForTemplates(
          mockValue<Parameters<typeof service.promptForTemplates>[0]>(),
        ),
      ).resolves.toBe(result);
      expect(inputPromptingService.promptForTemplates).toHaveBeenCalledWith({});
    });

    it("delegates readWorkspaceGroups", () => {
      const result =
        mockValue<
          ReturnType<typeof instanceDiscoveryService.readWorkspaceGroups>
        >();
      vi.mocked(instanceDiscoveryService.readWorkspaceGroups).mockReturnValue(
        result,
      );

      expect(service.readWorkspaceGroups([])).toBe(result);
      expect(instanceDiscoveryService.readWorkspaceGroups).toHaveBeenCalledWith(
        [],
      );
    });

    it("delegates renderContent", () => {
      const result = "test";
      vi.mocked(renderingService.renderContent).mockReturnValue(result);

      expect(
        service.renderContent(
          mockValue<Parameters<typeof service.renderContent>[0]>(),
        ),
      ).toBe(result);
      expect(renderingService.renderContent).toHaveBeenCalledWith({});
    });

    it("delegates renderPath", () => {
      const result = "test";
      vi.mocked(renderingService.renderPath).mockReturnValue(result);

      expect(
        service.renderPath(
          mockValue<Parameters<typeof service.renderPath>[0]>(),
        ),
      ).toBe(result);
      expect(renderingService.renderPath).toHaveBeenCalledWith({});
    });

    it("delegates resolveGeneratorInputs", async () => {
      const result =
        mockValue<ReturnType<typeof inputService.resolveGeneratorInputs>>();
      vi.mocked(inputService.resolveGeneratorInputs).mockReturnValue(result);

      await expect(
        service.resolveGeneratorInputs(
          mockValue<Parameters<typeof service.resolveGeneratorInputs>[0]>(),
        ),
      ).resolves.toBe(result);
      expect(inputService.resolveGeneratorInputs).toHaveBeenCalledWith({});
    });

    it("delegates resolveInstanceFiles", () => {
      const result =
        mockValue<
          ReturnType<typeof instanceDiscoveryService.resolveInstanceFiles>
        >();
      vi.mocked(instanceDiscoveryService.resolveInstanceFiles).mockReturnValue(
        result,
      );

      expect(service.resolveInstanceFiles([])).toBe(result);
      expect(
        instanceDiscoveryService.resolveInstanceFiles,
      ).toHaveBeenCalledWith([]);
    });

    it("delegates resolveInventoriedInstances", () => {
      const result =
        mockValue<
          ReturnType<
            typeof instanceDiscoveryService.resolveInventoriedInstances
          >
        >();
      vi.mocked(
        instanceDiscoveryService.resolveInventoriedInstances,
      ).mockReturnValue(result);

      expect(
        service.resolveInventoriedInstances(
          mockValue<
            Parameters<typeof service.resolveInventoriedInstances>[0]
          >(),
        ),
      ).toBe(result);
      expect(
        instanceDiscoveryService.resolveInventoriedInstances,
      ).toHaveBeenCalledWith({});
    });

    it("delegates resolveInventoriedTemplates", () => {
      const result =
        mockValue<
          ReturnType<
            typeof instanceDiscoveryService.resolveInventoriedTemplates
          >
        >();
      vi.mocked(
        instanceDiscoveryService.resolveInventoriedTemplates,
      ).mockReturnValue(result);

      expect(
        service.resolveInventoriedTemplates(
          mockValue<
            Parameters<typeof service.resolveInventoriedTemplates>[0]
          >(),
        ),
      ).toBe(result);
      expect(
        instanceDiscoveryService.resolveInventoriedTemplates,
      ).toHaveBeenCalledWith({});
    });
  });

  it("loads the workspace configuration", async () => {
    const configuration = await service.loadConformetryConfiguration(
      "configuration/conformetry.config.ts",
    );

    expect(configuration.map((generator) => generator.name)).toContain(
      "react-component",
    );
  });

  it("throws a typed error for an unsupported extension", async () => {
    await expect(
      service.loadConformetryConfiguration("configuration/nope.yaml"),
    ).rejects.toBeInstanceOf(UnknownConfigurationFileTypeError);
  });

  it("keeps the configured template path", async () => {
    const configurationPath = await writeConfiguration([
      { name: "example", templatePath: "custom/templates/example" },
    ]);

    const configuration =
      await service.loadConformetryConfiguration(configurationPath);

    expect(configuration[0]?.templatePath).toBe("custom/templates/example");
  });

  it("keeps a generator's declared threshold", async () => {
    const configurationPath = await writeConfiguration([
      { name: "example", templatePath: "templates/example", threshold: 0.9 },
    ]);

    const configuration =
      await service.loadConformetryConfiguration(configurationPath);

    expect(configuration[0]?.threshold).toBe(0.9);
  });

  it("keeps an instance group's declared threshold", async () => {
    const configurationPath = await writeConfiguration([
      {
        instances: [{ patterns: ["src/modules/*"], threshold: 0.75 }],
        name: "example",
        templatePath: "templates/example",
      },
    ]);

    const configuration =
      await service.loadConformetryConfiguration(configurationPath);

    expect(configuration[0]?.instances[0]?.threshold).toBe(0.75);
  });

  it("leaves an undeclared threshold unset rather than defaulting it", async () => {
    const configurationPath = await writeConfiguration([
      { name: "example", templatePath: "templates/example" },
    ]);

    const configuration =
      await service.loadConformetryConfiguration(configurationPath);

    // Stamping every generator with 1 here would make the generator level
    // always beat a run-level `--threshold`, leaving that flag inert.
    expect(configuration[0]?.threshold).toBeUndefined();
  });

  it("rejects a threshold outside the 0-to-1 range", async () => {
    const configurationPath = await writeConfiguration([
      { name: "example", templatePath: "templates/example", threshold: 90 },
    ]);

    await expect(
      service.loadConformetryConfiguration(configurationPath),
    ).rejects.toThrow(/threshold/i);
  });

  it("defaults inputs and instances to empty", async () => {
    const configurationPath = await writeConfiguration([
      { name: "example", templatePath: "templates/example" },
    ]);

    const configuration =
      await service.loadConformetryConfiguration(configurationPath);

    expect(configuration[0]?.inputs).toStrictEqual({});
    expect(configuration[0]?.instances).toStrictEqual([]);
  });

  it("keeps instance globs, substitutions, and tags", async () => {
    const configurationPath = await writeConfiguration([
      {
        instances: [
          {
            patterns: ["packages/*/src/modules/*"],
            substitutions: { type: "packages" },
            tags: ["type:package"],
          },
        ],
        name: "example",
        templatePath: "templates/example",
      },
    ]);

    const configuration =
      await service.loadConformetryConfiguration(configurationPath);

    expect(configuration[0]?.instances[0]).toStrictEqual({
      patterns: ["packages/*/src/modules/*"],
      substitutions: { type: "packages" },
      tags: ["type:package"],
    });
  });

  it("gives up on the workspace search outside any workspace", async () => {
    const originalCwd = process.cwd();
    const outside = await mkdtemp(path.join(tmpdir(), "conformetry-outside-"));

    process.chdir(outside);

    try {
      // Walks to the filesystem root without finding a workspace manifest.
      await expect(
        service.loadConformetryConfiguration("nowhere/conformetry.config.json"),
      ).rejects.toThrow("ENOENT");
    } finally {
      process.chdir(originalCwd);
    }
  });

  it("reads no generators from a module that exports nothing usable", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "conformetry-config-"));
    const configurationPath = path.join(directory, "conformetry.config.mjs");

    await writeFile(configurationPath, "export default 42;\n", "utf8");

    await expect(
      service.loadConformetryConfiguration(configurationPath),
    ).resolves.toStrictEqual([]);
  });

  it("reads a module whose default export holds the generators", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "conformetry-config-"));
    const configurationPath = path.join(directory, "conformetry.config.mjs");

    await writeFile(
      configurationPath,
      'export default [{ name: "example", templatePath: "templates/example" }];\n',
      "utf8",
    );

    const configuration =
      await service.loadConformetryConfiguration(configurationPath);

    expect(configuration[0]?.name).toBe("example");
  });

  it("unwraps a default export that is itself nested one level deeper", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "conformetry-config-"));
    const configurationPath = path.join(directory, "conformetry.config.mjs");

    // Mirrors a CommonJS/ESM interop shape where the resolved default export
    // is itself an object carrying a further `default` field.
    await writeFile(
      configurationPath,
      'export default { default: [{ name: "example", templatePath: "templates/example" }] };\n',
      "utf8",
    );

    const configuration =
      await service.loadConformetryConfiguration(configurationPath);

    expect(configuration[0]?.name).toBe("example");
  });

  it("reads a JSONC configuration, comments and all", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "conformetry-config-"));
    const configurationPath = path.join(directory, "conformetry.config.jsonc");

    await writeFile(
      configurationPath,
      '// the workspace generators\n[{ "name": "example", "templatePath": "t" }]\n',
      "utf8",
    );

    const configuration =
      await service.loadConformetryConfiguration(configurationPath);

    expect(configuration[0]?.templatePath).toBe("t");
  });

  it("rejects a generator missing its name rather than validating nothing", async () => {
    const configurationPath = await writeConfiguration([
      { templatePath: "templates/example" },
    ]);

    await expect(
      service.loadConformetryConfiguration(configurationPath),
    ).rejects.toThrow("name");
  });

  it("rejects a generator missing its template path", async () => {
    const configurationPath = await writeConfiguration([{ name: "example" }]);

    await expect(
      service.loadConformetryConfiguration(configurationPath),
    ).rejects.toThrow("templatePath");
  });

  describe("typeScript configuration files", () => {
    it("reads a configuration exported from a module", async () => {
      const configurationPath = await writeTypescriptConfiguration(
        `export default [
          {
            inputs: {},
            instances: [{ patterns: ["packages/*"] }],
            name: "widget",
            templatePath: "configuration/templates/widget",
          },
        ];
`,
      );

      const configuration =
        await service.loadConformetryConfiguration(configurationPath);

      expect(configuration[0]?.name).toBe("widget");
    });
  });

  describe("refusals", () => {
    /** Writes a config and returns the promise of loading it. */
    async function load(
      definitions: unknown[],
    ): Promise<ConformetryConfiguration> {
      const configurationPath = path.join(
        await mkdtemp(path.join(tmpdir(), "conformetry-collision-")),
        "conformetry.config.json",
      );

      await writeFile(configurationPath, JSON.stringify(definitions), "utf8");

      return service.loadConformetryConfiguration(configurationPath);
    }

    it.each([
      [
        "two generators of the same name",
        [
          { name: "widget", templatePath: "t/1" },
          { name: "widget", templatePath: "t/2" },
        ],
        "name of more than one generator",
      ],
      [
        "a template shared by two generators",
        [
          { name: "widget", templatePath: "t/1" },
          { name: "gadget", templatePath: "t/1" },
        ],
        "template of more than one generator",
      ],
      [
        "a name that would escape the emitted plugin",
        [{ name: "../escape", templatePath: "t/1" }],
        "cannot contain a path separator",
      ],
      [
        "a generator named after the all-templates sentinel",
        [{ name: "all", templatePath: "t/1" }],
        "reserved: `validate --templates all`",
      ],
    ])("refuses %s", async (_description, definitions, message) => {
      // A host resolves the first match, so a collision shadows silently
      // rather than erroring where it is used.
      await expect(load(definitions)).rejects.toThrow(message);
    });

    it("refuses a generator declaring a field the schema does not know", async () => {
      // Generator aliases were removed outright. The schema is strict so a
      // workspace still declaring one is told, rather than having the key
      // stripped and believing it still resolves.
      await expect(
        load([{ aliases: ["w"], name: "widget", templatePath: "t/1" }]),
      ).rejects.toThrow("aliases");
    });
  });
});
