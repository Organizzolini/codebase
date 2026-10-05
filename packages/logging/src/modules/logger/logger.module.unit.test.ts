import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { LoggerModule } from "./logger.module";
import { LoggerService } from "./logger.service";

describe(LoggerModule, () => {
  it("exports and provides LoggerService", () => {
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      LoggerModule,
    ) as undefined | unknown[];
    const providersMetadata = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      LoggerModule,
    ) as undefined | unknown[];

    expect(exportsMetadata).toContain(LoggerService);
    expect(providersMetadata).toContain(LoggerService);
  });
});
