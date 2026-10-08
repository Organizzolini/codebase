import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { SizeModule } from "./size.module";
import { SizeService } from "./size.service";

describe(SizeModule, () => {
  it("exports and provides SizeService", () => {
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      SizeModule,
    ) as undefined | unknown[];
    const providersMetadata = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      SizeModule,
    ) as undefined | unknown[];

    expect(exportsMetadata).toContain(SizeService);
    expect(providersMetadata).toContain(SizeService);
  });
});
