import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { ChangesModule } from "./changes.module";
import { ChangesService } from "./changes.service";

describe(ChangesModule, () => {
  it("exports and provides ChangesService", () => {
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      ChangesModule,
    ) as undefined | unknown[];
    const providersMetadata = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      ChangesModule,
    ) as undefined | unknown[];

    expect(exportsMetadata).toContain(ChangesService);
    expect(providersMetadata).toContain(ChangesService);
  });
});
