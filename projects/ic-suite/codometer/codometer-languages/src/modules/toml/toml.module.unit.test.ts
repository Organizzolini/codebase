import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { TomlModule } from "./toml.module";
import { TomlService } from "./toml.service";

describe(TomlModule, () => {
  it("exports and provides TomlService", () => {
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      TomlModule,
    ) as undefined | unknown[];
    const providersMetadata = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      TomlModule,
    ) as undefined | unknown[];

    expect(exportsMetadata).toContain(TomlService);
    expect(providersMetadata).toContain(TomlService);
  });
});
