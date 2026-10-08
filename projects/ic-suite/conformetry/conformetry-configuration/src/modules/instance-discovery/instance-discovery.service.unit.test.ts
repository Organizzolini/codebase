import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { InstanceGroupService } from "../instance-group/instance-group.service";

import { InstanceDiscoveryModule } from "./instance-discovery.module";
import { InstanceDiscoveryService } from "./instance-discovery.service";

import type { ConformetryConfiguration } from "../configuration/configuration.types";

/** The glob every generator below declares its instances with. */
const INSTANCE_PATTERN = "packages/*/src/modules/*";

/**
 * Builds a workspace holding three templates and one instance.
 *
 * The instance has both of `widget`'s files and one of `gadget`'s three, so
 * the same path is explained completely by one template and partially by the
 * other — which is the case the inventory exists to report. `sprocket` shares
 * no file with it at all, so a template nothing was generated from is covered
 * too.
 */
async function createWorkspace(): Promise<string> {
  const workingDirectory = await mkdtemp(
    path.join(tmpdir(), "conformetry-inventory-"),
  );
  const templatesPath = path.join(workingDirectory, "configuration/templates");

  // The tree sits under `{{nameKebabCase}}/`, which is how a template says
  // its instance is a directory rather than a set of loose files.
  for (const suffix of [".module.ts", ".service.ts"]) {
    await writeEmptyFile(
      path.join(
        templatesPath,
        "widget/{{nameKebabCase}}",
        `{{nameKebabCase}}${suffix}`,
      ),
    );
  }
  for (const suffix of [".entities.ts", ".resolver.ts", ".service.ts"]) {
    await writeEmptyFile(
      path.join(
        templatesPath,
        "gadget/{{nameKebabCase}}",
        `{{nameKebabCase}}${suffix}`,
      ),
    );
  }
  await writeEmptyFile(
    path.join(templatesPath, "sprocket/{{nameKebabCase}}", "Dockerfile"),
  );

  for (const suffix of [".module.ts", ".service.ts"]) {
    await writeEmptyFile(
      path.join(
        workingDirectory,
        "packages/widgets/src/modules/gears",
        `gears${suffix}`,
      ),
    );
  }

  return workingDirectory;
}

/** Writes one empty file, creating the directories above it. */
async function writeEmptyFile(filePath: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, "", "utf8");
}

/** Both templates, each declaring the one instance glob. */
const CONFIGURATION: ConformetryConfiguration = [
  {
    description: "Generate a widget",
    inputs: {},
    instances: [{ patterns: [INSTANCE_PATTERN] }],
    name: "widget",
    templatePath: "configuration/templates/widget",
  },
  {
    inputs: {},
    instances: [{ patterns: [INSTANCE_PATTERN] }],
    name: "gadget",
    templatePath: "configuration/templates/gadget",
  },
  {
    // A group declaring no globs of its own: the generator is reachable but
    // contributes nothing to the default search.
    inputs: {},
    instances: [{}],
    name: "sprocket",
    templatePath: "configuration/templates/sprocket",
  },
];

