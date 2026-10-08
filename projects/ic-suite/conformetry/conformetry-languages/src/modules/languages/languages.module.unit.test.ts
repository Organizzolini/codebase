import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { JsonModule } from "../json/json.module";
import { JupyterModule } from "../jupyter/jupyter.module";
import { MarkdownModule } from "../markdown/markdown.module";
import { PythonModule } from "../python/python.module";
import { TextModule } from "../text/text.module";
import { TypescriptModule } from "../typescript/typescript.module";

import { LanguagesModule } from "./languages.module";
import { LanguagesService } from "./languages.service";

describe(LanguagesModule, () => {
  it("exports and provides LanguagesService", () => {
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      LanguagesModule,
    ) as undefined | unknown[];
    const providersMetadata = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      LanguagesModule,
    ) as undefined | unknown[];

    expect(exportsMetadata).toContain(LanguagesService);
    expect(providersMetadata).toContain(LanguagesService);
  });

  it("imports and re-exports every language module", () => {
    const importsMetadata = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      LanguagesModule,
    ) as undefined | unknown[];
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      LanguagesModule,
    ) as undefined | unknown[];

    for (const languageModule of [
      JsonModule,
      JupyterModule,
      MarkdownModule,
      PythonModule,
      TextModule,
      TypescriptModule,
    ]) {
      expect(importsMetadata).toContain(languageModule);
      expect(exportsMetadata).toContain(languageModule);
    }
  });
});
