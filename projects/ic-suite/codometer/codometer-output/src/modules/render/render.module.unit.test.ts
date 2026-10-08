import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { RenderModule } from "./render.module";
import { RenderService } from "./render.service";

describe(RenderModule, () => {
  it("exports and provides RenderService", () => {
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      RenderModule,
    ) as undefined | unknown[];
    const providersMetadata = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      RenderModule,
    ) as undefined | unknown[];

    expect(exportsMetadata).toContain(RenderService);
    expect(providersMetadata).toContain(RenderService);
  });
});
