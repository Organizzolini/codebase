import { createMock, type DeepMocked } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { Form, Lexeme, NominalForm, WordForm } from "@codebase/lexico-entities";

import { createRepositoryMock } from "../../../testing/mocks";
import { WordsService } from "../words/words.service";

import { FormsTransientWordsService } from "./forms-transient-words.service";
import { FormsService } from "./forms.service";

import type { Repository } from "typeorm";
import type { Mocked } from "vitest";

describe(FormsService, () => {
  let service: FormsService;
  let formRepository: DeepMocked<Repository<Form>>;
  let wordFormRepository: DeepMocked<Repository<WordForm>>;
  let wordsService: Mocked<WordsService>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        FormsService,
        {
          provide: getRepositoryToken(Form),
          useValue: createRepositoryMock<Form>(),
        },
        {
          provide: getRepositoryToken(WordForm),
          useValue: createRepositoryMock<WordForm>(),
        },
        {
          provide: WordsService,
          useValue: createMock<WordsService>({
            upsertWordsAndJunctions: vi
              .fn<
                (
                  formsByNormalizedWord: Map<string, Set<Form>>,
                  lexeme: Lexeme,
                ) => Promise<void>
              >()
              .mockResolvedValue(undefined),
          }),
        },
        FormsTransientWordsService,
      ],
    }).compile();

    service = await module.resolve(FormsService);
    formRepository = module.get(getRepositoryToken(Form));
    wordFormRepository = module.get(getRepositoryToken(WordForm));
    wordsService = module.get(WordsService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("ingestLexemeForms", () => {
    it("should remove existing forms and save new ones", async () => {
      const lexeme = new Lexeme();
      lexeme.id = "lexeme-id";

      const existingForm = new Form();
      const newForm = new NominalForm();
      service.setTransientWords(newForm, ["amō"]);

      formRepository.find.mockResolvedValue([existingForm]);
      formRepository.remove.mockResolvedValue(undefined as unknown as Form);
      formRepository.save.mockResolvedValue([newForm] as unknown as Form);
      wordsService.upsertWordsAndJunctions.mockResolvedValue(undefined);
      wordFormRepository.save.mockResolvedValue([] as unknown as WordForm);

      await service.ingestLexemeForms([newForm], lexeme);

      const formRepositoryFindCall = formRepository.find.mock.calls[0]?.[0];

      expect(formRepositoryFindCall).toStrictEqual({
        where: { lexeme: { id: "lexeme-id" } },
      });

      const formRepositoryRemoveCall = formRepository.remove.mock.calls[0]?.[0];

      expect(formRepositoryRemoveCall).toStrictEqual([existingForm]);
      expect(formRepository.save.mock.calls.length).toBeGreaterThan(0);
    });

    it("should upsert word records for normalized raw words", async () => {
      const lexeme = new Lexeme();
      lexeme.id = "lexeme-id";

      const form = new NominalForm();
      service.setTransientWords(form, ["amō"]);

      const savedForm = new NominalForm();
      service.setTransientWords(savedForm, ["amō"]);

      formRepository.find.mockResolvedValue([]);
      formRepository.save.mockResolvedValue([savedForm] as unknown as Form);
      wordsService.upsertWordsAndJunctions.mockResolvedValue(undefined);
      wordFormRepository.save.mockResolvedValue([] as unknown as WordForm);

      await service.ingestLexemeForms([form], lexeme);

      const upsertWordsAndJunctionsCall =
        wordsService.upsertWordsAndJunctions.mock.calls[0];

      expect(upsertWordsAndJunctionsCall?.[0]).toBeInstanceOf(Map);
      expect(upsertWordsAndJunctionsCall?.[1]).toBe(lexeme);
    });

    it("should skip word upsert when no valid normalized words exist", async () => {
      const lexeme = new Lexeme();
      lexeme.id = "lexeme-id";

      const form = new NominalForm();
      service.setTransientWords(form, ["123"]);

      formRepository.find.mockResolvedValue([]);
      formRepository.save.mockResolvedValue([form] as unknown as Form);

      await service.ingestLexemeForms([form], lexeme);

      expect(wordsService.upsertWordsAndJunctions).toHaveBeenCalledTimes(0);
    });

    it("should preserve matching existing form identity", async () => {
      const lexeme = new Lexeme();
      lexeme.id = "lexeme-id";

      const existingForm = new NominalForm();
      existingForm.id = "existing-id";
      existingForm.createdAt = new Date("2024-01-01");
      existingForm.updatedAt = new Date("2024-01-02");

      const newForm = new NominalForm();
      service.setTransientWords(newForm, ["amō"]);

      formRepository.find.mockResolvedValue([existingForm]);
      formRepository.save.mockImplementation(
        async (formsToSave) => await Promise.resolve(formsToSave as Form),
      );

      await service.ingestLexemeForms([newForm], lexeme);

      expect(formRepository.remove).toHaveBeenCalledTimes(0);
      expect(newForm.id).toBe("existing-id");
      expect(newForm.createdAt).toStrictEqual(new Date("2024-01-01"));
      expect(newForm.updatedAt).toStrictEqual(new Date("2024-01-02"));
    });

    it("should normalize diacritics and aggregate forms by normalized word", async () => {
      const lexeme = new Lexeme();
      lexeme.id = "lexeme-id";

      const firstForm = new NominalForm();
      const secondForm = new NominalForm();
      service.setTransientWords(firstForm, [" amō ", "-amo", "123"]);
      service.setTransientWords(secondForm, ["amo"]);

      formRepository.find.mockResolvedValue([]);
      formRepository.save.mockResolvedValue([
        firstForm,
        secondForm,
      ] as unknown as Form);

      await service.ingestLexemeForms([firstForm, secondForm], lexeme);

      expect(wordsService.upsertWordsAndJunctions).toHaveBeenCalledTimes(1);

      const [formsByWord] =
        wordsService.upsertWordsAndJunctions.mock.calls[0] ?? [];
      if (!(formsByWord instanceof Map)) {
        throw new TypeError("Expected Map argument");
      }

      expect(formsByWord.has("amo")).toBe(true);
      expect(formsByWord.has("-amo")).toBe(true);
    });
  });

  describe("private guard branches", () => {
    it("should skip saved forms that have no raw words entry", () => {
      const savedForm = new NominalForm();

      const formsByNormalizedWord = (
        service as unknown as {
          buildFormsByNormalizedWordMap: (
            savedForms: Form[],
            rawWordsPerForm: string[][],
          ) => Map<string, Set<Form>>;
        }
      ).buildFormsByNormalizedWordMap([savedForm], []);

      expect(formsByNormalizedWord.size).toBe(0);
    });

    it("should ignore undefined splice results while preserving identities", () => {
      const newForm = new NominalForm();
      const existingForm = new NominalForm();

      const existingForms = [existingForm];
      vi.spyOn(existingForms, "splice").mockReturnValue([
        undefined as unknown as NominalForm,
      ]);

      (
        service as unknown as {
          preserveMatchingExistingFormIdentity: (
            forms: Form[],
            existingFormsToPreserve: Form[],
          ) => void;
        }
      ).preserveMatchingExistingFormIdentity([newForm], existingForms);

      expect(newForm.id).toBeUndefined();
    });
  });
});
