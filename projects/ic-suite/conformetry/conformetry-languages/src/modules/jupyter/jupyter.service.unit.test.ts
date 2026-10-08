import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { DifferencesService } from "../differences/differences.service";
import { JsonComparisonService } from "../json/json-comparison.service";
import { MarkdownNodesService } from "../markdown/markdown-nodes.service";
import { MarkdownTreeService } from "../markdown/markdown-tree.service";
import { MarkdownService } from "../markdown/markdown.service";
import { PythonBridgeService } from "../python/python-bridge.service";
import { ScoringService } from "../scoring/scoring.service";

import { JupyterNotebookService } from "./jupyter-notebook.service";
import { JupyterService } from "./jupyter.service";

import type {
  ConformetryDifference,
  PreparedValidationDocument,
} from "@conformetry/core";

interface CellSpec {
  kind: "code" | "markdown";
  source: string;
}

function buildNotebook(cells: CellSpec[]): string {
  return JSON.stringify({
    cells: cells.map((cell) => ({
      cell_type: cell.kind,
      metadata: {},
      source: cell.source.split(/(?<=\n)/u),
    })),
    metadata: { kernelspec: { language: "python", name: "python3" } },
    nbformat: 4,
    nbformat_minor: 5,
  });
}

function createDocument(args: {
  instance: string;
  renderedTemplate: string;
}): PreparedValidationDocument {
  return {
    filename: "analysis.ipynb",
    instance: args.instance,
    instanceFilePath: "/project/analysis.ipynb",
    renderedTemplate: args.renderedTemplate,
    templateFilePath: "/templates/analysis.ipynb",
  };
}

const TEMPLATE_CELLS: CellSpec[] = [
  { kind: "markdown", source: "# Analysis\n" },
  { kind: "code", source: "import os\n\n\ndef run():\n    pass\n" },
];

describe(JupyterService, () => {
  let service: JupyterService;

  function validate(instanceCells: CellSpec[]): ConformetryDifference[] {
    return service.validateDocument(
      createDocument({
        instance: buildNotebook(instanceCells),
        renderedTemplate: buildNotebook(TEMPLATE_CELLS),
      }),
    ).differences;
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DifferencesService,
        JsonComparisonService,
        JupyterNotebookService,
        JupyterService,
        MarkdownNodesService,
        MarkdownService,
        MarkdownTreeService,
        PythonBridgeService,
        ScoringService,
      ],
    }).compile();

    service = await module.resolve(JupyterService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("claims notebooks", () => {
    expect(service.descriptor.fileExtensions).toStrictEqual([".ipynb"]);
    expect(service.descriptor.name).toBe("jupyter");
  });

  it("accepts an identical notebook", () => {
    expect(validate(TEMPLATE_CELLS)).toStrictEqual([]);
  });

  it("accepts a notebook that adds cells", () => {
    expect(
      validate([...TEMPLATE_CELLS, { kind: "code", source: "run()\n" }]),
    ).toStrictEqual([]);
  });

  it("accepts a reformatted code cell, because it parses as Python", () => {
    expect(
      validate([
        { kind: "markdown", source: "# Analysis\n" },
        { kind: "code", source: "import os\n\n\n\ndef run():\n\n    pass\n" },
      ]),
    ).toStrictEqual([]);
  });

  it("reports a missing cell", () => {
    const differences = validate([
      { kind: "markdown", source: "# Analysis\n" },
    ]);

    expect(differences).toHaveLength(1);
    expect(differences[0]?.message).toBe("Missing code cell 2");
  });

  it("reports a missing heading in a markdown cell", () => {
    const differences = validate([
      { kind: "markdown", source: "# Something else\n" },
      { kind: "code", source: "import os\n\n\ndef run():\n    pass\n" },
    ]);

    expect(differences).toHaveLength(1);
    expect(differences[0]?.message).toContain("Cell 1 (markdown)");
    expect(differences[0]?.message).toContain("Analysis");
  });

  it("reports a missing function in a code cell", () => {
    const differences = validate([
      { kind: "markdown", source: "# Analysis\n" },
      { kind: "code", source: "import os\n" },
    ]);

    expect(differences).toHaveLength(1);
    expect(differences[0]?.message).toContain("Cell 2 (code)");
    expect(differences[0]?.message).toContain("run");
  });

  it("reports an envelope difference", () => {
    const differences = service.validateDocument(
      createDocument({
        instance: JSON.stringify({ cells: [], nbformat: 3 }),
        renderedTemplate: JSON.stringify({ cells: [], nbformat: 4 }),
      }),
    ).differences;

    expect(differences.some((error) => error.instancePath === "nbformat")).toBe(
      true,
    );
  });

  describe("malformed and unrecognized notebooks", () => {
    it("compares an empty envelope when a notebook is not an object", () => {
      const { differences } = service.validateDocument(
        createDocument({
          instance: JSON.stringify([]),
          renderedTemplate: JSON.stringify([]),
        }),
      );

      expect(differences).toStrictEqual([]);
    });

    it("raises nothing for a cell kind no validator owns", () => {
      const raw = JSON.stringify({
        cells: [{ cell_type: "heading", source: ["hi\n"] }],
      });
      const { differences } = service.validateDocument(
        createDocument({ instance: raw, renderedTemplate: raw }),
      );

      expect(differences).toStrictEqual([]);
    });
  });
});
