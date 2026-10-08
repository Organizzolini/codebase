import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { ReportingModule } from "./reporting.module";
import { ReportingService } from "./reporting.service";

describe(ReportingModule, () => {
  it("exports and provides ReportingService", () => {
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      ReportingModule,
    ) as undefined | unknown[];
    const providersMetadata = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      ReportingModule,
    ) as undefined | unknown[];

    expect(exportsMetadata).toContain(ReportingService);
    expect(providersMetadata).toContain(ReportingService);
  });
});
