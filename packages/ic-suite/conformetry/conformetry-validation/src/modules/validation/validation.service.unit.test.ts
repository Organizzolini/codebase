import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { ConfigurationService } from "@conformetry/configuration";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { ValidationModule } from "./validation.module";
import { ValidationService } from "./validation.service";

import type { RunValidationResult } from "./validation.types";
import type { TemplateDefinition } from "@conformetry/configuration";

/** Writes an instance directory, optionally dropping the markdown file. */
async function createInstance(args: {
  configuration: string;
  withNotes: boolean;
}): Promise<string> {
  const instancePath = path.join(
    await mkdtemp(path.join(tmpdir(), "conformetry-validate-instance-")),
    "my-widget",
  );

  await mkdir(instancePath, { recursive: true });
  await writeFile(
    path.join(instancePath, "my-widget.config.json"),
    args.configuration,
    "utf8",
  );

  if (args.withNotes) {
    await writeFile(
      path.join(instancePath, "my-widget.notes.md"),
      "# MyWidget\n",
      "utf8",
    );
  }

  return instancePath;
}
/**
 * Writes a one-template root: a JSON file whose shape the instance must match,
 * plus a file the instance is required to have.
 */
async function createTemplatePath(): Promise<string> {
  const templatePath = path.join(
    await mkdtemp(path.join(tmpdir(), "conformetry-validate-templates-")),
    "widget",
  );

  await mkdir(templatePath, { recursive: true });
  await writeFile(
    path.join(templatePath, "{{nameKebabCase}}.config.json"),
    '{\n  "kind": "widget",\n  "name": "{{nameKebabCase}}"\n}\n',
    "utf8",
  );
  await writeFile(
    path.join(templatePath, "{{nameKebabCase}}.notes.md"),
    "# {{namePascalCase}}\n",
    "utf8",
  );

  return templatePath;
}

/** Writes each file under a fresh directory and returns that directory. */
async function writeTree(args: {
  files: Record<string, string>;
  prefix: string;
}): Promise<string> {
  const directoryPath = await mkdtemp(path.join(tmpdir(), args.prefix));

  for (const [filePath, content] of Object.entries(args.files)) {
    await mkdir(path.dirname(path.join(directoryPath, filePath)), {
      recursive: true,
    });
    await writeFile(path.join(directoryPath, filePath), content, "utf8");
  }

  return directoryPath;
}

/** A route whose path no substitution supplies, and a test repeating it. */
const ROUTE_TEMPLATE_FILES = {
  "{{nameKebabCase}}/{{nameKebabCase}}.route.test.ts":
    'it("renders", async () => {\n  await renderRoute("{{path}}");\n  expect(readPath()).toBe("{{path}}");\n});\n',
  "{{nameKebabCase}}/{{nameKebabCase}}.route.ts":
    'export const Route = createFileRoute("{{path}}")({});\n',
};

/** Writes a route instance, its test asserting `assertedPath`. */
async function createRouteInstance(args: {
  assertedPath: string;
  routePath: string;
}): Promise<string> {
  return writeTree({
    files: {
      "word/word.route.test.ts": `it("renders", async () => {\n  await renderRoute("${args.routePath}");\n  expect(readPath()).toBe("${args.assertedPath}");\n});\n`,
      "word/word.route.ts": `export const Route = createFileRoute("${args.routePath}")({});\n`,
    },
    prefix: "conformetry-validate-route-",
  });
}

