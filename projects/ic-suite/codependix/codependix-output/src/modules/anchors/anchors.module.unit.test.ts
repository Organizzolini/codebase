import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { AnchorsModule } from "./anchors.module";
import { AnchorsService } from "./anchors.service";

describe(AnchorsModule, () => {
  it("exports and provides AnchorsService", () => {
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      AnchorsModule,
    ) as undefined | unknown[];
    const providersMetadata = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      AnchorsModule,
    ) as undefined | unknown[];

    expect(exportsMetadata).toContain(AnchorsService);
    expect(providersMetadata).toContain(AnchorsService);
  });
});
