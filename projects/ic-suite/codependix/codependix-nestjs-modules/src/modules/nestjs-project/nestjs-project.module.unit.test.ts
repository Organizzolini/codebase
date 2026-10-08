import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { LoggerModule } from "@codebase/logging";

import { NestjsProjectModule } from "./nestjs-project.module";
import { NestjsProjectService } from "./nestjs-project.service";

describe(NestjsProjectModule, () => {
  it("exports and provides NestjsProjectService", () => {
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      NestjsProjectModule,
    ) as undefined | unknown[];
    const providersMetadata = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      NestjsProjectModule,
    ) as undefined | unknown[];

    expect(exportsMetadata).toContain(NestjsProjectService);
    expect(providersMetadata).toContain(NestjsProjectService);
  });

  it("imports LoggerModule", () => {
    const importsMetadata = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      NestjsProjectModule,
    ) as undefined | unknown[];

    expect(importsMetadata).toContain(LoggerModule);
  });
});
