import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { MarkdownModule } from "./markdown.module";
import { MarkdownService } from "./markdown.service";

describe(MarkdownModule, () => {
  it("exports and provides MarkdownService", () => {
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      MarkdownModule,
    ) as undefined | unknown[];
    const providersMetadata = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      MarkdownModule,
    ) as undefined | unknown[];

    expect(exportsMetadata).toContain(MarkdownService);
    expect(providersMetadata).toContain(MarkdownService);
  });
});
