import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logging";

import { JsonModule } from "../json/json.module";
import { MarkdownModule } from "../markdown/markdown.module";
import { PythonModule } from "../python/python.module";

import { JupyterService } from "./jupyter.service";

/**
 * NestJS module that measures notebooks through the JSON, Python, and
 * markdown analyzers it composes.
 */
@Module({
  controllers: [],
  exports: [JupyterService],
  imports: [JsonModule, LoggerModule, MarkdownModule, PythonModule],
  providers: [JupyterService],
})
export class JupyterModule {}
