import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { TextModule } from "./text.module";
import { TextService } from "./text.service";

describe(TextModule, () => {
  it("exports and provides TextService", () => {
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      TextModule,
    ) as undefined | unknown[];
    const providersMetadata = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      TextModule,
    ) as undefined | unknown[];

    expect(exportsMetadata).toContain(TextService);
    expect(providersMetadata).toContain(TextService);
  });
});
