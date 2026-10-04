import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { LoggerModule } from "@codebase/logging";

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

  // Each published package bundles its own copy of `@codebase/logging`, so
  // the global `LoggerModule` a host imports provides a different
  // `LoggerService` class than the one `ReportingService` injects.
  it("imports the LoggerModule its own LoggerService comes from", () => {
    const importsMetadata = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      ReportingModule,
    ) as undefined | unknown[];

    expect(importsMetadata).toContain(LoggerModule);
  });
});
