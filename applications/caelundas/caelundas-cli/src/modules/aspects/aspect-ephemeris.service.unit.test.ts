import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { EphemerisService } from "../ephemeris/ephemeris.service";

import { AspectEphemerisService } from "./aspect-ephemeris.service";

describe(AspectEphemerisService, () => {
  let service: AspectEphemerisService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AspectEphemerisService,
        {
          provide: EphemerisService,
          useValue: createMock<EphemerisService>(),
        },
      ],
    }).compile();

    service = await module.resolve(AspectEphemerisService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });
});
