import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { LoggerModule } from "@codebase/logging";

import { GraphRunModule } from "./graph-run.module";
import { GraphRunService } from "./graph-run.service";

describe(GraphRunModule, () => {
  it("exports and provides GraphRunService", () => {
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      GraphRunModule,
    ) as undefined | unknown[];
    const providersMetadata = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      GraphRunModule,
    ) as undefined | unknown[];

    expect(exportsMetadata).toContain(GraphRunService);
    expect(providersMetadata).toContain(GraphRunService);
  });

  // Each published package bundles its own copy of `@codebase/logging`, so
  // the global `LoggerModule` a host imports provides a different
  // `LoggerService` class than the one `GraphRunService` injects.
  it("imports the LoggerModule its own LoggerService comes from", () => {
    const importsMetadata = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      GraphRunModule,
    ) as undefined | unknown[];

    expect(importsMetadata).toContain(LoggerModule);
  });
});
