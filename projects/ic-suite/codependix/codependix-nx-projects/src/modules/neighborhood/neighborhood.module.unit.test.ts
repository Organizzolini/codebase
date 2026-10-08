import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { NeighborhoodModule } from "./neighborhood.module";
import { NeighborhoodService } from "./neighborhood.service";

describe(NeighborhoodModule, () => {
  it("exports and provides NeighborhoodService", () => {
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      NeighborhoodModule,
    ) as undefined | unknown[];
    const providersMetadata = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      NeighborhoodModule,
    ) as undefined | unknown[];

    expect(exportsMetadata).toContain(NeighborhoodService);
    expect(providersMetadata).toContain(NeighborhoodService);
  });
});
