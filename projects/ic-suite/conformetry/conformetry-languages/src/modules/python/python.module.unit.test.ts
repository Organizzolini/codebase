import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { PythonModule } from "./python.module";
import { PythonService } from "./python.service";

describe(PythonModule, () => {
  it("exports and provides PythonService", () => {
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      PythonModule,
    ) as undefined | unknown[];
    const providersMetadata = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      PythonModule,
    ) as undefined | unknown[];

    expect(exportsMetadata).toContain(PythonService);
    expect(providersMetadata).toContain(PythonService);
  });
});
