import { Injectable } from "@nestjs/common";

import {
  AdjectivalForm,
  AdverbForm,
  type Form,
  type FormCase,
  type FormMood,
  type FormNumber,
  type FormTense,
  type FormVoice,
  GerundForm,
  InfinitiveForm,
  type Lexeme,
  NominalForm,
  type PartOfSpeech,
  SupineForm,
} from "@codebase/lexico-entities";

import { FormsBuilderGuardsService } from "./forms-builder-guards.service";
import { FormsBuilderVerbService } from "./forms-builder-verb.service";
import { FormsTransientWordsService } from "./forms-transient-words.service";
import {
  adjectivalPartOfSpeechSet,
  nominalPartOfSpeechSet,
  unsupportedPartOfSpeechSet,
} from "./forms.constants";

import type { FormGender } from "./forms.types";

/**
 * Transforms raw form data into Form entities.
 *
 * Provides form construction logic for all part-of-speech categories,
 * delegating to specialized builders for verbs and handling morphological
 * rules for adjectives, adverbs, and nominals.
 */
@Injectable()
export class FormsBuilderService {
  // 🏗 Dependency Injection

  constructor(
    private readonly guards: FormsBuilderGuardsService,
    private readonly formsBuilderVerbProvider: FormsBuilderVerbService,
    private readonly transientWordsService: FormsTransientWordsService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🔑 Public Methods

  /**
   * Constructs adjectival Form entities from raw case and gender data.
   *
   * Processes gendered nominative, accusative, genitive, dative, ablative,
   * and vocative forms for all three grammatical genders.
   */
  private buildAdjectivalCaseForms(
    caseMap: Record<string, unknown>,
    formGender: FormGender,
    lexeme: Lexeme,
  ): Form[] {
    const forms: Form[] = [];

    for (const caseKey of Object.keys(caseMap)) {
      if (!this.guards.isFormCase(caseKey)) continue;

      const numberMap = caseMap[caseKey];
      if (!this.guards.isRecord(numberMap)) continue;

      forms.push(
        ...this.buildAdjectivalNumberForms({
          formCase: caseKey,
          formGender,
          lexeme,
          numberMap,
        }),
      );
    }

    return forms;
  }

  // 🔐 Private Methods

  /** Builds structured data used during form entity building. */
  private buildAdjectivalFormsFromRaw(
    rawForms: unknown,
    lexeme: Lexeme,
  ): Form[] {
    const forms: Form[] = [];
    if (!this.guards.isRecord(rawForms)) return forms;

    for (const genderKey of Object.keys(rawForms)) {
      if (!this.guards.isFormGender(genderKey)) continue;
      const formGender = genderKey;

      const caseMap = rawForms[genderKey];
      if (!this.guards.isRecord(caseMap)) continue;

      forms.push(...this.buildAdjectivalCaseForms(caseMap, formGender, lexeme));
    }

    return forms;
  }

  /** Builds structured data used during form entity building. */
  private buildAdjectivalNumberForms(args: {
    formCase: string;
    formGender: FormGender;
    lexeme: Lexeme;
    numberMap: Record<string, unknown>;
  }): Form[] {
    const { formGender, lexeme, numberMap } = args;
    const formCase = args.formCase;
    const forms: Form[] = [];

    if (!this.guards.isFormCase(formCase)) {
      return forms;
    }

    for (const numberKey of Object.keys(numberMap)) {
      if (!this.guards.isFormNumber(numberKey)) continue;

      const words = numberMap[numberKey];
      if (!this.guards.isStringArray(words) || words.length === 0) continue;

      const form = this.createAdjectivalForm({
        formCase,
        formGender,
        formNumber: numberKey,
        lexeme,
        words,
      });
      forms.push(form);
    }

    return forms;
  }

  /** Builds structured data used during form entity building. */
  private buildAdverbFormsFromRaw(rawForms: unknown, lexeme: Lexeme): Form[] {
    const forms: Form[] = [];
    if (!this.guards.isRecord(rawForms)) return forms;

    const words = rawForms["forms"];
    if (!this.guards.isStringArray(words) || words.length === 0) return forms;

    const form = new AdverbForm();
    form.lexeme = lexeme;
    this.transientWordsService.setTransientWords(form, words);
    forms.push(form);

    return forms;
  }

  /**
   * Builds one tense's forms, one per grammatical number.
   *
   * The last rung of the cascade this class owns: a number is the innermost
   * axis whose data is still a record of records, so the person axis below it
   * is the verb builder's to walk.
   */
  private buildFiniteNumberForms(args: {
    lexeme: Lexeme;
    mood: FormMood;
    tense: FormTense;
    tenseData: Record<string, unknown>;
    voice: FormVoice;
  }): Form[] {
    const forms: Form[] = [];
    for (const numberKey of Object.keys(args.tenseData)) {
      if (!this.guards.isFormNumber(numberKey)) continue;
      const numberData = args.tenseData[numberKey];
      if (!this.guards.isRecord(numberData)) continue;

      forms.push(
        ...this.formsBuilderVerbProvider.buildFinitePersonForms({
          lexeme: args.lexeme,
          mood: args.mood,
          number: numberKey,
          numberData,
          tense: args.tense,
          voice: args.voice,
        }),
      );
    }
    return forms;
  }

  /**
   * Builds one voice's forms, one per tense.
   *
   * Each rung of the finite cascade narrows its own axis with a guard and
   * passes the narrowed value down, so no rung below re-checks what the one
   * above already established. This used to widen every axis back to `string`
   * on the way down, which forced a fourth rung underneath whose whole job was
   * to re-run three guards before delegating.
   */
  private buildFiniteTenseForms(args: {
    lexeme: Lexeme;
    mood: FormMood;
    voice: FormVoice;
    voiceData: Record<string, unknown>;
  }): Form[] {
    const forms: Form[] = [];
    for (const tenseKey of Object.keys(args.voiceData)) {
      if (!this.guards.isFormTense(tenseKey)) continue;
      const tenseData = args.voiceData[tenseKey];
      if (!this.guards.isRecord(tenseData)) continue;

      forms.push(
        ...this.buildFiniteNumberForms({
          lexeme: args.lexeme,
          mood: args.mood,
          tense: tenseKey,
          tenseData,
          voice: args.voice,
        }),
      );
    }
    return forms;
  }

  /**
   * Builds one mood's forms, one per voice.
   *
   * Named for the axis it walks rather than the one it is handed, which is
   * what its three siblings below do — a traced stack now reads
   * voice → tense → number → person, matching the descent. Named
   * `buildFiniteMoodForms` it claimed the mood axis, which
   * `buildVerbFormsFromRaw` above actually walks.
   */
  private buildFiniteVoiceForms(
    moodData: Record<string, unknown>,
    mood: FormMood,
    lexeme: Lexeme,
  ): Form[] {
    const forms: Form[] = [];

    for (const voiceKey of Object.keys(moodData)) {
      if (!this.guards.isFormVoice(voiceKey)) continue;
      const voiceData = moodData[voiceKey];
      if (!this.guards.isRecord(voiceData)) continue;

      forms.push(
        ...this.buildFiniteTenseForms({
          lexeme,
          mood,
          voice: voiceKey,
          voiceData,
        }),
      );
    }

    return forms;
  }

  /** Builds structured data used during form entity building. */
  private buildGerundForms(
    gerundData: Record<string, unknown>,
    lexeme: Lexeme,
  ): Form[] {
    const forms: Form[] = [];
    for (const caseKey of Object.keys(gerundData)) {
      if (!this.guards.isGerundCase(caseKey)) continue;
      const words = gerundData[caseKey];
      if (!this.guards.isStringArray(words) || words.length === 0) continue;

      const form = new GerundForm();
      form.lexeme = lexeme;
      form.case = caseKey;
      this.transientWordsService.setTransientWords(form, words);
      forms.push(form);
    }

    return forms;
  }

  /** Builds structured data used during form entity building. */
  private buildInfinitiveForms(
    infinitiveData: Record<string, unknown>,
    lexeme: Lexeme,
  ): Form[] {
    const forms: Form[] = [];

    for (const tenseKey of Object.keys(infinitiveData)) {
      if (!this.guards.isFormNonFiniteTense(tenseKey)) continue;
      const words = infinitiveData[tenseKey];
      if (!this.guards.isStringArray(words) || words.length === 0) continue;

      const form = new InfinitiveForm();
      form.lexeme = lexeme;
      form.tense = tenseKey;
      this.transientWordsService.setTransientWords(form, words);
      forms.push(form);
    }

    return forms;
  }

  /** Builds structured data used during form entity building. */
  private buildNominalFormsFromRaw(rawForms: unknown, lexeme: Lexeme): Form[] {
    const forms: Form[] = [];
    if (!this.guards.isRecord(rawForms)) return forms;

    for (const caseKey of Object.keys(rawForms)) {
      if (!this.guards.isFormCase(caseKey)) continue;

      const numberMap = rawForms[caseKey];
      if (!this.guards.isRecord(numberMap)) continue;

      forms.push(
        ...this.buildNominalNumberForms({
          formCase: caseKey,
          lexeme,
          numberMap,
        }),
      );
    }

    return forms;
  }

  /** Builds structured data used during form entity building. */
  private buildNominalNumberForms(args: {
    formCase: string;
    lexeme: Lexeme;
    numberMap: Record<string, unknown>;
  }): Form[] {
    const { lexeme, numberMap } = args;
    const formCase = args.formCase;
    const forms: Form[] = [];

    if (!this.guards.isFormCase(formCase)) {
      return forms;
    }

    for (const numberKey of Object.keys(numberMap)) {
      if (!this.guards.isFormNumber(numberKey)) continue;

      const words = numberMap[numberKey];
      if (!this.guards.isStringArray(words) || words.length === 0) continue;

      const form = new NominalForm();
      form.lexeme = lexeme;
      form.case = formCase;
      form.number = numberKey;
      this.transientWordsService.setTransientWords(form, words);
      forms.push(form);
    }

    return forms;
  }

  /** Builds structured data used during form entity building. */
  private buildParticipleFormsFromRaw(
    participleData: Record<string, unknown>,
    lexeme: Lexeme,
  ): Form[] {
    return this.formsBuilderVerbProvider.buildParticipleFormsFromRaw({
      buildAdjectivalCaseForms: this.buildAdjectivalCaseForms.bind(this),
      lexeme,
      participleData,
    });
  }

  /** Builds structured data used during form entity building. */
  private buildSupineForms(
    supineData: Record<string, unknown>,
    lexeme: Lexeme,
  ): Form[] {
    const forms: Form[] = [];
    for (const caseKey of Object.keys(supineData)) {
      if (!this.guards.isSupineCase(caseKey)) continue;
      const words = supineData[caseKey];
      if (!this.guards.isStringArray(words) || words.length === 0) continue;

      const form = new SupineForm();
      form.lexeme = lexeme;
      form.case = caseKey;
      this.transientWordsService.setTransientWords(form, words);
      forms.push(form);
    }

    return forms;
  }

  /** Builds structured data used during form entity building. */
  private buildVerbFormsFromRaw(rawForms: unknown, lexeme: Lexeme): Form[] {
    const forms: Form[] = [];
    if (!this.guards.isRecord(rawForms)) return forms;

    for (const moodKey of Object.keys(rawForms)) {
      if (!this.guards.isFormMood(moodKey)) continue;
      const moodData = rawForms[moodKey];
      if (!this.guards.isRecord(moodData)) continue;
      forms.push(...this.buildFiniteVoiceForms(moodData, moodKey, lexeme));
    }

    const nonFinite = rawForms["nonFinite"];
    if (this.guards.isRecord(nonFinite)) {
      forms.push(...this.buildVerbNonFiniteForms(nonFinite, lexeme));
    }

    const verbalNouns = rawForms["verbalNouns"];
    if (this.guards.isRecord(verbalNouns)) {
      forms.push(...this.buildVerbNounForms(verbalNouns, lexeme));
    }

    return forms;
  }

  /** Builds structured data used during form entity building. */
  private buildVerbNonFiniteForms(
    nonFiniteData: Record<string, unknown>,
    lexeme: Lexeme,
  ): Form[] {
    const forms: Form[] = [];

    const infinitive = nonFiniteData["infinitive"];
    if (this.guards.isRecord(infinitive)) {
      forms.push(...this.buildInfinitiveForms(infinitive, lexeme));
    }

    const participle = nonFiniteData["participle"];
    if (this.guards.isRecord(participle)) {
      forms.push(...this.buildParticipleFormsFromRaw(participle, lexeme));
    }

    return forms;
  }

  /** Builds structured data used during form entity building. */
  private buildVerbNounForms(
    verbalNouns: Record<string, unknown>,
    lexeme: Lexeme,
  ): Form[] {
    const forms: Form[] = [];

    const gerundData = verbalNouns["gerund"];
    if (this.guards.isRecord(gerundData)) {
      forms.push(...this.buildGerundForms(gerundData, lexeme));
    }

    const supineData = verbalNouns["supine"];
    if (this.guards.isRecord(supineData)) {
      forms.push(...this.buildSupineForms(supineData, lexeme));
    }

    return forms;
  }

  /** Creates one adjectival form entity from validated raw values. */
  private createAdjectivalForm(args: {
    formCase: FormCase;
    formGender: FormGender;
    formNumber: FormNumber;
    lexeme: Lexeme;
    words: string[];
  }): AdjectivalForm {
    const form = new AdjectivalForm();
    form.lexeme = args.lexeme;
    form.gender = args.formGender;
    form.case = args.formCase;
    form.number = args.formNumber;
    this.transientWordsService.setTransientWords(form, args.words);
    return form;
  }

  // 🌎 Public Methods

  /**
   * Builds Form entities for a given part-of-speech category.
   * Routes to specialized handlers based on morphological type.
   *
   * Returns an empty array for unsupported parts of speech or null inputs.
   */
  buildFormsForPartOfSpeech(
    pos: PartOfSpeech,
    rawForms: unknown,
    lexeme: Lexeme,
  ): Form[] {
    if (!rawForms) return [];
    if (unsupportedPartOfSpeechSet.has(pos)) return [];

    if (adjectivalPartOfSpeechSet.has(pos)) {
      return this.buildAdjectivalFormsFromRaw(rawForms, lexeme);
    }

    if (pos === "adverb") {
      return this.buildAdverbFormsFromRaw(rawForms, lexeme);
    }

    if (nominalPartOfSpeechSet.has(pos)) {
      return this.buildNominalFormsFromRaw(rawForms, lexeme);
    }

    if (pos === "verb") {
      return this.buildVerbFormsFromRaw(rawForms, lexeme);
    }

    return [];
  }
}
