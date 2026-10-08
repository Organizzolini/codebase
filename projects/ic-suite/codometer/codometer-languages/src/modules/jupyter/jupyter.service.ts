import { readFileSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logging";

import { JsonService } from "../json/json.service";
import { MarkdownService } from "../markdown/markdown.service";
import { PythonService } from "../python/python.service";

import {
  CODE_CELL_TYPE,
  EMPTY_JUPYTER_RESULT,
  MARKDOWN_CELL_TYPE,
  notebookCellSchema,
  notebookDocumentSchema,
} from "./jupyter.constants";

import type { MarkdownResult } from "../markdown/markdown.types";
import type {
  AnalyzeJupyterArguments,
  JupyterResult,
  NotebookParts,
} from "./jupyter.types";
import type { z } from "zod";

/**
 * Measures Jupyter notebooks by handing their parts to the other analyzers.
 *
 * A notebook is three languages in one file, and this service owns none of
 * them: the document is JSON, its code cells are Python, and its markdown
 * cells are prose, so each is counted by the analyzer that already knows how.
 * What is left — cells, outputs, execution — belongs to the notebook itself
 * and is counted here.
 */
@Injectable()
export class JupyterService {
  // 🏗 Dependency Injection

  constructor(
    private readonly jsonService: JsonService,
    private readonly markdownService: MarkdownService,
    private readonly pythonService: PythonService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(JupyterService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Record one cell against the running notebook totals. */
  private collectCell(
    cell: z.infer<typeof notebookCellSchema>,
    parts: NotebookParts,
  ): void {
    parts.cells++;
    parts.outputs += cell.outputs?.length ?? 0;

    if (cell.cell_type === CODE_CELL_TYPE) {
      parts.codeCells++;
      parts.codeSources.push(this.readSource(cell.source));

      // Null rather than absent is how nbformat spells "never run", and how
      // `nbstripout` leaves every cell it touches.
      if (typeof cell.execution_count === "number") {
        parts.executedCells++;
      }

      return;
    }

    if (cell.cell_type === MARKDOWN_CELL_TYPE) {
      parts.markdownCells++;
      parts.markdownSources.push(this.readSource(cell.source));

      return;
    }

    parts.rawCells++;
  }

  /** Read every notebook, collecting cell counts and cell sources. */
  private collectParts(args: AnalyzeJupyterArguments): NotebookParts {
    const parts: NotebookParts = {
      cells: 0,
      codeCells: 0,
      codeSources: [],
      executedCells: 0,
      files: 0,
      markdownCells: 0,
      markdownSources: [],
      outputs: 0,
      rawCells: 0,
    };

    for (const filePath of args.notebookFiles) {
      const cells = this.readNotebook(filePath, args.workingDirectory);

      if (cells === undefined) {
        continue;
      }

      parts.files++;

      for (const cell of cells) {
        this.collectCell(cell, parts);
      }
    }

    return parts;
  }

  /** Sum every heading level the markdown analyzer reports. */
  private countHeadings(markdownResult: MarkdownResult): number {
    return (
      markdownResult.headingLevel1 +
      markdownResult.headingLevel2 +
      markdownResult.headingLevel3 +
      markdownResult.headingLevel4 +
      markdownResult.headingLevel5 +
      markdownResult.headingLevel6
    );
  }

  /** Read and validate one notebook, returning its cells. */
  private readNotebook(
    filePath: string,
    workingDirectory: string,
  ): undefined | z.infer<typeof notebookCellSchema>[] {
    try {
      const content = readFileSync(
        path.resolve(workingDirectory, filePath),
        "utf8",
      );
      const document = notebookDocumentSchema.parse(JSON.parse(content));

      return document.cells ?? [];
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn("📓 Skipped notebook analysis", undefined, {
        filePath,
        reason: message,
      });

      return undefined;
    }
  }

  /** Join a cell's source, which nbformat writes as a string or line array. */
  private readSource(source: string | string[] | undefined): string {
    if (typeof source === "string") {
      return source;
    }

    return source?.join("") ?? "";
  }

  // 🌎 Public Methods

  /** Analyze the given notebooks, resolved against the directory. */
  analyze(args: AnalyzeJupyterArguments): JupyterResult {
    if (args.notebookFiles.length === 0) {
      return { ...EMPTY_JUPYTER_RESULT };
    }

    const parts = this.collectParts(args);
    // The notebook document itself, measured as the JSON it is on disk.
    const jsonResult = this.jsonService.analyze({
      jsonFiles: args.notebookFiles,
      workingDirectory: args.workingDirectory,
    });
    const pythonResult = this.pythonService.analyzeContents({
      command: args.pythonCommand,
      contents: parts.codeSources,
      workingDirectory: args.workingDirectory,
    });
    const markdownResult = this.markdownService.analyzeContents(
      parts.markdownSources,
    );

    return {
      cells: parts.cells,
      classes: pythonResult.classes,
      codeBlocks: markdownResult.codeBlocks,
      codeCells: parts.codeCells,
      codeLines: pythonResult.lines,
      decorators: pythonResult.decorators,
      executedCells: parts.executedCells,
      files: parts.files,
      functions: pythonResult.functions,
      headings: this.countHeadings(markdownResult),
      images: markdownResult.images,
      imports: pythonResult.imports,
      links: markdownResult.links,
      markdownCells: parts.markdownCells,
      markdownLines: markdownResult.lines,
      maxDepth: jsonResult.maxDepth,
      outputs: parts.outputs,
      properties: jsonResult.properties,
      rawCells: parts.rawCells,
      totalNodes: jsonResult.totalNodes,
    };
  }
}
