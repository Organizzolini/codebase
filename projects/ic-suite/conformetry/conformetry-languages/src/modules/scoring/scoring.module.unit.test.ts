import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { ScoringModule } from "./scoring.module";
import { ScoringService } from "./scoring.service";

describe(ScoringModule, () => {
  it("exports and provides ScoringService", () => {
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      ScoringModule,
    ) as undefined | unknown[];
    const providersMetadata = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      ScoringModule,
    ) as undefined | unknown[];

    expect(exportsMetadata).toContain(ScoringService);
    expect(providersMetadata).toContain(ScoringService);
  });
});
