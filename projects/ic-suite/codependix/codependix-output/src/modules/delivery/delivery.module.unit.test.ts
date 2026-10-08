import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { DeliveryModule } from "./delivery.module";
import { DeliveryService } from "./delivery.service";

describe(DeliveryModule, () => {
  it("exports and provides DeliveryService", () => {
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      DeliveryModule,
    ) as undefined | unknown[];
    const providersMetadata = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      DeliveryModule,
    ) as undefined | unknown[];

    expect(exportsMetadata).toContain(DeliveryService);
    expect(providersMetadata).toContain(DeliveryService);
  });
});