describe(ValidationService, () => {
  let service: ValidationService;
  let templates: TemplateDefinition[];

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [ValidationModule],
      providers: [ValidationService],
    }).compile();

    service = await module.resolve(ValidationService);
    const configurationService = await module.resolve(ConfigurationService);

    templates = [
      configurationService.collectTemplate({
        name: "widget",
        templatePath: await createTemplatePath(),
      }),
    ];
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("validate", () => {
    it("passes an instance that matches its template", async () => {
      const instancePath = await createInstance({
        configuration: '{\n  "kind": "widget",\n  "name": "my-widget"\n}\n',
        withNotes: true,
      });

      const result = service.validate({
        instances: [{ nameStem: "my-widget", path: instancePath }],
        templates,
      });

      expect(result.fileResults).toStrictEqual([]);
      expect(result.ok).toBe(true);
      expect(result.checkedPaths).toStrictEqual([instancePath]);
    });

    it("reports a key the template requires and the instance lacks", async () => {
      const instancePath = await createInstance({
        configuration: '{\n  "name": "my-widget"\n}\n',
        withNotes: true,
      });

      const result = service.validate({
        instances: [{ nameStem: "my-widget", path: instancePath }],
        templates,
      });

      expect(result.ok).toBe(false);
      expect(result.fileResults[0]?.filename).toBe("my-widget.config.json");
    });

    it("reports a file the template requires and the instance lacks", async () => {
      const instancePath = await createInstance({
        configuration: '{\n  "kind": "widget",\n  "name": "my-widget"\n}\n',
        withNotes: false,
      });

      const result = service.validate({
        instances: [{ nameStem: "my-widget", path: instancePath }],
        templates,
      });

      expect(result.ok).toBe(false);
      expect(result.fileResults[0]?.differences[0]?.differenceType).toBe(
        "file",
      );
    });

    it("runs only the languages it was asked for", async () => {
      const instancePath = await createInstance({
        configuration: '{\n  "name": "my-widget"\n}\n',
        withNotes: true,
      });

      const result = service.validate({
        instances: [{ nameStem: "my-widget", path: instancePath }],
        languageNames: ["markdown"],
        templates,
      });

      expect(result.fileResults).toStrictEqual([]);
      expect(result.ok).toBe(true);
    });

    it("fails an instance no template explains", async () => {
      const instancePath = await mkdtemp(
        path.join(tmpdir(), "conformetry-validate-empty-"),
      );

      const result = service.validate({
        instances: [{ nameStem: "nothing", path: instancePath }],
        templates,
      });

      expect(result.ok).toBe(false);
      expect(result.unmatched[0]?.reason).toBe("no-match");
      expect(result.checkedPaths).toStrictEqual([]);
    });
  });

  describe("placeholders nothing supplied", () => {
    let routeTemplates: TemplateDefinition[];

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        imports: [ValidationModule],
      }).compile();
      const configurationService = await module.resolve(ConfigurationService);

      routeTemplates = [
        configurationService.collectTemplate({
          name: "route",
          templatePath: await writeTree({
            files: ROUTE_TEMPLATE_FILES,
            prefix: "conformetry-validate-route-template-",
          }),
        }),
      ];
    });

    it("infers the value from the instance and passes a consistent one", async () => {
      const instancePath = await createRouteInstance({
        assertedPath: "/word/$id",
        routePath: "/word/$id",
      });

      const result = service.validate({
        instances: [{ nameStem: "word", path: instancePath }],
        templates: routeTemplates,
      });

      expect(result.fileResults).toStrictEqual([]);
      expect(result.ok).toBe(true);
    });

    it("reports a later occurrence holding a different value as a difference", async () => {
      const instancePath = await createRouteInstance({
        assertedPath: "/word",
        routePath: "/word/$id",
      });

      const result = service.validate({
        instances: [{ nameStem: "word", path: instancePath }],
        templates: routeTemplates,
      });

      expect(result.ok).toBe(false);
      expect(result.fileResults[0]?.filename).toBe("word.route.test.ts");
      expect(result.fileResults[0]?.differences[0]?.differenceType).toBe(
        "code",
      );
    });

    it("reports a placeholder no instance node revealed, failing at any threshold", async () => {
      const instancePath = await writeTree({
        files: {
          "word/word.route.test.ts": "it();\n",
          "word/word.route.ts": "export const Route = 1;\n",
        },
        prefix: "conformetry-validate-route-",
      });

      const result = service.validate({
        instances: [{ nameStem: "word", path: instancePath }],
        templates: routeTemplates,
        threshold: 0,
      });
      const messages = result.fileResults.flatMap((fileResult) => {
        return fileResult.differences.map((difference) => difference.message);
      });

      expect(result.ok).toBe(false);
      expect(result.scores[0]?.score).toBeLessThan(1);
      expect(messages).toContain(
        "Could not infer {{path}}: no instance node aligned with the template text that uses it",
      );
      expect(messages.join("\n")).not.toMatch(/conformetry[0-9a-f]{32}/);
    });

    it("tolerates a discovery service that records or prepares nothing", async () => {
      const instancePath = await createRouteInstance({
        assertedPath: "/word/$id",
        routePath: "/word/$id",
      });
      const realModule = await Test.createTestingModule({
        imports: [ValidationModule],
      }).compile();
      const real = await realModule.resolve(ConfigurationService);
      const validateWith = async (
        matchInstances: ConfigurationService["matchInstances"],
      ): Promise<RunValidationResult> => {
        const module = await Test.createTestingModule({
          imports: [ValidationModule],
        })
          .overrideProvider(ConfigurationService)
          .useValue({
            matchInstances,
            prepareDocuments: () => [],
            resolveInstanceFiles: real.resolveInstanceFiles.bind(real),
          })
          .compile();

        const validation = await module.resolve(ValidationService);

        return validation.validate({
          instances: [{ nameStem: "word", path: instancePath }],
          templates: routeTemplates,
        });
      };

      // Nothing prepared means nothing to capture from, so the placeholder
      // is reported rather than the run failing.
      const unprepared = await validateWith(real.matchInstances.bind(real));
      // An instance recording no stand-ins has nothing left to infer.
      const unrecorded = await validateWith((args) => {
        const resolved = real.matchInstances(args);

        return {
          ...resolved,
          matched: resolved.matched.map(
            ({ placeholderValues: _ignored, ...matched }) => matched,
          ),
        };
      });

      expect(unprepared.fileResults[0]?.differences[0]?.differenceType).toBe(
        "placeholder",
      );
      expect(unrecorded.ok).toBe(true);
    });

    it("lets a configured substitution win over inference", async () => {
      const instancePath = await createRouteInstance({
        assertedPath: "/word/$id",
        routePath: "/word/$id",
      });

      const result = service.validate({
        instances: [
          {
            nameStem: "word",
            path: instancePath,
            substitutions: { path: "/elsewhere" },
          },
        ],
        templates: routeTemplates,
      });

      expect(result.ok).toBe(false);
    });
  });

  describe("caller-supplied options", () => {
    it("runs only the languages the caller named", async () => {
      const instancePath = await createInstance({
        configuration: "{}\n",
        withNotes: true,
      });
      const result = service.validate({
        instances: [{ nameStem: "my-widget", path: instancePath }],
        languageNames: ["markdown"],
        templates,
      });

      expect(result.ok).toBe(true);
    });

    it("runs every language when the filter is empty", async () => {
      const instancePath = await createInstance({
        configuration: "{}\n",
        withNotes: true,
      });
      const instances = [{ nameStem: "my-widget", path: instancePath }];
      const filtered = service.validate({
        instances,
        languageNames: [],
        templates,
      });
      const unfiltered = service.validate({ instances, templates });

      // An empty filter means "everything", not "nothing" — the two calls
      // must reach the same verdict.
      expect(filtered.fileResults).toStrictEqual(unfiltered.fileResults);
    });
  });

  describe("resilience to a discovery service reporting no prepared documents", () => {
    it("treats no prepared entry for the instance as no documents to compare", async () => {
      const instancePath = await createInstance({
        configuration: '{\n  "kind": "widget",\n  "name": "my-widget"\n}\n',
        withNotes: true,
      });
      const realModule = await Test.createTestingModule({
        imports: [ValidationModule],
        providers: [ValidationService],
      }).compile();
      const realConfigurationService =
        await realModule.resolve(ConfigurationService);
      const overriddenModule = await Test.createTestingModule({
        imports: [ValidationModule],
        providers: [ValidationService],
      })
        .overrideProvider(ConfigurationService)
        .useValue({
          matchInstances: (
            args: Parameters<ConfigurationService["matchInstances"]>[0],
          ) => realConfigurationService.matchInstances(args),
          // Always empty, unlike the real service, which returns one entry
          // per instance — this exercises the defensive fallback for a
          // missing prepared entry that a one-to-one mapping never reaches
          // in practice.
          prepareDocuments: () => [],
          resolveInstanceFiles: (
            args: Parameters<ConfigurationService["resolveInstanceFiles"]>[0],
          ) => realConfigurationService.resolveInstanceFiles(args),
        })
        .compile();
      const serviceUnderTest =
        await overriddenModule.resolve(ValidationService);

      const result = serviceUnderTest.validate({
        instances: [{ nameStem: "my-widget", path: instancePath }],
        templates,
      });

      expect(result.fileResults).toStrictEqual([]);
      expect(result.ok).toBe(true);
    });
  });
});
