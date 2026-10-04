import { Module } from "@nestjs/common";

import { {{namePascalCase}}Loader } from "./{{nameKebabCase}}.loader";

/**
 * TODO: Document the {{nameCamelCase}} dataloader module.
 */
@Module({
  exports: [{{namePascalCase}}Loader],
  imports: [],
  providers: [{{namePascalCase}}Loader],
})
export class {{namePascalCase}}Module {}
