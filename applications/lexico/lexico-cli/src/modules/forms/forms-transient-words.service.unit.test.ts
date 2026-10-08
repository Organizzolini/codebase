import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { Form } from "@codebase/lexico-entities";

import { FormsTransientWordsService } from "./forms-transient-words.service";

describe(FormsTransientWordsService, () => {
  let service: FormsTransientWordsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [FormsTransientWordsService],
    }).compile();

    service = await module.resolve(FormsTransientWordsService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("should return empty words when none were set", () => {
    const form = new Form();

    expect(service.getTransientWords(form)).toStrictEqual([]);
  });

  it("should store and retrieve transient words for a form", () => {
    const form = new Form();

    service.setTransientWords(form, ["amo", "amas"]);

    expect(service.getTransientWords(form)).toStrictEqual(["amo", "amas"]);
  });
});
