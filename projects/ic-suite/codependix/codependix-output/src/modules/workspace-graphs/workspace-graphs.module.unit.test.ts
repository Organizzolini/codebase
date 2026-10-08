import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { WorkspaceGraphsModule } from "./workspace-graphs.module";
import { WorkspaceGraphsService } from "./workspace-graphs.service";

describe(WorkspaceGraphsModule, () => {
  it("exports and provides WorkspaceGraphsService", () => {
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      WorkspaceGraphsModule,
    ) as undefined | unknown[];
    const providersMetadata = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      WorkspaceGraphsModule,
    ) as undefined | unknown[];

    expect(exportsMetadata).toContain(WorkspaceGraphsService);
    expect(providersMetadata).toContain(WorkspaceGraphsService);
  });
});
