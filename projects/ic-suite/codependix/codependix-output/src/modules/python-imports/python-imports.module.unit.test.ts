import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { PythonImportsModule } from "./python-imports.module";
import { PythonImportsService } from "./python-imports.service";

describe(PythonImportsModule, () => {
  it("exports and provides PythonImportsService", () => {
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      PythonImportsModule,
    ) as undefined | unknown[];
    const providersMetadata = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      PythonImportsModule,
    ) as undefined | unknown[];

    expect(exportsMetadata).toContain(PythonImportsService);
    expect(providersMetadata).toContain(PythonImportsService);
  });
});
