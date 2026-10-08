import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { SqlModule } from "./sql.module";
import { SqlService } from "./sql.service";

describe(SqlModule, () => {
  it("exports and provides SqlService", () => {
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      SqlModule,
    ) as undefined | unknown[];
    const providersMetadata = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      SqlModule,
    ) as undefined | unknown[];

    expect(exportsMetadata).toContain(SqlService);
    expect(providersMetadata).toContain(SqlService);
  });
});
