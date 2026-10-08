import { Test } from "@nestjs/testing";
import { describe, expect, it } from "vitest";

import { PublishablePackagesCommand } from "./publishable-packages.command";
import { PublishablePackagesModule } from "./publishable-packages.module";
import { PublishablePackagesService } from "./publishable-packages.service";

describe(PublishablePackagesModule, () => {
  it("compiles and exports providers", async () => {
    expect.hasAssertions();

    const moduleRef = await Test.createTestingModule({
      imports: [PublishablePackagesModule],
    }).compile();

    expect(moduleRef.get(PublishablePackagesCommand)).toBeInstanceOf(
      PublishablePackagesCommand,
    );
    expect(moduleRef.get(PublishablePackagesService)).toBeInstanceOf(
      PublishablePackagesService,
    );
  });
});
