import { Module } from "@nestjs/common";

import { JsonModule } from "../json/json.module";
import { MarkdownModule } from "../markdown/markdown.module";
import { PythonModule } from "../python/python.module";

import { JupyterNotebookService } from "./jupyter-notebook.service";
import { JupyterService } from "./jupyter.service";

/**
 * Provides the Jupyter notebook validator.
 *
 * Composes the JSON, markdown, and Python validators rather than
 * reimplementing any of them — a notebook is all three formats at once.
 */
@Module({
  controllers: [],
  exports: [JupyterService],
  imports: [JsonModule, MarkdownModule, PythonModule],
  providers: [JupyterNotebookService, JupyterService],
})
export class JupyterModule {}
