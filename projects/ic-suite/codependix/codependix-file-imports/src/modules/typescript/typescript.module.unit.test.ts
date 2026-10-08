import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { TypescriptModule } from "./typescript.module";
import { TypescriptService } from "./typescript.service";

describe(TypescriptModule, () => {
  it("exports and provides TypescriptService", () => {
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      TypescriptModule,
    ) as undefined | unknown[];
    const providersMetadata = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      TypescriptModule,
    ) as undefined | unknown[];

    expect(exportsMetadata).toContain(TypescriptService);
    expect(providersMetadata).toContain(TypescriptService);
  });
});
