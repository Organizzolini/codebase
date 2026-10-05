import { describe, expect, it } from "vitest";

import { LoggerModule } from "@codebase/logging";

import { CatalogManifestsCommand } from "./catalog-manifests.command";
import { CatalogManifestsModule } from "./catalog-manifests.module";
import { CatalogManifestsService } from "./catalog-manifests.service";

describe(CatalogManifestsModule, () => {
  it("registers expected imports and providers", () => {
    expect.hasAssertions();

    const imports = Reflect.getMetadata("imports", CatalogManifestsModule) as
      | undefined
      | unknown[];
    const providers = Reflect.getMetadata(
      "providers",
      CatalogManifestsModule,
    ) as undefined | unknown[];

    expect(imports).toContain(LoggerModule);
    expect(providers).toContain(CatalogManifestsCommand);
    expect(providers).toContain(CatalogManifestsService);
  });
});
