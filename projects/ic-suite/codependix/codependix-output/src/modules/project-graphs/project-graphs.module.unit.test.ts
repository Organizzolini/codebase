import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { ProjectGraphsModule } from "./project-graphs.module";
import { ProjectGraphsService } from "./project-graphs.service";

describe(ProjectGraphsModule, () => {
  it("exports and provides ProjectGraphsService", () => {
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      ProjectGraphsModule,
    ) as undefined | unknown[];
    const providersMetadata = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      ProjectGraphsModule,
    ) as undefined | unknown[];

    expect(exportsMetadata).toContain(ProjectGraphsService);
    expect(providersMetadata).toContain(ProjectGraphsService);
  });
});
