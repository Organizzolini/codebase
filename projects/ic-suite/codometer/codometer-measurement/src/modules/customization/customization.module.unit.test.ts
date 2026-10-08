import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { CustomizationModule } from "./customization.module";
import { CustomizationService } from "./customization.service";

describe(CustomizationModule, () => {
  it("exports and provides CustomizationService", () => {
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      CustomizationModule,
    ) as undefined | unknown[];
    const providersMetadata = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      CustomizationModule,
    ) as undefined | unknown[];

    expect(exportsMetadata).toContain(CustomizationService);
    expect(providersMetadata).toContain(CustomizationService);
  });
});
