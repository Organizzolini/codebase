import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { MapCommand } from "./map.command";
import { MapModule } from "./map.module";

describe(MapModule, () => {
  it("exports and provides the command", () => {
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      MapModule,
    ) as undefined | unknown[];
    const providersMetadata = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      MapModule,
    ) as undefined | unknown[];

    expect(exportsMetadata).toContain(MapCommand);
    expect(providersMetadata).toContain(MapCommand);
  });
});
