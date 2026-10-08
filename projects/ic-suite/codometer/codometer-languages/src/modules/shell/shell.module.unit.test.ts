import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { ShellModule } from "./shell.module";
import { ShellService } from "./shell.service";

describe(ShellModule, () => {
  it("exports and provides ShellService", () => {
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      ShellModule,
    ) as undefined | unknown[];
    const providersMetadata = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      ShellModule,
    ) as undefined | unknown[];

    expect(exportsMetadata).toContain(ShellService);
    expect(providersMetadata).toContain(ShellService);
  });
});
