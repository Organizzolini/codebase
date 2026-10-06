import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { LiteratureWordNormalizationService } from "./literature-word-normalization.service";

describe(LiteratureWordNormalizationService, () => {
  let service: LiteratureWordNormalizationService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [LiteratureWordNormalizationService],
    }).compile();

    service = await module.resolve(LiteratureWordNormalizationService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("escapeCapitals", () => {
    it("replaces each capital with an underscore and its lowercase form", () => {
      expect(service.escapeCapitals("CaesarAugustus")).toBe("_caesar_augustus");
    });

    it("leaves an already lowercase word alone", () => {
      expect(service.escapeCapitals("caesar")).toBe("caesar");
    });
  });

  describe("normalize", () => {
    it("strips diacritics and lowercases", () => {
      expect(service.normalize("  Rōmā  ")).toBe("roma");
    });

    it("leaves a plain word alone", () => {
      expect(service.normalize("roma")).toBe("roma");
    });
  });
});
