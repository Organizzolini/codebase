import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { JsonModule } from "./json.module";
import { JsonService } from "./json.service";

describe(JsonModule, () => {
  it("exports and provides JsonService", () => {
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      JsonModule,
    ) as undefined | unknown[];
    const providersMetadata = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      JsonModule,
    ) as undefined | unknown[];

    expect(exportsMetadata).toContain(JsonService);
    expect(providersMetadata).toContain(JsonService);
  });
});
