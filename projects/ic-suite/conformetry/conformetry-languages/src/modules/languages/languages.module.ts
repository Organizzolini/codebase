import { Module } from "@nestjs/common";

import { JsonModule } from "../json/json.module";
import { JupyterModule } from "../jupyter/jupyter.module";
import { MarkdownModule } from "../markdown/markdown.module";
import { PythonModule } from "../python/python.module";
import { TextModule } from "../text/text.module";
import { TypescriptModule } from "../typescript/typescript.module";

import { LanguagesService } from "./languages.service";

/**
 * The one module a host imports to get every Language.
 *
 * Wiring the Languages individually is still possible — each has its own
 * module — but a host almost always wants all of them, because the Fallback
 * makes the text Language a floor under every run rather than an option.
 */
@Module({
  controllers: [],
  exports: [
    JsonModule,
    JupyterModule,
    LanguagesService,
    MarkdownModule,
    PythonModule,
    TextModule,
    TypescriptModule,
  ],
  imports: [
    JsonModule,
    JupyterModule,
    MarkdownModule,
    PythonModule,
    TextModule,
    TypescriptModule,
  ],
  providers: [LanguagesService],
})
export class LanguagesModule {}
