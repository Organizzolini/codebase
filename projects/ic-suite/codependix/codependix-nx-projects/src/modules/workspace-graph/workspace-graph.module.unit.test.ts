import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { WorkspaceGraphModule } from "./workspace-graph.module";
import { WorkspaceGraphService } from "./workspace-graph.service";

describe(WorkspaceGraphModule, () => {
  it("exports and provides WorkspaceGraphService", () => {
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      WorkspaceGraphModule,
    ) as undefined | unknown[];
    const providersMetadata = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      WorkspaceGraphModule,
    ) as undefined | unknown[];

    expect(exportsMetadata).toContain(WorkspaceGraphService);
    expect(providersMetadata).toContain(WorkspaceGraphService);
  });
});
