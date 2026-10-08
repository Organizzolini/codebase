import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { FilesModule } from "./files.module";
import { FilesService } from "./files.service";

describe(FilesModule, () => {
  it("exports and provides FilesService", () => {
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      FilesModule,
    ) as undefined | unknown[];
    const providersMetadata = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      FilesModule,
    ) as undefined | unknown[];

    expect(exportsMetadata).toContain(FilesService);
    expect(providersMetadata).toContain(FilesService);
  });
});
