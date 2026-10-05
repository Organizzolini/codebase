import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeService } from "../../code/code.service";
import { GraphService } from "../../graph/graph.service";
import { MatrixService } from "../../matrix/matrix.service";
import { SymmetryService } from "../../symmetry/symmetry.service";
import { TileService } from "../../tile/tile.service";

import { ConnectivityService } from "./connectivity.service";

// 🧪 Tests

/**
 * Drives `ConnectivityService` through matrix representation, so a case names
 * the Code it is about converted to Matrix: these counts are read off
 * a Matrix in production, and a fixture written any other way would be
 * asserting something the pipeline never computes.
 */
describe(ConnectivityService, () => {
  let codeService: CodeService;
  let matrixService: MatrixService;
  let service: ConnectivityService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ConnectivityService,
        CodeService,
        MatrixService,
        SymmetryService,
        TileService,
        GraphService,
      ],
    }).compile();

    codeService = await module.resolve(CodeService);
    matrixService = await module.resolve(MatrixService);
    service = await module.resolve(ConnectivityService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("connectivity", () => {
    it.each([
      {
        code: "00",
        columns: 2,
        expected: { components: 2, cycles: 0, freeEnds: 0 },
        rows: 1,
        shape: "two inked dots, joined to nothing and to each other by nothing",
      },
      {
        code: "3",
        columns: 1,
        expected: { components: 1, cycles: 1, freeEnds: 0 },
        rows: 1,
        shape:
          "a single column's eastward edge wrapping onto its own point, which is a loop in the repeat and a straight rule in the drawing",
      },
      {
        code: "cc",
        columns: 1,
        expected: { components: 1, cycles: 0, freeEnds: 2 },
        rows: 2,
        shape: "one vertical bar joining both rows of a one-column repeat",
      },
      {
        code: "56a9",
        columns: 2,
        expected: { components: 1, cycles: 1, freeEnds: 0 },
        rows: 2,
        shape:
          "the `zigzag` tile a `negative` drawing and a `parallel` serpentine both address to, whose ink closes through its own next repeat",
      },
      {
        code: "4488",
        columns: 2,
        expected: { components: 2, cycles: 0, freeEnds: 4 },
        rows: 2,
        shape:
          "the `bars` tile `branch`'s comb and `parallel`'s one-strand bundle both address to: two separate bars, each terminating at both ends",
      },
    ])("reads $shape as $expected", ({ code, columns, expected, rows }) => {
      const matrix = matrixService.fromCode(
        codeService.parse(code, rows, columns),
      );

      expect(service.connectivity(matrix)).toStrictEqual(expected);
    });

    it("reads an edge claimed by only one of its two ends, which no well-formed Code spells but the reader still admits", () => {
      const matrix = matrixService.fromCode(codeService.parse("20", 1, 2));

      expect(service.connectivity(matrix)).toStrictEqual({
        components: 1,
        cycles: 0,
        freeEnds: 2,
      });
    });

    it("handles empty matrices for connectivity, edges, and joinsEast", () => {
      expect(service.connectivity([])).toStrictEqual({
        components: 0,
        cycles: 0,
        freeEnds: 0,
      });
      expect(service.edges([], false)).toStrictEqual([]);
      expect(service.joinsEast([], 0, 0)).toBe(false);
      expect(service.joinsEast([[]], 0, 0)).toBe(false);
    });

    it("handles edges at matrix boundaries", () => {
      const matrix = matrixService.fromCode(codeService.parse("48", 2, 1));
      const edges = service.edges(matrix, false);

      expect(Array.isArray(edges)).toBe(true);

      const matrix3Row = matrixService.fromCode(codeService.parse("4c8", 3, 1));
      const edges3 = service.edges(matrix3Row, false);

      expect(Array.isArray(edges3)).toBe(true);
    });
  });
});
