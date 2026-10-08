import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { DocumentsModule } from "./documents.module";
import { DocumentsService } from "./documents.service";

describe(DocumentsModule, () => {
  it("exports and provides DocumentsService", () => {
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      DocumentsModule,
    ) as undefined | unknown[];
    const providersMetadata = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      DocumentsModule,
    ) as undefined | unknown[];

    expect(exportsMetadata).toContain(DocumentsService);
    expect(providersMetadata).toContain(DocumentsService);
  });
});
