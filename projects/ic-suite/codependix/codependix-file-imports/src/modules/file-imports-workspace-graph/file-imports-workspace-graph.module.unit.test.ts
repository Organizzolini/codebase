import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { FileImportsWorkspaceGraphModule } from "./file-imports-workspace-graph.module";
import { FileImportsWorkspaceGraphService } from "./file-imports-workspace-graph.service";

describe(FileImportsWorkspaceGraphModule, () => {
  it("exports and provides FileImportsWorkspaceGraphService", () => {
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      FileImportsWorkspaceGraphModule,
    ) as undefined | unknown[];
    const providersMetadata = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      FileImportsWorkspaceGraphModule,
    ) as undefined | unknown[];

    expect(exportsMetadata).toContain(FileImportsWorkspaceGraphService);
    expect(providersMetadata).toContain(FileImportsWorkspaceGraphService);
  });
});
