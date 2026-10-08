import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { InventoryModule } from "./inventory.module";
import { InventoryService } from "./inventory.service";

describe(InventoryModule, () => {
  it("exports and provides InventoryService", () => {
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      InventoryModule,
    ) as undefined | unknown[];
    const providersMetadata = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      InventoryModule,
    ) as undefined | unknown[];

    expect(exportsMetadata).toContain(InventoryService);
    expect(providersMetadata).toContain(InventoryService);
  });
});
