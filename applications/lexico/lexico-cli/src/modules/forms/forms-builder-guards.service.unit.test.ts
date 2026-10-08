import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { FormsBuilderGuardsService } from "./forms-builder-guards.service";

describe(FormsBuilderGuardsService, () => {
  let service: FormsBuilderGuardsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [FormsBuilderGuardsService],
    }).compile();

    service = await module.resolve(FormsBuilderGuardsService);
  });

  it("is defined", () => {
    expect.hasAssertions();
    expect(service).toBeDefined();
  });

  it("should identify valid part of speech values", () => {
    expect.hasAssertions();
    expect(service.isPartOfSpeech("verb")).toBe(true);
    expect(service.isPartOfSpeech("not-a-part-of-speech")).toBe(false);
    expect(service.isPartOfSpeech(10)).toBe(false);
  });

  it("should identify valid and invalid grammatical case values", () => {
    expect.hasAssertions();
    expect(service.isFormCase("nominative")).toBe(true);
    expect(service.isFormCase("invalid-case")).toBe(false);
  });

  it("should identify valid and invalid gender values", () => {
    expect.hasAssertions();
    expect(service.isFormGender("feminine")).toBe(true);
    expect(service.isFormGender("masculine")).toBe(true);
    expect(service.isFormGender("neuter")).toBe(true);
    expect(service.isFormGender("common")).toBe(false);
  });

  it("should identify valid and invalid mood values", () => {
    expect.hasAssertions();
    expect(service.isFormMood("indicative")).toBe(true);
    expect(service.isFormMood("invalid-mood")).toBe(false);
  });

  it("should identify valid and invalid non-finite tense values", () => {
    expect.hasAssertions();
    expect(service.isFormNonFiniteTense("present")).toBe(true);
    expect(service.isFormNonFiniteTense("future-perfect")).toBe(false);
  });

  it("should identify valid and invalid number values", () => {
    expect.hasAssertions();
    expect(service.isFormNumber("singular")).toBe(true);
    expect(service.isFormNumber("plural")).toBe(true);
    expect(service.isFormNumber("dual")).toBe(false);
  });

  it("should identify valid and invalid person values", () => {
    expect.hasAssertions();
    expect(service.isFormPerson("first")).toBe(true);
    expect(service.isFormPerson("second")).toBe(true);
    expect(service.isFormPerson("third")).toBe(true);
    expect(service.isFormPerson("fourth-person")).toBe(false);
  });

  it("should identify valid and invalid tense values", () => {
    expect.hasAssertions();
    expect(service.isFormTense("present")).toBe(true);
    expect(service.isFormTense("futurePerfect")).toBe(true);
    expect(service.isFormTense("invalid-tense")).toBe(false);
  });

  it("should identify valid and invalid voice values", () => {
    expect.hasAssertions();
    expect(service.isFormVoice("active")).toBe(true);
    expect(service.isFormVoice("passive")).toBe(true);
    expect(service.isFormVoice("middle")).toBe(false);
  });

  it("should identify valid and invalid gerund case values", () => {
    expect.hasAssertions();
    expect(service.isGerundCase("accusative")).toBe(true);
    expect(service.isGerundCase("invalid-gerund-case")).toBe(false);
  });

  it("should identify valid and invalid supine case values", () => {
    expect.hasAssertions();
    expect(service.isSupineCase("accusative")).toBe(true);
    expect(service.isSupineCase("ablative")).toBe(true);
    expect(service.isSupineCase("genitive")).toBe(false);
  });

  it("should identify record and string array values", () => {
    expect.hasAssertions();
    expect(service.isRecord({ value: 1 })).toBe(true);
    expect(service.isRecord(null)).toBe(false);
    expect(service.isRecord(["a"])).toBe(false);
    expect(service.isStringArray(["amo", "amas"])).toBe(true);
    expect(service.isStringArray("amo")).toBe(false);
    expect(service.isStringArray(["amo", 1])).toBe(false);
  });
});
