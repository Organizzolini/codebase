import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { RunnerModule } from "./runner.module";
import { RunnerService } from "./runner.service";

describe(RunnerModule, () => {
  it("exports and provides RunnerService", () => {
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      RunnerModule,
    ) as undefined | unknown[];
    const providersMetadata = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      RunnerModule,
    ) as undefined | unknown[];

    expect(exportsMetadata).toContain(RunnerService);
    expect(providersMetadata).toContain(RunnerService);
  });
});
