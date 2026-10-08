import { Test } from "@nestjs/testing";
import moment from "moment-timezone";
import { beforeAll, describe, expect, it } from "vitest";

import { AspectEventFormattingService } from "./aspect-event-formatting.service";

describe(AspectEventFormattingService, () => {
  let service: AspectEventFormattingService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [AspectEventFormattingService],
    }).compile();

    service = await module.resolve(AspectEventFormattingService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("names multi-word bodies in start case for simple aspects", () => {
    const event = service.assembleSimpleAspectEvent({
      aspectCategory: "Specialty Aspect",
      aspectName: "quintile",
      aspectSymbol: "Q",
      body1: "lunar apogee",
      body2: "sun",
      log: () => undefined,
      phase: "forming",
      timestamp: moment.utc("2026-02-17T12:00:00.000Z"),
    });

    expect(event.description).toBe("Lunar Apogee forming quintile Sun");
    expect(event.categories).toContain("Lunar Apogee");
    expect(event.categories).not.toContain("Lunar apogee");
  });
});
