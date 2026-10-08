import { createMock } from "@golevelup/ts-vitest";
import {
  GraphQLSchemaBuilderModule,
  GraphQLSchemaFactory,
} from "@nestjs/graphql";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { Word } from "@codebase/lexico-entities";

import { WordType } from "./word.entities";
import { WordsResolver } from "./words.resolver";
import { WordsService } from "./words.service";

describe(WordsResolver, () => {
  let resolver: WordsResolver;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        WordsResolver,
        { provide: WordsService, useValue: createMock<WordsService>() },
      ],
    }).compile();

    resolver = await module.resolve(WordsResolver);
  });

  it("is defined", () => {
    expect.hasAssertions();

    expect(resolver).toBeDefined();
  });

  it("resolves a single word by data using the words service", async () => {
    expect.hasAssertions();

    const word = new Word();
    word.id = "word-1";
    word.data = "amo";

    const mockService = createMock<WordsService>({
      findByData: vi.fn<WordsService["findByData"]>().mockResolvedValue(word),
    });

    const resolver = new WordsResolver(mockService);
    const result = await resolver.word({ data: "amo" });

    expect(mockService.findByData).toHaveBeenCalledWith("amo");
    expect(result).toBeInstanceOf(WordType);
    expect(result).toMatchObject({ data: "amo", id: "word-1" });
  });

  it("resolves multiple words by data using the words service", async () => {
    expect.hasAssertions();

    const words: Word[] = [new Word(), new Word()];
    const [firstWord, secondWord] = words;
    if (!firstWord || !secondWord) {
      throw new Error("Expected two test words");
    }
    firstWord.id = "word-1";
    secondWord.id = "word-2";

    const mockService = createMock<WordsService>({
      findByDataList: vi
        .fn<WordsService["findByDataList"]>()
        .mockResolvedValue(words),
    });

    const resolver = new WordsResolver(mockService);
    const result = await resolver.words({ data: ["amo", "amare"] });

    expect(mockService.findByDataList).toHaveBeenCalledWith(["amo", "amare"]);
    expect(result).toStrictEqual([expect.any(WordType), expect.any(WordType)]);
    expect(result.map((mapped) => mapped.id)).toStrictEqual([
      "word-1",
      "word-2",
    ]);
  });

  it("generates a schema containing the word and words queries", async () => {
    expect.hasAssertions();

    const module = await Test.createTestingModule({
      imports: [GraphQLSchemaBuilderModule],
      providers: [
        WordsResolver,
        {
          provide: WordsService,
          useValue: createMock<WordsService>(),
        },
      ],
    }).compile();

    const schemaFactory = module.get(GraphQLSchemaFactory);
    const schema = await schemaFactory.create([WordsResolver]);

    expect(schema).toBeDefined();
    expect(schema.getQueryType()?.getFields()["word"]).toBeDefined();
    expect(schema.getQueryType()?.getFields()["words"]).toBeDefined();
  });
});
