import { Test } from "@nestjs/testing";
import moment from "moment-timezone";
import { beforeAll, describe, expect, it } from "vitest";

import { CompoundPhaseService } from "./compound-phase.service";

describe(CompoundPhaseService, () => {
  let service: CompoundPhaseService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [CompoundPhaseService],
    }).compile();

    service = await module.resolve(CompoundPhaseService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("stamps dissolving at the first minute the pattern is gone", () => {
    const minute = moment.utc("2024-03-21T12:00:00.000Z");
    const result = service.determineCompoundPhaseFromSnapshots({
      checkPatternExists: (edges) => edges.length > 0,
      currentAspectBodies: [],
      currentMinute: minute,
      patternBodies: ["sun", "moon"],
      previousAspectBodies: [{ aspect: "conjunct", bodies: ["sun", "moon"] }],
    });

    expect(result?.phase).toBe("dissolving");
    expect(result?.eventMinute.toISOString()).toBe("2024-03-21T12:00:00.000Z");
  });
});
