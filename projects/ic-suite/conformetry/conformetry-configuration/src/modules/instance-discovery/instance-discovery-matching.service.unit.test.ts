import { readdirSync } from "node:fs";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { RenderingService } from "../rendering/rendering.service";
import { TemplateDiscoveryService } from "../template-discovery/template-discovery.service";

import { InstanceDiscoveryMatchingService } from "./instance-discovery-matching.service";

import type { TemplateDefinition } from "../template-discovery/template-discovery.types";

/** Reads every template folder directly under a root. */
function collectTemplates(
  templatesService: TemplateDiscoveryService,
  templatesRootPath: string,
): TemplateDefinition[] {
  return readdirSync(templatesRootPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      return templatesService.collectTemplate({
        name: entry.name,
        templatePath: path.join(templatesRootPath, entry.name),
      });
    });
}

/**
 * Creates a module directory holding the five service-module files, and
 * returns its *parent* — the instance path a template's tree is laid over.
 */
async function createServiceModule(stem: string): Promise<string> {
  const instancePath = await mkdtemp(
    path.join(tmpdir(), "conformetry-instance-"),
  );
  const modulePath = path.join(instancePath, stem);

  await mkdir(modulePath, { recursive: true });

  for (const suffix of [
    ".constants.ts",
    ".module.ts",
    ".service.ts",
    ".service.unit.test.ts",
    ".types.ts",
  ]) {
    await writeFile(path.join(modulePath, `${stem}${suffix}`), "", "utf8");
  }

  return instancePath;
}

/**
 * Builds a templates root mirroring this workspace's real shapes, so the
 * ranking is exercised against the cases it actually has to discriminate.
 */
async function createTemplates(): Promise<{
  templates: TemplateDefinition[];
  templatesRootPath: string;
}> {
  const templatesRootPath = await mkdtemp(
    path.join(tmpdir(), "conformetry-templates-"),
  );
  const layout: Record<string, string[]> = {
    "nestjs-graphql-module": [
      "{{nameKebabCase}}/{{nameKebabCase}}.constants.ts",
      "{{nameKebabCase}}/{{nameKebabCase}}.entities.ts",
      "{{nameKebabCase}}/{{nameKebabCase}}.factories.ts",
      "{{nameKebabCase}}/{{nameKebabCase}}.module.ts",
      "{{nameKebabCase}}/{{nameKebabCase}}.resolver.ts",
      "{{nameKebabCase}}/{{nameKebabCase}}.resolver.unit.test.ts",
      "{{nameKebabCase}}/{{nameKebabCase}}.types.ts",
    ],
    "nestjs-service-file": [
      "{{nameKebabCase}}.service.ts",
      "{{nameKebabCase}}.service.unit.test.ts",
    ],
    "nestjs-service-module": [
      "{{nameKebabCase}}/{{nameKebabCase}}.constants.ts",
      "{{nameKebabCase}}/{{nameKebabCase}}.module.ts",
      "{{nameKebabCase}}/{{nameKebabCase}}.service.ts",
      "{{nameKebabCase}}/{{nameKebabCase}}.service.unit.test.ts",
      "{{nameKebabCase}}/{{nameKebabCase}}.types.ts",
    ],
  };

  for (const [name, filenames] of Object.entries(layout)) {
    for (const filename of filenames) {
      const filePath = path.join(templatesRootPath, name, filename);

      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, "", "utf8");
    }
  }

  return { templates: [], templatesRootPath };
}

