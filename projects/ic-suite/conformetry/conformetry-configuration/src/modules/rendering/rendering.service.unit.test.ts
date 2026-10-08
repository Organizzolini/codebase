import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { MissingSubstitutionError } from "./rendering.constants";
import { RenderingService } from "./rendering.service";

describe(RenderingService, () => {
  let service: RenderingService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [RenderingService],
    }).compile();

    service = await module.resolve(RenderingService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("buildNameSubstitutions", () => {
    it("derives every case variant from a kebab-case name", () => {
      expect(service.buildNameSubstitutions("my-widget")).toStrictEqual({
        nameCamelCase: "myWidget",
        nameKebabCase: "my-widget",
        namePascalCase: "MyWidget",
        nameSnakeCase: "my_widget",
      });
    });

    it("normalizes names that arrive in other cases", () => {
      expect(service.buildNameSubstitutions("MyWidget")).toStrictEqual({
        nameCamelCase: "myWidget",
        nameKebabCase: "my-widget",
        namePascalCase: "MyWidget",
        nameSnakeCase: "my_widget",
      });
    });
  });

  describe("renderContent", () => {
    it("substitutes placeholders", () => {
      const rendered = service.renderContent({
        substitutions: { namePascalCase: "MyWidget" },
        templateContent: "export class {{namePascalCase}}Service {}",
      });

      expect(rendered).toBe("export class MyWidgetService {}");
    });

    it("tolerates whitespace inside the placeholder", () => {
      const rendered = service.renderContent({
        substitutions: { name: "widget" },
        templateContent: "a {{ name }} b",
      });

      expect(rendered).toBe("a widget b");
    });

    it("refuses a placeholder nobody supplied", () => {
      expect(() =>
        service.renderContent({
          substitutions: {},
          templateContent: "value: {{missing}}",
        }),
      ).toThrow(MissingSubstitutionError);
    });

    it("names every placeholder nobody supplied, and where it was asked", () => {
      expect(() =>
        service.renderContent({
          subject: "templates/widget/widget.md",
          substitutions: {},
          templateContent: "{{owner}} and {{team}}",
        }),
      ).toThrow(/\{\{owner\}\}, \{\{team\}\}.*templates\/widget\/widget\.md/u);
    });

    it("accepts a supplied placeholder whose value is the empty string", () => {
      // Supplying "" is an answer. Only an absent key is a hole.
      const rendered = service.renderContent({
        substitutions: { owner: "" },
        templateContent: "owner: {{owner}}",
      });

      expect(rendered).toBe("owner: ");
    });

    it("treats an absent section name as a conditional, not a hole", () => {
      // `{{#field}}` and `{{^field}}` ask a question; absence is the answer.
      const rendered = service.renderContent({
        substitutions: {},
        templateContent: "{{#extra}}yes{{/extra}}{{^extra}}no{{/extra}}",
      });

      expect(rendered).toBe("no");
    });

    it("still refuses an interpolation nested inside a section", () => {
      expect(() =>
        service.renderContent({
          substitutions: { extra: "on" },
          templateContent: "{{#extra}}{{missing}}{{/extra}}",
        }),
      ).toThrow(MissingSubstitutionError);
    });

    it("ignores a comment, which names no field", () => {
      const rendered = service.renderContent({
        substitutions: {},
        templateContent: "a{{! not a placeholder }}b",
      });

      expect(rendered).toBe("ab");
    });

    it("does not HTML-escape substituted values", () => {
      const rendered = service.renderContent({
        substitutions: { description: `Tools & <utilities> "quoted"` },
        templateContent: "// {{description}}",
      });

      expect(rendered).toBe(`// Tools & <utilities> "quoted"`);
    });

    it("renders sections", () => {
      const rendered = service.renderContent({
        substitutions: { name: "widget" },
        templateContent: "{{#name}}has {{name}}{{/name}}",
      });

      expect(rendered).toBe("has widget");
    });

    it("renders inverted sections for absent values", () => {
      const rendered = service.renderContent({
        substitutions: {},
        templateContent: "{{^name}}no name{{/name}}",
      });

      expect(rendered).toBe("no name");
    });

    it("does not run greedily across two adjacent placeholders", () => {
      const rendered = service.renderContent({
        substitutions: { first: "a", second: "b" },
        templateContent: "{{first}}{{second}}",
      });

      expect(rendered).toBe("ab");
    });

    it("renders a triple-brace token unescaped", () => {
      const rendered = service.renderContent({
        substitutions: { name: "widget" },
        templateContent: "{{{name}}}",
      });

      expect(rendered).toBe("widget");
    });
  });

  describe("renderPath", () => {
    it("substitutes path placeholders", () => {
      const rendered = service.renderPath({
        substitutions: { nameKebabCase: "my-widget" },
        templatePath: "{{nameKebabCase}}.service.ts",
      });

      expect(rendered).toBe("my-widget.service.ts");
    });

    it("substitutes every placeholder in a nested path", () => {
      const rendered = service.renderPath({
        substitutions: { nameKebabCase: "my-widget" },
        templatePath: "src/{{nameKebabCase}}/{{nameKebabCase}}.module.ts",
      });

      expect(rendered).toBe("src/my-widget/my-widget.module.ts");
    });

    it("refuses a placeholder nobody supplied, as content does", () => {
      expect(() =>
        service.renderPath({
          substitutions: {},
          templatePath: "{{missing}}.ts",
        }),
      ).toThrow(MissingSubstitutionError);
    });

    it("leaves a Python dunder alone", () => {
      // The reason paths moved off `__field__`: that syntax could not tell a
      // placeholder from `__init__.py`, which every Python package ships.
      const rendered = service.renderPath({
        substitutions: { init: "wrong", nameKebabCase: "my-widget" },
        templatePath: "src/__init__.py",
      });

      expect(rendered).toBe("src/__init__.py");
    });
  });

  it("renders content and paths consistently for one name", () => {
    const substitutions = service.buildNameSubstitutions("my-widget");

    expect(
      service.renderPath({
        substitutions,
        templatePath: "{{nameKebabCase}}.service.ts",
      }),
    ).toBe("my-widget.service.ts");
    expect(
      service.renderContent({
        substitutions,
        templateContent: "class {{namePascalCase}}Service {}",
      }),
    ).toBe("class MyWidgetService {}");
  });
});
