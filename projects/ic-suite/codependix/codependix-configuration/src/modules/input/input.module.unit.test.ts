import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { InputModule } from "./input.module";
import { InputService } from "./input.service";

describe(InputModule, () => {
  it("exports and provides InputService", () => {
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      InputModule,
    ) as undefined | unknown[];
    const providersMetadata = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      InputModule,
    ) as undefined | unknown[];

    expect(exportsMetadata).toContain(InputService);
    expect(providersMetadata).toContain(InputService);
  });
});
