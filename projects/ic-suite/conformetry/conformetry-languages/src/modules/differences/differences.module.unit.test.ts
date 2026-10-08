import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { DifferencesModule } from "./differences.module";
import { DifferencesService } from "./differences.service";

describe(DifferencesModule, () => {
  it("exports and provides DifferencesService", () => {
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      DifferencesModule,
    ) as undefined | unknown[];
    const providersMetadata = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      DifferencesModule,
    ) as undefined | unknown[];

    expect(exportsMetadata).toContain(DifferencesService);
    expect(providersMetadata).toContain(DifferencesService);
  });
});