describe(InstanceDiscoveryService, () => {
  let service: InstanceDiscoveryService;
  let workingDirectory: string;

  /** The inventory arguments every test starts from. */
  function inventoryArguments(): {
    configuration: ConformetryConfiguration;
    workingDirectory: string;
  } {
    return { configuration: CONFIGURATION, workingDirectory };
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [InstanceDiscoveryModule],
      providers: [InstanceDiscoveryService, InstanceGroupService],
    }).compile();

    service = await module.resolve(InstanceDiscoveryService);
    workingDirectory = await createWorkspace();
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("findInstances", () => {
    it("expands a glob into the instances that exist", () => {
      const instances = service.findInstances({
        patterns: [INSTANCE_PATTERN],
        workingDirectory,
      });

      expect(instances.map((instance) => instance.nameStem)).toStrictEqual([
        "gears",
      ]);
    });
  });

  describe("buildSubstitutions", () => {
    it("derives every name variant from the instance's own name", () => {
      const [instance] = service.findInstances({
        patterns: [INSTANCE_PATTERN],
        workingDirectory,
      });

      expect(instance).toBeDefined();
      expect(
        service.buildSubstitutions({
          nameStem: "gears",
          path: instance?.path ?? "",
        }),
      ).toMatchObject({ nameKebabCase: "gears" });
    });
  });

  describe("matchTemplates", () => {
    it("ranks every template sharing a file with the instance, best first", () => {
      const { templates } = service.takeInventory(inventoryArguments());
      const [instance] = service.findInstances({
        patterns: [INSTANCE_PATTERN],
        workingDirectory,
      });

      expect(instance).toBeDefined();

      if (instance === undefined) {
        return;
      }

      expect(
        service
          .matchTemplates({
            instance,
            substitutions: service.buildSubstitutions(instance),
            templates,
          })
          .map((match) => match.template.name),
      ).toStrictEqual(["widget", "gadget"]);
    });
  });

  describe("matchInstances", () => {
    it("resolves the instance to the template that explains it best", () => {
      const { templates } = service.takeInventory(inventoryArguments());
      const instances = service.findInstances({
        patterns: [INSTANCE_PATTERN],
        workingDirectory,
      });

      const { matched, unmatched } = service.matchInstances({
        instances,
        templates,
      });

      expect(unmatched).toStrictEqual([]);
      expect(matched.map((entry) => entry.template.name)).toStrictEqual([
        "widget",
      ]);
    });
  });

  describe("resolveInstanceFiles", () => {
    it("lists every file the matched template requires", () => {
      const { templates } = service.takeInventory(inventoryArguments());
      const { matched } = service.matchInstances({
        instances: service.findInstances({
          patterns: [INSTANCE_PATTERN],
          workingDirectory,
        }),
        templates,
      });

      expect(
        service
          .resolveInstanceFiles(matched)
          .map((file) => path.basename(file.instanceFilePath)),
      ).toStrictEqual(["gears.module.ts", "gears.service.ts"]);
    });
  });

  describe("prepareDocuments", () => {
    it("pairs each template file with the instance file it governs", () => {
      const { templates } = service.takeInventory(inventoryArguments());
      const { matched } = service.matchInstances({
        instances: service.findInstances({
          patterns: [INSTANCE_PATTERN],
          workingDirectory,
        }),
        templates,
      });

      const [prepared] = service.prepareDocuments({
        fileExtensions: [".ts"],
        instances: matched,
      });

      expect(prepared?.documents).toHaveLength(2);
    });

    // A language claims the extensions it can compare; preparing anything else
    // would hand it a document it has no reader for.
    it("prepares nothing for an extension no language claims", () => {
      const { templates } = service.takeInventory(inventoryArguments());
      const { matched } = service.matchInstances({
        instances: service.findInstances({
          patterns: [INSTANCE_PATTERN],
          workingDirectory,
        }),
        templates,
      });

      const [prepared] = service.prepareDocuments({
        fileExtensions: [".md"],
        instances: matched,
      });

      expect(prepared?.documents).toStrictEqual([]);
    });
  });

  describe("readWorkspaceGroups", () => {
    it.each([
      ["an untagged group", { patterns: ["packages/*"] }, 1],
      ["a group tagged empty", { patterns: ["packages/*"], tags: [] }, 1],
      ["a tagged group", { patterns: ["src/*"], tags: ["nestjs"] }, 0],
      ["a group naming only tags", { tags: ["nestjs"] }, 0],
    ])("keeps %s as %i group(s)", (_description, group, expected) => {
      expect(service.readWorkspaceGroups([group])).toHaveLength(expected);
    });
  });

  describe("takeInventory", () => {
    it("reads every declared template", () => {
      expect(
        service
          .takeInventory(inventoryArguments())
          .templates.map((template) => template.name),
      ).toStrictEqual(["widget", "gadget", "sprocket"]);
    });

    it("falls back to the configured globs when the caller names none", () => {
      expect(service.takeInventory(inventoryArguments()).weighed).toHaveLength(
        1,
      );
    });

    it("weighs the instance against every template that shares a file", () => {
      const [weighed] = service.takeInventory(inventoryArguments()).weighed;

      expect(weighed?.pairings.map((pairing) => pairing.name)).toStrictEqual([
        "widget",
        "gadget",
      ]);
    });

    // A tagged group's globs are read inside each project the tags select, so
    // this host has no root to join them to. Expanding them from the working
    // directory would silently measure whatever happened to sit at the same
    // relative path against a template scoped to other projects.
    it("ignores a group whose globs are scoped by project tags", () => {
      expect(
        service.takeInventory({
          configuration: [
            {
              inputs: {},
              instances: [
                { patterns: ["packages/*/src/modules/*"], tags: ["nestjs"] },
              ],
              name: "widget",
              templatePath: "configuration/templates/widget",
            },
          ],
          workingDirectory,
        }).weighed,
      ).toStrictEqual([]);
    });

    // An explicit `--instances` glob is the caller speaking for themselves,
    // so it is honoured whatever the configuration's groups are scoped by.
    it("still honours the caller's own globs alongside a tagged group", () => {
      expect(
        service.takeInventory({
          configuration: [
            {
              inputs: {},
              instances: [{ patterns: ["src/modules/*"], tags: ["nestjs"] }],
              name: "widget",
              templatePath: "configuration/templates/widget",
            },
          ],
          instancePatterns: [INSTANCE_PATTERN],
          workingDirectory,
        }).weighed,
      ).toHaveLength(1);
    });

    it("finds nothing when the caller's globs match nothing", () => {
      expect(
        service.takeInventory({
          ...inventoryArguments(),
          instancePatterns: ["applications/*"],
        }).weighed,
      ).toStrictEqual([]);
    });
  });

  describe("resolveInventoriedTemplates", () => {
    it("pairs every declared template with the instances it explains", () => {
      const templates =
        service.resolveInventoriedTemplates(inventoryArguments());

      expect(templates.map((template) => template.name)).toStrictEqual([
        "widget",
        "gadget",
        "sprocket",
      ]);
      expect(templates[0]?.instances).toHaveLength(1);
    });

    it("carries each template's description through", () => {
      const [widget] =
        service.resolveInventoriedTemplates(inventoryArguments());

      expect(widget?.description).toBe("Generate a widget");
    });

    it("reports an empty description for a template declaring none", () => {
      const [, gadget] =
        service.resolveInventoriedTemplates(inventoryArguments());

      expect(gadget?.description).toBe("");
    });

    it("reports how much of each template the instance already has", () => {
      const templates =
        service.resolveInventoriedTemplates(inventoryArguments());

      expect(templates[0]?.instances[0]).toMatchObject({
        matchedFileCount: 2,
        matchRatio: 1,
        templateFileCount: 2,
      });
      expect(templates[1]?.instances[0]).toMatchObject({
        matchedFileCount: 1,
        templateFileCount: 3,
      });
    });

    it("names each instance by its absolute path", () => {
      const [widget] =
        service.resolveInventoriedTemplates(inventoryArguments());

      expect(widget?.instances[0]?.name).toBe(
        path.join(workingDirectory, "packages/widgets/src/modules/gears"),
      );
    });

    // Narrowing by path is what turns the listing into "which templates
    // explain this", so a template explaining nothing there is not an answer.
    it("drops a template explaining none of the named paths", () => {
      expect(
        service.resolveInventoriedTemplates({
          ...inventoryArguments(),
          instancePatterns: ["applications/*"],
        }),
      ).toStrictEqual([]);
    });

    // Without a path filter the listing is a registry of what exists, so a
    // template nothing was generated from still belongs in it.
    it("keeps a template explaining nothing when no path was named", () => {
      const templates =
        service.resolveInventoriedTemplates(inventoryArguments());

      expect(templates).toHaveLength(3);
      expect(templates[2]?.instances).toStrictEqual([]);
    });

    it("reports only the templates the caller named", () => {
      expect(
        service
          .resolveInventoriedTemplates({
            ...inventoryArguments(),
            templateNames: ["gadget"],
          })
          .map((template) => template.name),
      ).toStrictEqual(["gadget"]);
    });
  });

  describe("resolveInventoriedInstances", () => {
    it("pairs every instance found with the templates that explain it", () => {
      const instances =
        service.resolveInventoriedInstances(inventoryArguments());

      expect(instances).toHaveLength(1);
      expect(
        instances[0]?.templates.map((template) => template.name),
      ).toStrictEqual(["widget", "gadget"]);
    });

    it("names each instance by its absolute path", () => {
      expect(
        service.resolveInventoriedInstances(inventoryArguments())[0]?.path,
      ).toBe(path.join(workingDirectory, "packages/widgets/src/modules/gears"));
    });

    it("reports only the templates the caller named", () => {
      expect(
        service
          .resolveInventoriedInstances({
            ...inventoryArguments(),
            templateNames: ["gadget"],
          })[0]
          ?.templates.map((template) => template.name),
      ).toStrictEqual(["gadget"]);
    });

    // The filter narrows the pairing, not the search, so an instance left with
    // no explanation is no longer an answer to the question asked.
    it("drops an instance no named template explains", () => {
      expect(
        service.resolveInventoriedInstances({
          ...inventoryArguments(),
          templateNames: ["nowhere"],
        }),
      ).toStrictEqual([]);
    });
  });
});
