import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { BoundaryCheckModule } from "./boundary-check.module";
import { BoundaryCheckService } from "./boundary-check.service";
import { BoundaryGraphService } from "./boundary-graph.service";

const SERVICES = [BoundaryCheckService, BoundaryGraphService];

describe(BoundaryCheckModule, () => {
  it.each(SERVICES)("exports and provides %s", (service) => {
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      BoundaryCheckModule,
    ) as undefined | unknown[];
    const providersMetadata = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      BoundaryCheckModule,
    ) as undefined | unknown[];

    expect(exportsMetadata).toContain(service);
    expect(providersMetadata).toContain(service);
  });
});
