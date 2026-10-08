import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { BoundariesModule } from "./boundaries.module";
import { BoundariesService } from "./boundaries.service";
import { BoundaryCyclesService } from "./boundary-cycles.service";
import { BoundaryReportService } from "./boundary-report.service";
import { BoundarySelectorService } from "./boundary-selector.service";

const SERVICES = [
  BoundariesService,
  BoundaryCyclesService,
  BoundaryReportService,
  BoundarySelectorService,
];

describe(BoundariesModule, () => {
  it.each(SERVICES)("exports and provides %s", (service) => {
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      BoundariesModule,
    ) as undefined | unknown[];
    const providersMetadata = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      BoundariesModule,
    ) as undefined | unknown[];

    expect(exportsMetadata).toContain(service);
    expect(providersMetadata).toContain(service);
  });
});
