import { Module } from "@nestjs/common";

import { CommentsModule } from "../comments/comments.module";
import { CssModule } from "../css/css.module";
import { HclModule } from "../hcl/hcl.module";
import { JsonModule } from "../json/json.module";
import { JupyterModule } from "../jupyter/jupyter.module";
import { MarkdownModule } from "../markdown/markdown.module";
import { PythonModule } from "../python/python.module";
import { ShellModule } from "../shell/shell.module";
import { SqlModule } from "../sql/sql.module";
import { TomlModule } from "../toml/toml.module";
import { TypescriptModule } from "../typescript/typescript.module";
import { YamlModule } from "../yaml/yaml.module";

import { LanguagesService } from "./languages.service";

/**
 * NestJS module that gathers every language analyzer behind one service.
 */
@Module({
  controllers: [],
  exports: [LanguagesService],
  imports: [
    CommentsModule,
    CssModule,
    HclModule,
    JsonModule,
    JupyterModule,
    MarkdownModule,
    PythonModule,
    ShellModule,
    SqlModule,
    TomlModule,
    TypescriptModule,
    YamlModule,
  ],
  providers: [LanguagesService],
})
export class LanguagesModule {}
