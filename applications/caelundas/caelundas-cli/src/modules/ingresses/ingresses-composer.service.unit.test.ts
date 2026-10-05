import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { LoggerService } from "@codebase/logger";

import { EphemerisService } from "../ephemeris/ephemeris.service";

import { IngressesComposerService } from "./ingresses-composer.service";

describe(IngressesComposerService, () => {
  let service: IngressesComposerService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        IngressesComposerService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        { provide: EphemerisService, useValue: createMock<EphemerisService>() },
      ],
    }).compile();

    service = await module.resolve(IngressesComposerService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });
});
