import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { YamlModule } from "./yaml.module";
import { YamlService } from "./yaml.service";

describe(YamlModule, () => {
  it("exports and provides YamlService", () => {
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      YamlModule,
    ) as undefined | unknown[];
    const providersMetadata = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      YamlModule,
    ) as undefined | unknown[];

    expect(exportsMetadata).toContain(YamlService);
    expect(providersMetadata).toContain(YamlService);
  });
});
