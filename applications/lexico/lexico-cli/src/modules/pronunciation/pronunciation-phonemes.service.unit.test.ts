import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { PronunciationPhonemesService } from "./pronunciation-phonemes.service";

describe(PronunciationPhonemesService, () => {
  let service: PronunciationPhonemesService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [PronunciationPhonemesService],
    }).compile();

    service = await module.resolve(PronunciationPhonemesService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("should return a string phoneme when key points to string value", () => {
    const value = service.getStringPhoneme({ a: "a" }, "a");

    expect(value).toBe("a");
  });

  it("should return empty string when key points to nested value", () => {
    const value = service.getStringPhoneme({ a: [["a"]] }, "a");

    expect(value).toBe("");
  });

  it("should return empty string when key is missing", () => {
    const value = service.getStringPhoneme({ a: "a" }, "missing");

    expect(value).toBe("");
  });

  it("should return empty string when value is null", () => {
    const value = service.getStringPhoneme(
      { a: null } as unknown as Record<string, string | string[][]>,
      "a",
    );

    expect(value).toBe("");
  });
});
