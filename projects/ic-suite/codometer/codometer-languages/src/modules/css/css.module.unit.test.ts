import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { CssModule } from "./css.module";
import { CssService } from "./css.service";

describe(CssModule, () => {
  it("exports and provides CssService", () => {
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      CssModule,
    ) as undefined | unknown[];
    const providersMetadata = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      CssModule,
    ) as undefined | unknown[];

    expect(exportsMetadata).toContain(CssService);
    expect(providersMetadata).toContain(CssService);
  });
});
