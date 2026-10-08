import { createMock, type DeepMocked } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { ScoringService } from "../scoring/scoring.service";

import { TypescriptCommentsService } from "./typescript-comments.service";
import { TypescriptNodesService } from "./typescript-nodes.service";
import { TypescriptTreeService } from "./typescript-tree.service";
import { TypescriptService } from "./typescript.service";

import type {
  ConformetryDifference,
  PreparedValidationDocument,
} from "@conformetry/core";

function createDocument(args: {
  filename?: string;
  instance: string;
  renderedTemplate: string;
}): PreparedValidationDocument {
  const filename = args.filename ?? "example.service.ts";

  return {
    filename,
    instance: args.instance,
    instanceFilePath: `/project/${filename}`,
    renderedTemplate: args.renderedTemplate,
    templateFilePath: `/templates/${filename}`,
  };
}

describe(TypescriptService, () => {
  let service: TypescriptService;

  function validate(
    renderedTemplate: string,
    instance: string,
  ): ConformetryDifference[] {
    return service.validateDocument(
      createDocument({ instance, renderedTemplate }),
    ).differences;
  }

  function weigh(renderedTemplate: string, instance: string): number {
    return service.validateDocument(
      createDocument({ instance, renderedTemplate }),
    ).totalWeight;
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ScoringService,
        TypescriptCommentsService,
        TypescriptNodesService,
        TypescriptTreeService,
        TypescriptService,
      ],
    }).compile();

    service = await module.resolve(TypescriptService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("weighs a document's requirements whether or not it conforms", () => {
    const template = "export class Widget {\n  alpha() {}\n}\n";

    // The denominator must not move with the instance: a template asks for the
    // same amount whether or not the instance supplied any of it.
    expect(weigh(template, template)).toBe(weigh(template, ""));
    expect(weigh(template, template)).toBeGreaterThan(0);
  });

  it("claims TypeScript files", () => {
    expect(service.descriptor.fileExtensions).toStrictEqual([".ts", ".tsx"]);
    expect(service.descriptor.name).toBe("typescript");
  });

  describe("structure", () => {
    it("accepts an instance that adds declarations", () => {
      expect(
        validate(
          "export class A {}\n",
          "export class A {}\nexport class B {}\n",
        ),
      ).toStrictEqual([]);
    });

    it("accepts reordered declarations", () => {
      expect(
        validate(
          "export class A {}\nexport class B {}\n",
          "export class B {}\nexport class A {}\n",
        ),
      ).toStrictEqual([]);
    });

    it("reports a missing class", () => {
      const differences = validate("export class Widget {}\n", "");

      expect(differences).toHaveLength(1);
      expect(differences[0]?.message).toContain('"Widget"');
      expect(differences[0]?.language).toBe("typescript");
    });

    it("reports a missing import by module specifier", () => {
      const differences = validate('import { A } from "./a";\n', "");

      expect(differences[0]?.message).toContain('"./a"');
    });

    it("reports a missing decorator", () => {
      const differences = validate(
        'import { Injectable } from "@nestjs/common";\n@Injectable()\nexport class A {}\n',
        'import { Injectable } from "@nestjs/common";\nexport class A {}\n',
      );

      expect(
        differences.some((error) => error.message.includes("Injectable")),
      ).toBe(true);
    });

    it("carries instance and template locations", () => {
      const differences = validate(
        "export class Widget {}\n",
        "const x = 1;\n",
      );

      expect(differences[0]?.templateLine).toBe(1);
      expect(differences[0]?.instanceLine).toBe(1);
      expect(differences[0]?.instanceColumn).toBeGreaterThan(0);
    });

    it("carries an actionable fix", () => {
      const differences = validate("export class Widget {}\n", "");

      expect(differences[0]?.fix).toContain("Add the missing");
    });
  });

  describe("comments", () => {
    const SECTIONED_TEMPLATE = [
      "export class A {",
      "  // 🏗 Dependency Injection",
      "  // 🔏 Private Methods",
      "  // 🌎 Public Methods",
      "}",
      "",
    ].join("\n");

    it("accepts section markers in the template's order", () => {
      expect(validate(SECTIONED_TEMPLATE, SECTIONED_TEMPLATE)).toStrictEqual(
        [],
      );
    });

    it("reports a missing section marker", () => {
      const differences = validate(
        SECTIONED_TEMPLATE,
        "export class A {\n  // 🏗 Dependency Injection\n  // 🌎 Public Methods\n}\n",
      );

      expect(differences).toHaveLength(1);
      expect(differences[0]?.differenceType).toBe("comment");
      expect(differences[0]?.message).toContain("🔏 Private Methods");
    });

    it("reports markers present but out of order", () => {
      const differences = validate(
        SECTIONED_TEMPLATE,
        [
          "export class A {",
          "  // 🌎 Public Methods",
          "  // 🔏 Private Methods",
          "  // 🏗 Dependency Injection",
          "}",
          "",
        ].join("\n"),
      );

      expect(differences.length).toBeGreaterThan(0);
      expect(
        differences.every((error) => error.differenceType === "comment"),
      ).toBe(true);
    });

    it("treats a TODO template comment as a placeholder", () => {
      expect(
        validate(
          "/** TODO: Document the a service. */\nexport class A {}\n",
          "/** Owns widgets. */\nexport class A {}\n",
        ),
      ).toStrictEqual([]);
    });
  });

  describe("how nodes are keyed", () => {
    it("keys a called decorator by its callee", () => {
      const source = "@Injectable()\nexport class Widget {}\n";

      expect(validate(source, source)).toStrictEqual([]);
    });

    it("keys a bare decorator by its own name", () => {
      const source = "@Injectable\nexport class Widget {}\n";

      expect(validate(source, source)).toStrictEqual([]);
    });

    it("reports a decorator replaced by a different one", () => {
      expect(
        validate(
          "@Injectable()\nexport class Widget {}\n",
          "@Controller()\nexport class Widget {}\n",
        ).length,
      ).toBeGreaterThan(0);
    });

    it("keys a dotted callee by its whole path", () => {
      const source = "@Nest.Injectable()\nexport class Widget {}\n";

      expect(validate(source, source)).toStrictEqual([]);
    });

    it("ignores a callee that is not an identifier at all", () => {
      const source = "getRunner()();\n";

      expect(validate(source, source)).toStrictEqual([]);
    });

    it("ignores a decorator whose callee is not an identifier", () => {
      const source = "@(factory())\nexport class Widget {}\n";

      expect(validate(source, source)).toStrictEqual([]);
    });

    it("keys a member declared with a string or numeric name", () => {
      const source =
        "export class Widget {\n" +
        '  public "with-dashes"(): void {}\n\n' +
        "  public 42(): void {}\n" +
        "}\n";

      expect(validate(source, source)).toStrictEqual([]);
    });

    it("keys a call statement by a numeric first argument", () => {
      expect(validate("retry(1);\n", "retry(2);\n").length).toBeGreaterThan(0);
    });

    it("keys a call statement whose argument is neither string nor number", () => {
      const source = "run({ mode: 1 });\n";

      expect(validate(source, source)).toStrictEqual([]);
    });

    it("keys a call statement whose first argument is not a literal", () => {
      const source = "run(() => 1);\n";

      expect(validate(source, source)).toStrictEqual([]);
    });

    it("keys a call statement whose argument is not a node", () => {
      const source = "run(...items);\n";

      expect(validate(source, source)).toStrictEqual([]);
    });

    it("keeps the first of two equally distant candidates", () => {
      const template = "export class Widget {\n  public alpha(): void {}\n}\n";
      const instance =
        "export class Widget {\n" +
        "  public beta(): void {}\n\n" +
        "  public gamma(): void {}\n" +
        "}\n";

      expect(validate(template, instance).length).toBeGreaterThan(0);
    });

    it("keys a call statement whose argument is an identifier", () => {
      const source = "const mode = 1;\nrun(mode);\n";

      expect(validate(source, source)).toStrictEqual([]);
    });

    it("picks the closest of two equally plausible siblings", () => {
      const source =
        "export class Widget {\n" +
        "  public alpha(): void {}\n\n" +
        "  public beta(): void {}\n" +
        "}\n";

      expect(validate(source, source)).toStrictEqual([]);
    });

    it("keys a re-export by the module it names", () => {
      const source = 'export { alpha } from "./alpha";\n';

      expect(validate(source, source)).toStrictEqual([]);
    });

    it("reports a re-export of a different module", () => {
      expect(
        validate(
          'export { alpha } from "./alpha";\n',
          'export { alpha } from "./beta";\n',
        ).length,
      ).toBeGreaterThan(0);
    });

    it("ignores an export that names no module", () => {
      const source = "const alpha = 1;\nexport { alpha };\n";

      expect(validate(source, source)).toStrictEqual([]);
    });

    it("tells two call statements apart by their first argument", () => {
      expect(
        validate(
          'describe("alpha", () => {});\n',
          'describe("beta", () => {});\n',
        ).length,
      ).toBeGreaterThan(0);
    });

    it("keys a call statement with no literal argument by its callee alone", () => {
      const source = "run();\n";

      expect(validate(source, source)).toStrictEqual([]);
    });

    it("ignores a statement that is not a call at all", () => {
      const source = "let counter = 0;\ncounter += 1;\n";

      expect(validate(source, source)).toStrictEqual([]);
    });
  });

  describe("other file shapes", () => {
    it("parses a .tsx file as TSX rather than TS", () => {
      const source = "export const Widget = () => <div />;\n";

      expect(
        service.validateDocument(
          createDocument({
            filename: "widget.tsx",
            instance: source,
            renderedTemplate: source,
          }),
        ).differences,
      ).toStrictEqual([]);
    });

    it("keys an import by the module it names", () => {
      const source = 'import { alpha } from "./alpha";\n';

      expect(validate(source, source)).toStrictEqual([]);
    });

    it("reports an import of a different module", () => {
      expect(
        validate(
          'import { alpha } from "./alpha";\n',
          'import { alpha } from "./beta";\n',
        ).length,
      ).toBeGreaterThan(0);
    });

    it("describes a missing node that carries no key", () => {
      expect(
        validate("if (ready) {\n  start();\n}\n", "const other = 1;\n").length,
      ).toBeGreaterThan(0);
    });

    it("keys a member declared with a string or numeric name", () => {
      const source =
        "export class Widget {\n" +
        '  public "with-dashes"(): void {}\n\n' +
        "  public 42(): void {}\n" +
        "}\n";

      expect(validate(source, source)).toStrictEqual([]);
    });

    it("keys a call statement by a numeric first argument", () => {
      const source = "run(42);\n";

      expect(validate(source, source)).toStrictEqual([]);
    });
  });

  describe("locations for positions no real parse produces", () => {
    // readLocation treats a missing or negative position as unresolvable.
    // A real parse never produces one — every position comes straight from
    // `Node.getStart()` or a real comment's offset — so these scenarios are
    // reached by mocking the collaborators that hand positions to the
    // service, rather than by parsing contrived source.
    let mockedService: TypescriptService;
    let mockTypeScriptCommentsService: DeepMocked<TypescriptCommentsService>;
    let mockTypeScriptTreeService: DeepMocked<TypescriptTreeService>;

    beforeAll(async () => {
      mockTypeScriptCommentsService = createMock<TypescriptCommentsService>();
      mockTypeScriptTreeService = createMock<TypescriptTreeService>();

      const module = await Test.createTestingModule({
        providers: [
          TypescriptService,
          {
            provide: TypescriptCommentsService,
            useValue: mockTypeScriptCommentsService,
          },
          {
            provide: TypescriptTreeService,
            useValue: mockTypeScriptTreeService,
          },
        ],
      }).compile();

      mockedService = await module.resolve(TypescriptService);
    });

    function validateMocked(): ConformetryDifference[] {
      return mockedService.validateDocument(
        createDocument({ instance: "", renderedTemplate: "" }),
      ).differences;
    }

    it("omits the template location for a comment with no resolvable position", () => {
      mockTypeScriptTreeService.compareTree.mockReturnValue({
        differences: [],
        totalWeight: 0,
      });
      mockTypeScriptCommentsService.compareComments.mockReturnValue({
        missingComments: [{ position: -1, text: "// 🏗 Section" }],
        totalWeight: 1,
      });

      const [difference] = validateMocked();

      expect(difference?.templateLine).toBeUndefined();
      expect(difference?.templateColumn).toBeUndefined();
    });

    it("omits the instance location when a difference has no instance position", () => {
      mockTypeScriptCommentsService.compareComments.mockReturnValue({
        missingComments: [],
        totalWeight: 0,
      });
      mockTypeScriptTreeService.compareTree.mockReturnValue({
        differences: [
          {
            instancePosition: undefined,
            kindLabel: "ClassDeclaration",
            nodeKey: "Widget",
            templatePosition: 0,
            weight: 1,
          },
        ],
        totalWeight: 1,
      });

      const [difference] = validateMocked();

      expect(difference?.instanceLine).toBeUndefined();
      expect(difference?.instanceColumn).toBeUndefined();
      expect(difference?.templateLine).toBe(1);
    });

    it("omits the template location when a difference's template position is negative", () => {
      mockTypeScriptCommentsService.compareComments.mockReturnValue({
        missingComments: [],
        totalWeight: 0,
      });
      mockTypeScriptTreeService.compareTree.mockReturnValue({
        differences: [
          {
            instancePosition: 0,
            kindLabel: "ClassDeclaration",
            nodeKey: "Widget",
            templatePosition: -1,
            weight: 1,
          },
        ],
        totalWeight: 1,
      });

      const [difference] = validateMocked();

      expect(difference?.instanceLine).toBe(1);
      expect(difference?.templateLine).toBeUndefined();
      expect(difference?.templateColumn).toBeUndefined();
    });
  });
});
