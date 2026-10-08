/* cspell:ignore amans */

import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { Lexeme, ParticipleForm } from "@codebase/lexico-entities";

import { FormsBuilderGuardsService } from "./forms-builder-guards.service";
import { FormsBuilderVerbService } from "./forms-builder-verb.service";
import { FormsTransientWordsService } from "./forms-transient-words.service";

describe(FormsBuilderVerbService, () => {
  let service: FormsBuilderVerbService;
  let transientWordsService: FormsTransientWordsService;

  const createLexeme = (): Lexeme => new Lexeme();

  const buildFiniteForms = (
    numberData: Record<string, unknown>,
  ): ReturnType<FormsBuilderVerbService["buildFinitePersonForms"]> =>
    service.buildFinitePersonForms({
      lexeme: createLexeme(),
      mood: "indicative",
      number: "singular",
      numberData,
      tense: "present",
      voice: "active",
    });

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        FormsBuilderVerbService,
        FormsBuilderGuardsService,
        FormsTransientWordsService,
      ],
    }).compile();

    service = await module.resolve(FormsBuilderVerbService);
    transientWordsService = await module.resolve(FormsTransientWordsService);
  });

  it("is defined", () => {
    expect.hasAssertions();
    expect(service).toBeDefined();
  });

  describe("buildFinitePersonForms", () => {
    it("should build finite person forms from valid person data", () => {
      expect.hasAssertions();

      const forms = buildFiniteForms({
        first: ["amo"],
        invalid: ["x"],
      });

      expect(forms).toHaveLength(1);
    });

    it("should skip finite person forms when words are invalid", () => {
      expect.hasAssertions();

      const forms = buildFiniteForms({
        first: [],
        second: "amo",
      });

      expect(forms).toHaveLength(0);
    });

    it("should attach transient words on finite forms", () => {
      expect.hasAssertions();

      const forms = buildFiniteForms({
        first: ["amo"],
      });

      expect(forms).toHaveLength(1);

      const firstForm = forms[0];

      expect(firstForm).toBeDefined();

      if (!firstForm) {
        throw new Error("Expected finite form to exist");
      }

      expect(transientWordsService.getTransientWords(firstForm)).toStrictEqual([
        "amo",
      ]);
    });
  });

  describe("buildParticipleFormsFromRaw", () => {
    it("should build participle forms and apply tense", () => {
      expect.hasAssertions();

      const forms = service.buildParticipleFormsFromRaw({
        buildAdjectivalCaseForms: () => {
          const participleForm = new ParticipleForm();
          return [participleForm];
        },
        lexeme: createLexeme(),
        participleData: {
          present: {
            masculine: {
              nominative: {
                singular: ["amans"],
              },
            },
          },
        },
      });

      expect(forms).toHaveLength(1);
      expect(forms[0]).toBeInstanceOf(ParticipleForm);
      expect((forms[0] as ParticipleForm).tense).toBe("present");
    });

    it("should skip invalid participle tense and gender branches", () => {
      expect.hasAssertions();

      const forms = service.buildParticipleFormsFromRaw({
        buildAdjectivalCaseForms: () => [new ParticipleForm()],
        lexeme: createLexeme(),
        participleData: {
          invalidTense: {
            masculine: {
              nominative: {
                singular: ["amans"],
              },
            },
          },
          present: {
            invalidGender: {
              nominative: {
                singular: ["amans"],
              },
            },
          },
        },
      });

      expect(forms).toHaveLength(0);
    });

    it("should skip participle entries when tense data is not an object", () => {
      expect.hasAssertions();

      const forms = service.buildParticipleFormsFromRaw({
        buildAdjectivalCaseForms: () => [new ParticipleForm()],
        lexeme: createLexeme(),
        participleData: {
          present: "invalid",
        },
      });

      expect(forms).toHaveLength(0);
    });

    it("should skip participle entries when gender case map is not an object", () => {
      expect.hasAssertions();

      const forms = service.buildParticipleFormsFromRaw({
        buildAdjectivalCaseForms: () => [new ParticipleForm()],
        lexeme: createLexeme(),
        participleData: {
          present: {
            masculine: "invalid",
          },
        },
      });

      expect(forms).toHaveLength(0);
    });

    it("should apply tense only to participle forms", () => {
      expect.hasAssertions();

      const nonParticipleForm = {
        lexeme: createLexeme(),
      } as unknown as ParticipleForm;

      const forms = service.buildParticipleFormsFromRaw({
        buildAdjectivalCaseForms: () => [
          new ParticipleForm(),
          nonParticipleForm,
        ],
        lexeme: createLexeme(),
        participleData: {
          present: {
            masculine: {
              nominative: {
                singular: ["amans"],
              },
            },
          },
        },
      });

      expect(forms).toHaveLength(2);
      expect((forms[0] as ParticipleForm).tense).toBe("present");
      expect((forms[1] as ParticipleForm).tense).toBeUndefined();
    });
  });
});
