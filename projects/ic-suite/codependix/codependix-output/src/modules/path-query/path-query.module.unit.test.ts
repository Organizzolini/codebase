import { Test } from "@nestjs/testing";
import { describe, expect, it } from "vitest";

import { PathQueryModule } from "./path-query.module";
import { PathQueryService } from "./path-query.service";

describe(PathQueryModule, () => {
  it("compiles the module and resolves its providers", async () => {
    const module = await Test.createTestingModule({
      imports: [PathQueryModule],
    }).compile();

    expect(module.get(PathQueryService)).toBeInstanceOf(PathQueryService);
  });
});
