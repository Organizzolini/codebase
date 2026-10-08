import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { HclModule } from "./hcl.module";
import { HclService } from "./hcl.service";

describe(HclModule, () => {
  it("exports and provides HclService", () => {
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      HclModule,
    ) as undefined | unknown[];
    const providersMetadata = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      HclModule,
    ) as undefined | unknown[];

    expect(exportsMetadata).toContain(HclService);
    expect(providersMetadata).toContain(HclService);
  });
});
