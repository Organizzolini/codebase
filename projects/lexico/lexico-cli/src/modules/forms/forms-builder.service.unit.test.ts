import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import {
  AdjectivalForm,
  type Form,
  InfinitiveForm,
  Lexeme,
  type NominalForm,
  type PartOfSpeech,
} from "@codebase/lexico-entities";

import { FormsBuilderGuardsService } from "./forms-builder-guards.service";
import { FormsBuilderVerbService } from "./forms-builder-verb.service";
import { FormsBuilderService } from "./forms-builder.service";
import { FormsTransientWordsService } from "./forms-transient-words.service";

describe(FormsBuilderService, () => {
  let formsBuilderVerbService: FormsBuilderVerbService;
  let service: FormsBuilderService;
  let transientWordsService: FormsTransientWordsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        FormsBuilderService,
        FormsBuilderGuardsService,
        FormsBuilderVerbService,
        FormsTransientWordsService,
      ],
    }).compile();

    formsBuilderVerbService = await module.resolve(FormsBuilderVerbService);
    service = await module.resolve(FormsBuilderService);
    transientWordsService = await module.resolve(FormsTransientWordsService);
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("is defined", () => {
    expect.hasAssertions();
    expect(service).toBeDefined();
  });

  it("should return empty array for unsupported part of speech", () => {
    expect.hasAssertions();

    const forms = service.buildFormsForPartOfSpeech(
      "preposition",
      { forms: ["ad"] },
      new Lexeme(),
    );

    expect(forms).toStrictEqual([]);
  });

  it("should build adverb forms for adverb part of speech", () => {
    expect.hasAssertions();

    const forms = service.buildFormsForPartOfSpeech(
      "adverb",
      { forms: ["bene"] },
      new Lexeme(),
    );

    expect(forms.length).toBeGreaterThan(0);
  });

  it("should return empty forms when raw forms are null", () => {
    expect.hasAssertions();

    const forms = service.buildFormsForPartOfSpeech("noun", null, new Lexeme());

    expect(forms).toStrictEqual([]);
  });

  it("should build nominal forms for noun part of speech", () => {
    expect.hasAssertions();

    const forms = service.buildFormsForPartOfSpeech(
      "noun",
      {
        nominative: {
          plural: ["rosae"],
          singular: ["rosa"],
        },
      },
      new Lexeme(),
    );

    expect(forms).toHaveLength(2);
  });

  it("should ignore invalid nominal cases and numbers", () => {
    expect.hasAssertions();

    const forms = service.buildFormsForPartOfSpeech(
      "noun",
      {
        invalidCase: {
          singular: ["x"],
        },
        nominative: {
          invalidNumber: ["y"],
        },
      },
      new Lexeme(),
    );

    expect(forms).toHaveLength(0);
  });

  it("should build adjectival forms for adjective part of speech", () => {
    expect.hasAssertions();

    const forms = service.buildFormsForPartOfSpeech(
      "adjective",
      {
        masculine: {
          nominative: {
            singular: ["bonus"],
          },
        },
      },
      new Lexeme(),
    );

    expect(forms).toHaveLength(1);
    expect(forms[0]).toBeInstanceOf(AdjectivalForm);
  });

  it("should ignore invalid adjective gender maps", () => {
    expect.hasAssertions();

    const forms = service.buildFormsForPartOfSpeech(
      "adjective",
      {
        invalidGender: {
          nominative: {
            singular: ["bonus"],
          },
        },
      },
      new Lexeme(),
    );

    expect(forms).toHaveLength(0);
  });

  it("should build finite verb forms", () => {
    expect.hasAssertions();

    const forms = service.buildFormsForPartOfSpeech(
      "verb",
      {
        indicative: {
          active: {
            present: {
              singular: {
                first: ["amo"],
              },
            },
          },
        },
      },
      new Lexeme(),
    );

    expect(forms).toHaveLength(1);
  });

  it("should build non-finite and verbal noun verb forms", () => {
    expect.hasAssertions();

    const forms = service.buildFormsForPartOfSpeech(
      "verb",
      {
        nonFinite: {
          infinitive: {
            present: ["amare"],
          },
        },
        verbalNouns: {
          gerund: {
            accusative: ["amandum"],
          },
          supine: {
            ablative: ["amatu"],
          },
        },
      },
      new Lexeme(),
    );

    expect(forms.length).toBeGreaterThanOrEqual(3);
  });

  it("should attach transient words on built forms", () => {
    expect.hasAssertions();

    const forms = service.buildFormsForPartOfSpeech(
      "adverb",
      { forms: ["celeriter"] },
      new Lexeme(),
    );

    expect(forms).toHaveLength(1);

    const firstForm = forms[0];

    expect(firstForm).toBeDefined();

    if (!firstForm) {
      throw new Error("Expected adverb form to exist");
    }

    expect(transientWordsService.getTransientWords(firstForm)).toStrictEqual([
      "celeriter",
    ]);
  });

  it("should return empty adjectival number forms for invalid case key", () => {
    expect.hasAssertions();

    const forms = (
      service as unknown as {
        buildAdjectivalNumberForms: (args: {
          formCase: string;
          formGender: "feminine" | "masculine" | "neuter";
          lexeme: Lexeme;
          numberMap: Record<string, unknown>;
        }) => AdjectivalForm[];
      }
    ).buildAdjectivalNumberForms({
      formCase: "not-a-case",
      formGender: "masculine",
      lexeme: new Lexeme(),
      numberMap: { singular: ["bonus"] },
    });

    expect(forms).toStrictEqual([]);
  });

  it("should return empty nominal number forms for invalid case key", () => {
    expect.hasAssertions();

    const forms = (
      service as unknown as {
        buildNominalNumberForms: (args: {
          formCase: string;
          lexeme: Lexeme;
          numberMap: Record<string, unknown>;
        }) => NominalForm[];
      }
    ).buildNominalNumberForms({
      formCase: "invalid-case",
      lexeme: new Lexeme(),
      numberMap: { singular: ["rosa"] },
    });

    expect(forms).toStrictEqual([]);
  });

  it("should build participle forms from non-finite verb data", () => {
    expect.hasAssertions();

    const delegatedParticiple = new AdjectivalForm();
    vi.spyOn(
      service as unknown as {
        buildParticipleFormsFromRaw: (
          participleData: Record<string, unknown>,
          lexeme: Lexeme,
        ) => AdjectivalForm[];
      },
      "buildParticipleFormsFromRaw",
    ).mockReturnValue([delegatedParticiple]);

    const forms = service.buildFormsForPartOfSpeech(
      "verb",
      {
        nonFinite: {
          participle: { any: "value" },
        },
      },
      new Lexeme(),
    );

    expect(forms).toStrictEqual([delegatedParticiple]);
  });

  it("should return empty forms for unknown part-of-speech values", () => {
    expect.hasAssertions();

    const forms = service.buildFormsForPartOfSpeech(
      "not-a-pos" as PartOfSpeech,
      { forms: ["x"] },
      new Lexeme(),
    );

    expect(forms).toStrictEqual([]);
  });

  it("should delegate participle data to the verb provider", () => {
    expect.hasAssertions();

    const delegatedParticiple = new AdjectivalForm();
    const injectedVerbProvider = (
      service as unknown as {
        formsBuilderVerbProvider: FormsBuilderVerbService;
      }
    ).formsBuilderVerbProvider;
    const providerSpy = vi
      .spyOn(injectedVerbProvider, "buildParticipleFormsFromRaw")
      .mockReturnValue([delegatedParticiple]);

    const forms = service.buildFormsForPartOfSpeech(
      "verb",
      {
        nonFinite: {
          participle: {
            present: {
              active: {
                masculine: {
                  nominative: {
                    singular: ["amans"],
                  },
                },
              },
            },
          },
        },
      },
      new Lexeme(),
    );

    const firstCallArguments = providerSpy.mock.calls[0]?.[0];

    expect(forms).toStrictEqual([delegatedParticiple]);
    expect(firstCallArguments).toBeDefined();
    expect(firstCallArguments?.lexeme).toBeInstanceOf(Lexeme);
    expect(firstCallArguments?.participleData).toBeDefined();
  });

  it("should ignore invalid finite number keys and non-record values", () => {
    expect.hasAssertions();

    const buildFinitePersonFormsSpy = vi.spyOn(
      formsBuilderVerbService,
      "buildFinitePersonForms",
    );

    const forms = (
      service as unknown as {
        buildFiniteNumberForms: (args: {
          lexeme: Lexeme;
          mood: "indicative";
          tense: "present";
          tenseData: Record<string, unknown>;
          voice: "active";
        }) => AdjectivalForm[];
      }
    ).buildFiniteNumberForms({
      lexeme: new Lexeme(),
      mood: "indicative",
      tense: "present",
      tenseData: {
        invalidNumber: { first: ["amo"] },
        singular: "not-a-record",
      },
      voice: "active",
    });

    expect(forms).toStrictEqual([]);
    expect(buildFinitePersonFormsSpy).not.toHaveBeenCalled();
  });

  it("should build verb noun forms when gerund and supine maps are present", () => {
    expect.hasAssertions();

    const forms = (
      service as unknown as {
        buildVerbNounForms: (
          verbalNouns: Record<string, unknown>,
          lexeme: Lexeme,
        ) => AdjectivalForm[];
      }
    ).buildVerbNounForms(
      {
        gerund: {
          accusative: ["amandum"],
        },
        supine: {
          ablative: ["amatu"],
        },
      },
      new Lexeme(),
    );

    expect(forms).toHaveLength(2);
  });

  it("should build infinitive forms when non-finite tense and words are valid", () => {
    expect.hasAssertions();

    const serviceWithInternals = service as unknown as {
      buildInfinitiveForms: (
        infinitiveData: Record<string, unknown>,
        lexeme: Lexeme,
      ) => InfinitiveForm[];
      guards: FormsBuilderGuardsService;
    };

    vi.spyOn(
      serviceWithInternals.guards,
      "isFormNonFiniteTense",
    ).mockReturnValue(true);
    vi.spyOn(serviceWithInternals.guards, "isStringArray").mockReturnValue(
      true,
    );

    const forms = serviceWithInternals.buildInfinitiveForms(
      { anyTense: ["amare"] },
      new Lexeme(),
    );

    expect(forms).toHaveLength(1);
    expect(forms[0]).toBeInstanceOf(InfinitiveForm);
  });

  it("should dispatch finite mood forms only when mood data is a record", () => {
    expect.hasAssertions();

    const serviceWithInternals = service as unknown as {
      buildFiniteVoiceForms: (
        moodData: Record<string, unknown>,
        mood: "indicative",
        lexeme: Lexeme,
      ) => AdjectivalForm[];
      buildVerbFormsFromRaw: (
        rawForms: unknown,
        lexeme: Lexeme,
      ) => AdjectivalForm[];
      guards: FormsBuilderGuardsService;
    };

    const buildFiniteVoiceFormsSpy = vi
      .spyOn(serviceWithInternals, "buildFiniteVoiceForms")
      .mockReturnValue([]);
    vi.spyOn(serviceWithInternals.guards, "isFormMood").mockImplementation(
      (value) => value === "indicative",
    );

    const forms = serviceWithInternals.buildVerbFormsFromRaw(
      {
        indicative: {},
        subjunctive: "not-a-record",
      },
      new Lexeme(),
    );

    expect(forms).toStrictEqual([]);
    expect(buildFiniteVoiceFormsSpy).toHaveBeenCalledTimes(1);
  });

  it("should dispatch gerund and supine builders when verbal noun values are records", () => {
    expect.hasAssertions();

    const serviceWithInternals = service as unknown as {
      buildGerundForms: (
        gerundData: Record<string, unknown>,
        lexeme: Lexeme,
      ) => AdjectivalForm[];
      buildSupineForms: (
        supineData: Record<string, unknown>,
        lexeme: Lexeme,
      ) => AdjectivalForm[];
      buildVerbNounForms: (
        verbalNouns: Record<string, unknown>,
        lexeme: Lexeme,
      ) => AdjectivalForm[];
    };

    const buildGerundFormsSpy = vi
      .spyOn(serviceWithInternals, "buildGerundForms")
      .mockReturnValue([]);
    const buildSupineFormsSpy = vi
      .spyOn(serviceWithInternals, "buildSupineForms")
      .mockReturnValue([]);

    const forms = serviceWithInternals.buildVerbNounForms(
      {
        gerund: { accusative: ["amandum"] },
        supine: { ablative: ["amatu"] },
      },
      new Lexeme(),
    );

    expect(forms).toStrictEqual([]);
    expect(buildGerundFormsSpy).toHaveBeenCalledTimes(1);
    expect(buildSupineFormsSpy).toHaveBeenCalledTimes(1);
  });

  it("should return empty verb forms when raw forms is not a record", () => {
    expect.hasAssertions();

    const serviceWithInternals = service as unknown as {
      buildVerbFormsFromRaw: (rawForms: unknown, lexeme: Lexeme) => unknown[];
    };

    const forms = serviceWithInternals.buildVerbFormsFromRaw(
      "not-a-record",
      new Lexeme(),
    );

    expect(forms).toStrictEqual([]);
  });

  it("should skip non-record mood and verbal noun values in verb builders", () => {
    expect.hasAssertions();

    const serviceWithInternals = service as unknown as {
      buildFiniteVoiceForms: (
        moodData: Record<string, unknown>,
        mood: "indicative",
        lexeme: Lexeme,
      ) => unknown[];
      buildGerundForms: (
        gerundData: Record<string, unknown>,
        lexeme: Lexeme,
      ) => unknown[];
      buildSupineForms: (
        supineData: Record<string, unknown>,
        lexeme: Lexeme,
      ) => unknown[];
      buildVerbFormsFromRaw: (rawForms: unknown, lexeme: Lexeme) => unknown[];
      buildVerbNounForms: (
        verbalNouns: Record<string, unknown>,
        lexeme: Lexeme,
      ) => unknown[];
      guards: FormsBuilderGuardsService;
    };

    vi.spyOn(serviceWithInternals.guards, "isFormMood").mockImplementation(
      (value) => value === "indicative",
    );

    const finiteVoiceSpy = vi.spyOn(
      serviceWithInternals,
      "buildFiniteVoiceForms",
    );
    const gerundSpy = vi.spyOn(serviceWithInternals, "buildGerundForms");
    const supineSpy = vi.spyOn(serviceWithInternals, "buildSupineForms");

    const forms = serviceWithInternals.buildVerbFormsFromRaw(
      {
        indicative: "invalid-mood-data",
        verbalNouns: {
          gerund: "invalid-gerund",
          supine: "invalid-supine",
        },
      },
      new Lexeme(),
    );

    const verbalNounForms = serviceWithInternals.buildVerbNounForms(
      {
        gerund: "invalid-gerund",
        supine: "invalid-supine",
      },
      new Lexeme(),
    );

    expect(forms).toStrictEqual([]);
    expect(verbalNounForms).toStrictEqual([]);
    expect(finiteVoiceSpy).not.toHaveBeenCalled();
    expect(gerundSpy).not.toHaveBeenCalled();
    expect(supineSpy).not.toHaveBeenCalled();
  });

  it("should skip non-record infinitive and participle non-finite entries", () => {
    expect.hasAssertions();

    const serviceWithInternals = service as unknown as {
      buildInfinitiveForms: (
        infinitiveData: Record<string, unknown>,
        lexeme: Lexeme,
      ) => unknown[];
      buildParticipleFormsFromRaw: (
        participleData: Record<string, unknown>,
        lexeme: Lexeme,
      ) => unknown[];
      buildVerbNonFiniteForms: (
        nonFiniteData: Record<string, unknown>,
        lexeme: Lexeme,
      ) => unknown[];
    };

    const infinitiveSpy = vi.spyOn(
      serviceWithInternals,
      "buildInfinitiveForms",
    );
    const participleSpy = vi.spyOn(
      serviceWithInternals,
      "buildParticipleFormsFromRaw",
    );

    const forms = serviceWithInternals.buildVerbNonFiniteForms(
      {
        infinitive: "invalid",
        participle: "invalid",
      },
      new Lexeme(),
    );

    expect(forms).toStrictEqual([]);
    expect(infinitiveSpy).not.toHaveBeenCalled();
    expect(participleSpy).not.toHaveBeenCalled();
  });

  it("should ignore invalid and empty gerund entries", () => {
    expect.hasAssertions();

    const forms = (
      service as unknown as {
        buildGerundForms: (
          gerundData: Record<string, unknown>,
          lexeme: Lexeme,
        ) => unknown[];
      }
    ).buildGerundForms(
      {
        accusative: [],
        invalidCase: ["amandum"],
      },
      new Lexeme(),
    );

    expect(forms).toStrictEqual([]);
  });

  it("should ignore invalid and empty supine entries", () => {
    expect.hasAssertions();

    const forms = (
      service as unknown as {
        buildSupineForms: (
          supineData: Record<string, unknown>,
          lexeme: Lexeme,
        ) => unknown[];
      }
    ).buildSupineForms(
      {
        ablative: [],
        invalidCase: ["amatu"],
      },
      new Lexeme(),
    );

    expect(forms).toStrictEqual([]);
  });

  it("should skip invalid adjectival case keys and non-record case maps", () => {
    expect.hasAssertions();

    const serviceWithInternals = service as unknown as {
      buildAdjectivalCaseForms: (
        caseMap: Record<string, unknown>,
        formGender: "masculine",
        lexeme: Lexeme,
      ) => Form[];
      buildAdjectivalFormsFromRaw: (
        rawForms: unknown,
        lexeme: Lexeme,
      ) => Form[];
    };

    const buildAdjectivalCaseFormsSpy = vi.spyOn(
      serviceWithInternals,
      "buildAdjectivalCaseForms",
    );

    const forms = serviceWithInternals.buildAdjectivalFormsFromRaw(
      {
        invalidGender: {
          nominative: {
            singular: ["bonus"],
          },
        },
        masculine: "not-a-record",
      },
      new Lexeme(),
    );

    expect(forms).toStrictEqual([]);
    expect(buildAdjectivalCaseFormsSpy).not.toHaveBeenCalled();
  });

  it("should return empty nominal forms when raw nominal payload is not a record", () => {
    expect.hasAssertions();

    const forms = (
      service as unknown as {
        buildNominalFormsFromRaw: (rawForms: unknown, lexeme: Lexeme) => Form[];
      }
    ).buildNominalFormsFromRaw("not-a-record", new Lexeme());

    expect(forms).toStrictEqual([]);
  });

  it("should skip invalid voice and non-record voice payloads in finite mood forms", () => {
    expect.hasAssertions();

    const serviceWithInternals = service as unknown as {
      buildFiniteTenseForms: (args: {
        lexeme: Lexeme;
        mood: "indicative";
        voice: "active";
        voiceData: Record<string, unknown>;
      }) => Form[];
      buildFiniteVoiceForms: (
        moodData: Record<string, unknown>,
        mood: "indicative",
        lexeme: Lexeme,
      ) => Form[];
    };

    const buildFiniteTenseFormsSpy = vi.spyOn(
      serviceWithInternals,
      "buildFiniteTenseForms",
    );

    const forms = serviceWithInternals.buildFiniteVoiceForms(
      {
        active: "not-a-record",
        invalidVoice: { present: {} },
      },
      "indicative",
      new Lexeme(),
    );

    expect(forms).toStrictEqual([]);
    expect(buildFiniteTenseFormsSpy).not.toHaveBeenCalled();
  });

  it("should skip invalid tense and non-record tense payloads in finite tense forms", () => {
    expect.hasAssertions();

    const serviceWithInternals = service as unknown as {
      buildFiniteNumberForms: (args: {
        lexeme: Lexeme;
        mood: "indicative";
        tense: "present";
        tenseData: Record<string, unknown>;
        voice: "active";
      }) => Form[];
      buildFiniteTenseForms: (args: {
        lexeme: Lexeme;
        mood: "indicative";
        voice: "active";
        voiceData: Record<string, unknown>;
      }) => Form[];
    };

    const buildFiniteNumberFormsSpy = vi.spyOn(
      serviceWithInternals,
      "buildFiniteNumberForms",
    );

    const forms = serviceWithInternals.buildFiniteTenseForms({
      lexeme: new Lexeme(),
      mood: "indicative",
      voice: "active",
      voiceData: {
        invalidTense: { singular: {} },
        present: "not-a-record",
      },
    });

    expect(forms).toStrictEqual([]);
    expect(buildFiniteNumberFormsSpy).not.toHaveBeenCalled();
  });

  it("should skip invalid and empty infinitive entries", () => {
    expect.hasAssertions();

    const forms = (
      service as unknown as {
        buildInfinitiveForms: (
          infinitiveData: Record<string, unknown>,
          lexeme: Lexeme,
        ) => Form[];
      }
    ).buildInfinitiveForms(
      {
        invalidTense: ["amare"],
        present: [],
      },
      new Lexeme(),
    );

    expect(forms).toStrictEqual([]);
  });

  it("should skip invalid adjectival case keys and non-record case values", () => {
    expect.hasAssertions();

    const forms = (
      service as unknown as {
        buildAdjectivalCaseForms: (
          caseMap: Record<string, unknown>,
          formGender: "masculine",
          lexeme: Lexeme,
        ) => Form[];
      }
    ).buildAdjectivalCaseForms(
      {
        invalidCase: { singular: ["bonus"] },
        nominative: "not-a-record",
      },
      "masculine",
      new Lexeme(),
    );

    expect(forms).toStrictEqual([]);
  });

  it("should return empty adjectival forms when raw payload is not a record", () => {
    expect.hasAssertions();

    const forms = (
      service as unknown as {
        buildAdjectivalFormsFromRaw: (
          rawForms: unknown,
          lexeme: Lexeme,
        ) => Form[];
      }
    ).buildAdjectivalFormsFromRaw(undefined, new Lexeme());

    expect(forms).toStrictEqual([]);
  });

  it("should skip invalid and non-array adjectival number entries", () => {
    expect.hasAssertions();

    const forms = (
      service as unknown as {
        buildAdjectivalNumberForms: (args: {
          formCase: string;
          formGender: "masculine";
          lexeme: Lexeme;
          numberMap: Record<string, unknown>;
        }) => Form[];
      }
    ).buildAdjectivalNumberForms({
      formCase: "nominative",
      formGender: "masculine",
      lexeme: new Lexeme(),
      numberMap: {
        invalidNumber: ["bonus"],
        singular: "not-an-array",
      },
    });

    expect(forms).toStrictEqual([]);
  });

  it("should return empty adverb forms when raw payload is invalid", () => {
    expect.hasAssertions();

    const buildAdverbFormsFromRaw = (
      service as unknown as {
        buildAdverbFormsFromRaw: (rawForms: unknown, lexeme: Lexeme) => Form[];
      }
    ).buildAdverbFormsFromRaw.bind(service);

    const invalidRawForms = buildAdverbFormsFromRaw(undefined, new Lexeme());
    const invalidWords = buildAdverbFormsFromRaw(
      { forms: "celeriter" },
      new Lexeme(),
    );

    expect(invalidRawForms).toStrictEqual([]);
    expect(invalidWords).toStrictEqual([]);
  });

  it("should skip non-record and non-array nominal entries", () => {
    expect.hasAssertions();

    const formsFromRaw = (
      service as unknown as {
        buildNominalFormsFromRaw: (rawForms: unknown, lexeme: Lexeme) => Form[];
      }
    ).buildNominalFormsFromRaw(
      {
        nominative: "not-a-record",
      },
      new Lexeme(),
    );

    const formsFromNumbers = (
      service as unknown as {
        buildNominalNumberForms: (args: {
          formCase: string;
          lexeme: Lexeme;
          numberMap: Record<string, unknown>;
        }) => Form[];
      }
    ).buildNominalNumberForms({
      formCase: "nominative",
      lexeme: new Lexeme(),
      numberMap: {
        singular: "not-an-array",
      },
    });

    expect(formsFromRaw).toStrictEqual([]);
    expect(formsFromNumbers).toStrictEqual([]);
  });
});
