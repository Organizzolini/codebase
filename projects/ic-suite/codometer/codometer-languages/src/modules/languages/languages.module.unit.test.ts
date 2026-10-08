import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { LanguagesModule } from "./languages.module";
import { LanguagesService } from "./languages.service";

describe(LanguagesModule, () => {
  it("exports and provides LanguagesService", () => {
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      LanguagesModule,
    ) as undefined | unknown[];
    const providersMetadata = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      LanguagesModule,
    ) as undefined | unknown[];

    expect(exportsMetadata).toContain(LanguagesService);
    expect(providersMetadata).toContain(LanguagesService);
  });
});
