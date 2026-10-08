import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { NestjsModulesWorkspaceGraphModule } from "./nestjs-modules-workspace-graph.module";
import { NestjsModulesWorkspaceGraphService } from "./nestjs-modules-workspace-graph.service";

describe(NestjsModulesWorkspaceGraphModule, () => {
  it("exports and provides NestjsModulesWorkspaceGraphService", () => {
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      NestjsModulesWorkspaceGraphModule,
    ) as undefined | unknown[];
    const providersMetadata = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      NestjsModulesWorkspaceGraphModule,
    ) as undefined | unknown[];

    expect(exportsMetadata).toContain(NestjsModulesWorkspaceGraphService);
    expect(providersMetadata).toContain(NestjsModulesWorkspaceGraphService);
  });
});
