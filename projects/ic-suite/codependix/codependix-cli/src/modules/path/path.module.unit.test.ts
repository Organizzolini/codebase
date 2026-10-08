import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { PathCommand } from "./path.command";
import { PathModule } from "./path.module";

describe(PathModule, () => {
  it("exports and provides the command", () => {
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      PathModule,
    ) as undefined | unknown[];
    const providersMetadata = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      PathModule,
    ) as undefined | unknown[];

    expect(exportsMetadata).toContain(PathCommand);
    expect(providersMetadata).toContain(PathCommand);
  });
});
