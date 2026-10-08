import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { JupyterModule } from "./jupyter.module";
import { JupyterService } from "./jupyter.service";

describe(JupyterModule, () => {
  it("exports and provides JupyterService", () => {
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      JupyterModule,
    ) as undefined | unknown[];
    const providersMetadata = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      JupyterModule,
    ) as undefined | unknown[];

    expect(exportsMetadata).toContain(JupyterService);
    expect(providersMetadata).toContain(JupyterService);
  });
});