describe(InstanceDiscoveryMatchingService, () => {
  let service: InstanceDiscoveryMatchingService;
  let templatesService: TemplateDiscoveryService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        InstanceDiscoveryMatchingService,
        TemplateDiscoveryService,
        RenderingService,
      ],
    }).compile();

    service = await module.resolve(InstanceDiscoveryMatchingService);
    templatesService = await module.resolve(TemplateDiscoveryService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("buildSubstitutions", () => {
    it("derives name variants from the instance stem", () => {
      expect(
        service.buildSubstitutions({
          nameStem: "my-widget",
          path: "/w/packages/x",
        }),
      ).toStrictEqual({
        name: "my-widget",
        nameCamelCase: "myWidget",
        nameKebabCase: "my-widget",
        namePascalCase: "MyWidget",
        nameSnakeCase: "my_widget",
      });
    });

    it("lets caller-supplied substitutions win", () => {
      expect(
        service.buildSubstitutions({
          nameStem: "my-widget",
          path: "/w/packages/x",
          substitutions: { name: "overridden", type: "packages" },
        }),
      ).toMatchObject({ name: "overridden", type: "packages" });
    });
  });

  describe("matchInstances", () => {
    it("stands in for every placeholder but name and supplied ones", async () => {
      const templatesRootPath = await mkdtemp(
        path.join(tmpdir(), "conformetry-templates-"),
      );
      const templatePath = path.join(templatesRootPath, "route");

      await mkdir(templatePath, { recursive: true });
      await writeFile(
        path.join(templatePath, "{{nameKebabCase}}.ts"),
        '"{{name}}" "{{path}}" "{{title}}" "{{type}}"',
        "utf8",
      );
      const instancePath = await mkdtemp(path.join(tmpdir(), "conformetry-"));

      await writeFile(path.join(instancePath, "word.ts"), "", "utf8");
      const { matched } = service.matchInstances({
        instances: [
          {
            nameStem: "word",
            path: instancePath,
            substitutions: { title: "Word", type: "applications" },
          },
        ],
        templates: collectTemplates(templatesService, templatesRootPath),
      });

      expect(Object.keys(matched[0]?.placeholderValues ?? {})).toStrictEqual([
        "path",
      ]);
      expect(matched[0]?.substitutions).toMatchObject({
        name: "word",
        title: "Word",
        type: "applications",
      });
    });

    it("prefers the larger template when both match completely", async () => {
      const { templatesRootPath } = await createTemplates();
      const templates = collectTemplates(templatesService, templatesRootPath);
      const instancePath = await createServiceModule("differences");

      const { matched } = service.matchInstances({
        instances: [{ nameStem: "differences", path: instancePath }],
        templates,
      });

      expect(matched[0]?.template.name).toBe("nestjs-service-module");
      expect(matched[0]?.matchedFileCount).toBe(5);
    });

    it("rejects a partially matching larger template on ratio", async () => {
      const { templatesRootPath } = await createTemplates();
      const templates = collectTemplates(templatesService, templatesRootPath);
      const instancePath = await createServiceModule("differences");

      const { matched } = service.matchInstances({
        instances: [{ nameStem: "differences", path: instancePath }],
        templates,
      });

      // graphql-module shares constants/module/types (3 of 7 = 43%) and must lose
      expect(matched[0]?.template.name).not.toBe("nestjs-graphql-module");
    });

    it("selects a two-file template when a file scope narrows the instance", async () => {
      const { templatesRootPath } = await createTemplates();
      const templates = collectTemplates(templatesService, templatesRootPath);
      const instancePath = await createServiceModule("differences");

      const modulePath = path.join(instancePath, "differences");
      const { matched } = service.matchInstances({
        instances: [
          {
            fileScope: [
              path.join(modulePath, "differences.service.ts"),
              path.join(modulePath, "differences.service.unit.test.ts"),
            ],
            nameStem: "differences",
            path: modulePath,
          },
        ],
        templates,
      });

      expect(matched[0]?.template.name).toBe("nestjs-service-file");
    });

    it("reports an instance no template explains", async () => {
      const { templatesRootPath } = await createTemplates();
      const templates = collectTemplates(templatesService, templatesRootPath);
      const instancePath = await mkdtemp(
        path.join(tmpdir(), "conformetry-empty-"),
      );

      const { matched, unmatched } = service.matchInstances({
        instances: [{ nameStem: "nothing", path: instancePath }],
        templates,
      });

      expect(matched).toStrictEqual([]);
      expect(unmatched[0]?.reason).toBe("no-match");
    });

    it("reports two partially matching templates that tie as ambiguous", async () => {
      const templatesRootPath = await mkdtemp(
        path.join(tmpdir(), "conformetry-templates-"),
      );
      const layout: Record<string, string[]> = {
        // Each shares exactly one file with the instance, so both reach 50%.
        alpha: [
          "{{nameKebabCase}}/{{nameKebabCase}}.service.ts",
          "{{nameKebabCase}}/{{nameKebabCase}}.resolver.ts",
        ],
        beta: [
          "{{nameKebabCase}}/{{nameKebabCase}}.module.ts",
          "{{nameKebabCase}}/{{nameKebabCase}}.dataloader.ts",
        ],
      };

      for (const [name, filenames] of Object.entries(layout)) {
        for (const filename of filenames) {
          const filePath = path.join(templatesRootPath, name, filename);

          await mkdir(path.dirname(filePath), { recursive: true });
          await writeFile(filePath, "", "utf8");
        }
      }

      const instancePath = await createServiceModule("differences");
      const { unmatched } = service.matchInstances({
        instances: [{ nameStem: "differences", path: instancePath }],
        templates: collectTemplates(templatesService, templatesRootPath),
      });

      expect(unmatched[0]?.reason).toBe("ambiguous");
      expect(unmatched[0]?.tiedTemplateNames).toStrictEqual(["alpha", "beta"]);
    });

    it("breaks an equal-ratio tie by absolute matched file count", async () => {
      const templatesRootPath = await mkdtemp(
        path.join(tmpdir(), "conformetry-templates-"),
      );
      const layout: Record<string, string[]> = {
        // Both templates reach a 50% match ratio, so the tiebreaker must fall
        // to whichever matched more files in absolute terms — "larger".
        larger: [
          "larger.service.ts",
          "larger.module.ts",
          "larger.types.ts",
          "larger.constants.ts",
        ],
        smaller: ["smaller.service.ts", "smaller.module.ts"],
      };

      for (const [name, filenames] of Object.entries(layout)) {
        for (const filename of filenames) {
          const filePath = path.join(templatesRootPath, name, filename);

          await mkdir(path.dirname(filePath), { recursive: true });
          await writeFile(filePath, "", "utf8");
        }
      }

      const instancePath = await mkdtemp(
        path.join(tmpdir(), "conformetry-instance-"),
      );

      // Matches half of "larger" (2 of 4) and half of "smaller" (1 of 2).
      await writeFile(path.join(instancePath, "larger.service.ts"), "", "utf8");
      await writeFile(path.join(instancePath, "larger.module.ts"), "", "utf8");
      await writeFile(
        path.join(instancePath, "smaller.service.ts"),
        "",
        "utf8",
      );

      const matches = service.matchTemplates({
        instance: { nameStem: "differences", path: instancePath },
        substitutions: {},
        templates: collectTemplates(templatesService, templatesRootPath),
      });

      expect(matches.map((match) => match.template.name)).toStrictEqual([
        "larger",
        "smaller",
      ]);
    });

    it("matches every template an instance satisfies completely", async () => {
      const templatesRootPath = await mkdtemp(
        path.join(tmpdir(), "conformetry-templates-"),
      );
      const layout: Record<string, string> = {
        alpha: "{{nameKebabCase}}/{{nameKebabCase}}.service.ts",
        beta: "{{nameKebabCase}}/{{nameKebabCase}}.module.ts",
      };

      for (const [name, filename] of Object.entries(layout)) {
        const filePath = path.join(templatesRootPath, name, filename);

        await mkdir(path.dirname(filePath), { recursive: true });
        await writeFile(filePath, "", "utf8");
      }

      const instancePath = await createServiceModule("differences");
      const { matched, unmatched } = service.matchInstances({
        instances: [{ nameStem: "differences", path: instancePath }],
        templates: collectTemplates(templatesService, templatesRootPath),
      });

      expect(matched.map((instance) => instance.template.name)).toStrictEqual([
        "alpha",
        "beta",
      ]);
      expect(unmatched).toStrictEqual([]);
    });
  });
});
