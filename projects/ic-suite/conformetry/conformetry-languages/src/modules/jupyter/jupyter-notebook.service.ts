import { Injectable } from "@nestjs/common";
import { parse } from "jsonc-parser";

import type {
  NotebookCell,
  NotebookCellKind,
  PairedCells,
  ParsedNotebook,
} from "./jupyter.types";

/**
 * Reads the `.ipynb` format into something comparable.
 *
 * A notebook is JSON, but its meaning lives in the cells: markdown prose and
 * Python code stored as line arrays. This service turns that back into text so
 * the markdown and Python validators can work on it unchanged.
 */
@Injectable()
export class JupyterNotebookService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Buckets each cell's text by kind, preserving notebook order. */
  private groupSourcesByKind(
    cells: NotebookCell[],
  ): Map<NotebookCellKind, string[]> {
    const sourcesByKind = new Map<NotebookCellKind, string[]>();

    for (const cell of cells) {
      const kind = this.readCellKind(cell);
      const sources = sourcesByKind.get(kind) ?? [];

      sources.push(this.readCellSource(cell));
      sourcesByKind.set(kind, sources);
    }

    return sourcesByKind;
  }

  /** Narrows a cell's declared kind, defaulting to raw. */
  private readCellKind(cell: NotebookCell): NotebookCellKind {
    if (cell.cell_type === "code" || cell.cell_type === "markdown") {
      return cell.cell_type;
    }

    return "raw";
  }

  /** Joins a cell's `source` line array back into text. */
  private readCellSource(cell: NotebookCell): string {
    if (typeof cell.source === "string") {
      return cell.source;
    }

    const source: unknown = cell.source;

    if (!Array.isArray(source)) {
      return "";
    }

    const lines: unknown[] = source;

    return lines.filter((line) => typeof line === "string").join("");
  }

  // 🌎 Public Methods

  /**
   * Pairs template cells with instance cells of the same kind, in order.
   *
   * Cells are positional — a notebook has no cell identifiers — so the nth
   * markdown cell is compared with the nth markdown cell. An instance may add
   * cells at the end; it may not drop one the template declares.
   */
  public pairCells(args: {
    instanceNotebook: ParsedNotebook;
    templateNotebook: ParsedNotebook;
  }): { missingCells: PairedCells[]; pairedCells: PairedCells[] } {
    const missingCells: PairedCells[] = [];
    const pairedCells: PairedCells[] = [];
    const remainingByKind = this.groupSourcesByKind(
      args.instanceNotebook.cells,
    );
    const consumedByKind = new Map<NotebookCellKind, number>();

    for (const [index, templateCell] of args.templateNotebook.cells.entries()) {
      const kind = this.readCellKind(templateCell);
      const consumed = consumedByKind.get(kind) ?? 0;
      const instanceSource = remainingByKind.get(kind)?.[consumed];
      const pairing = {
        index,
        instanceSource: instanceSource ?? "",
        kind,
        templateSource: this.readCellSource(templateCell),
      };

      consumedByKind.set(kind, consumed + 1);

      if (instanceSource === undefined) {
        missingCells.push(pairing);
      } else {
        pairedCells.push(pairing);
      }
    }

    return { missingCells, pairedCells };
  }

  /**
   * Parses notebook JSON, tolerating a malformed file by reporting no cells.
   *
   * A notebook that will not parse is reported by the structural pass, so
   * throwing here would only duplicate that as a crash.
   */
  public parseNotebook(content: string): ParsedNotebook {
    const parsed: unknown = parse(content);

    if (typeof parsed !== "object" || parsed === null) {
      return { cells: [] };
    }

    const cells = (parsed as { cells?: unknown }).cells;

    if (!Array.isArray(cells)) {
      return { cells: [] };
    }

    const candidates: unknown[] = cells;

    return {
      cells: candidates.filter((cell): cell is NotebookCell => {
        return typeof cell === "object" && cell !== null;
      }),
    };
  }
}
