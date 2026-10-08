import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { ScoringService } from "./scoring.service";

describe(ScoringService, () => {
  let service: ScoringService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [ScoringService],
    }).compile();

    service = await module.resolve(ScoringService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("sumWeights", () => {
    it("counts a finding with no weight as one", () => {
      expect(service.sumWeights([{}, {}])).toBe(2);
    });

    it("counts a finding standing in for a subtree as its whole subtree", () => {
      expect(service.sumWeights([{ weight: 38 }, {}])).toBe(39);
    });

    it("counts nothing for no findings", () => {
      expect(service.sumWeights([])).toBe(0);
    });
  });

  describe("calculateScore", () => {
    it("returns the share of requirements honoured", () => {
      expect(service.calculateScore({ failedWeight: 1, totalWeight: 4 })).toBe(
        0.75,
      );
    });

    it("scores a fully conforming instance perfectly", () => {
      expect(service.calculateScore({ failedWeight: 0, totalWeight: 20 })).toBe(
        1,
      );
    });

    it("scores an entirely absent instance at zero", () => {
      expect(service.calculateScore({ failedWeight: 8, totalWeight: 8 })).toBe(
        0,
      );
    });

    it("scores an empty template perfectly rather than dividing by zero", () => {
      // A template asking for nothing got exactly what it asked for. Scoring
      // it zero would fail every threshold while finding no fault at all.
      expect(service.calculateScore({ failedWeight: 0, totalWeight: 0 })).toBe(
        1,
      );
    });

    it("clamps a failed weight that exceeds the total", () => {
      // A validator double-counting an overlapping requirement would otherwise
      // produce a negative score, reading as worse than entirely wrong.
      expect(service.calculateScore({ failedWeight: 12, totalWeight: 8 })).toBe(
        0,
      );
    });
  });
});
