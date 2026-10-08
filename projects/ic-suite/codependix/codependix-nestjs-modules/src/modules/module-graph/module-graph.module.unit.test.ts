import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { ModuleGraphModule } from "./module-graph.module";
import { ModuleGraphService } from "./module-graph.service";

describe(ModuleGraphModule, () => {
  it("exports and provides ModuleGraphService", () => {
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      ModuleGraphModule,
    ) as undefined | unknown[];
    const providersMetadata = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      ModuleGraphModule,
    ) as undefined | unknown[];

    expect(exportsMetadata).toContain(ModuleGraphService);
    expect(providersMetadata).toContain(ModuleGraphService);
  });
});
