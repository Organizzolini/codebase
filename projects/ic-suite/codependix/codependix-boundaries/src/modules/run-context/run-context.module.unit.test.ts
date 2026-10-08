import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { RunContextModule } from "./run-context.module";
import { RunContextService } from "./run-context.service";

describe(RunContextModule, () => {
  it("exports and provides RunContextService", () => {
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      RunContextModule,
    ) as undefined | unknown[];
    const providersMetadata = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      RunContextModule,
    ) as undefined | unknown[];

    expect(exportsMetadata).toContain(RunContextService);
    expect(providersMetadata).toContain(RunContextService);
  });
});
