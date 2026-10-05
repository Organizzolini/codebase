import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { LoggerService } from "@codebase/logger";

import { AspectEventFormattingService } from "../aspects/aspect-event-formatting.service";
import { AspectsUtilitiesService } from "../aspects/aspects-utilities.service";
import { EphemerisService } from "../ephemeris/ephemeris.service";

import { SpecialtyAspectsEventService } from "./specialty-aspects-event.service";

describe(SpecialtyAspectsEventService, () => {
  let service: SpecialtyAspectsEventService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SpecialtyAspectsEventService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        {
          provide: AspectsUtilitiesService,
          useValue: createMock<AspectsUtilitiesService>(),
        },
        {
          provide: AspectEventFormattingService,
          useValue: createMock<AspectEventFormattingService>(),
        },
        { provide: EphemerisService, useValue: createMock<EphemerisService>() },
      ],
    }).compile();

    service = await module.resolve(SpecialtyAspectsEventService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });
});
