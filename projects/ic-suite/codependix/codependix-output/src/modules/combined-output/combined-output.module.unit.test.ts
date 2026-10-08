import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { CombinedOutputModule } from "./combined-output.module";
import { CombinedOutputService } from "./combined-output.service";

describe(CombinedOutputModule, () => {
  it("exports and provides CombinedOutputService", () => {
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      CombinedOutputModule,
    ) as undefined | unknown[];
    const providersMetadata = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      CombinedOutputModule,
    ) as undefined | unknown[];

    expect(exportsMetadata).toContain(CombinedOutputService);
    expect(providersMetadata).toContain(CombinedOutputService);
  });
});
