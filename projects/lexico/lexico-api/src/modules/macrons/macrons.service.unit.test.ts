/* cspell:words precomposed amabō amabo aër aer cūra cura Rōma */

import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { MacronsService } from "./macrons.service";

describe(MacronsService, () => {
  let service: MacronsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [MacronsService],
    }).compile();

    service = await module.resolve(MacronsService);
  });

  it("is defined", () => {
    expect.hasAssertions();

    expect(service).toBeDefined();
  });

  describe("removeMacrons", () => {
    it("removes precomposed macrons", () => {
      expect.hasAssertions();

      expect(service.removeMacrons("amabō")).toBe("amabo");
      expect(service.removeMacrons("cūra")).toBe("cura");
    });

    it("removes combining macrons", () => {
      expect.hasAssertions();

      expect(service.removeMacrons("amabō")).toBe("amabo");
    });

    it("removes the other diacritics ingestion strips from stored words", () => {
      expect.hasAssertions();

      expect(service.removeMacrons("aër")).toBe("aer");
      expect(service.removeMacrons("ă")).toBe("a");
    });

    it("preserves letter case and unmarked text", () => {
      expect.hasAssertions();

      expect(service.removeMacrons("Rōma")).toBe("Roma");
      expect(service.removeMacrons("-que")).toBe("-que");
    });
  });
});
