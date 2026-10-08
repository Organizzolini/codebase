import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { JupyterNotebookService } from "./jupyter-notebook.service";

/** Serializes a notebook with the given cells. */
function notebook(cells: { cell_type: string; source: string[] }[]): string {
  return JSON.stringify({ cells });
}

const MARKDOWN_CELL = { cell_type: "markdown", source: ["# Title\n"] };
const CODE_CELL = { cell_type: "code", source: ["print(1)\n"] };

describe(JupyterNotebookService, () => {
  let service: JupyterNotebookService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [JupyterNotebookService],
    }).compile();

    service = await module.resolve(JupyterNotebookService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("parseNotebook", () => {
    it("reads a notebook's cells", () => {
      expect(
        service.parseNotebook(notebook([MARKDOWN_CELL, CODE_CELL])).cells,
      ).toHaveLength(2);
    });

    it("reports no cells for a malformed notebook rather than throwing", () => {
      expect(service.parseNotebook("not json at all").cells).toStrictEqual([]);
    });

    it("reports no cells when `cells` is not an array", () => {
      expect(
        service.parseNotebook(JSON.stringify({ cells: "nope" })).cells,
      ).toStrictEqual([]);
    });
  });

  describe("pairCells", () => {
    it("treats an unrecognized cell type as raw", () => {
      const raw = JSON.stringify({
        cells: [{ cell_type: "heading", source: ["hi"] }],
      });
      const { pairedCells } = service.pairCells({
        instanceNotebook: service.parseNotebook(raw),
        templateNotebook: service.parseNotebook(raw),
      });

      expect(pairedCells.map((cell) => cell.kind)).toStrictEqual(["raw"]);
    });

    it("accepts a cell whose source is already one string", () => {
      const inline = JSON.stringify({
        cells: [{ cell_type: "code", source: "print(1)\n" }],
      });
      const { pairedCells } = service.pairCells({
        instanceNotebook: service.parseNotebook(inline),
        templateNotebook: service.parseNotebook(inline),
      });

      expect(pairedCells[0]?.instanceSource).toBe("print(1)\n");
    });

    it("reads an empty source when the cell declares none", () => {
      const sourceless = JSON.stringify({ cells: [{ cell_type: "code" }] });
      const { pairedCells } = service.pairCells({
        instanceNotebook: service.parseNotebook(sourceless),
        templateNotebook: service.parseNotebook(sourceless),
      });

      expect(pairedCells[0]?.instanceSource).toBe("");
    });

    it("pairs cells of the same kind in order", () => {
      const { missingCells, pairedCells } = service.pairCells({
        instanceNotebook: service.parseNotebook(
          notebook([MARKDOWN_CELL, CODE_CELL]),
        ),
        templateNotebook: service.parseNotebook(
          notebook([MARKDOWN_CELL, CODE_CELL]),
        ),
      });

      expect(missingCells).toStrictEqual([]);
      expect(pairedCells.map((cell) => cell.kind)).toStrictEqual([
        "markdown",
        "code",
      ]);
    });

    it("reports a template cell the instance dropped", () => {
      const { missingCells } = service.pairCells({
        instanceNotebook: service.parseNotebook(notebook([MARKDOWN_CELL])),
        templateNotebook: service.parseNotebook(
          notebook([MARKDOWN_CELL, CODE_CELL]),
        ),
      });

      expect(missingCells).toHaveLength(1);
      expect(missingCells[0]?.kind).toBe("code");
    });

    it("allows an instance to add cells the template does not declare", () => {
      const { missingCells } = service.pairCells({
        instanceNotebook: service.parseNotebook(
          notebook([MARKDOWN_CELL, CODE_CELL, CODE_CELL]),
        ),
        templateNotebook: service.parseNotebook(notebook([MARKDOWN_CELL])),
      });

      expect(missingCells).toStrictEqual([]);
    });
  });
});
