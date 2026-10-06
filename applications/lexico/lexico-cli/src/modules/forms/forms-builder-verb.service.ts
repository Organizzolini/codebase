import { Injectable } from "@nestjs/common";

import {
  FiniteVerbForm,
  type Form,
  type FormNonFiniteTense,
  type formPersonValues,
  type Lexeme,
  ParticipleForm,
} from "@codebase/lexico-entities";

import { FormsBuilderGuardsService } from "./forms-builder-guards.service";
import { FormsTransientWordsService } from "./forms-transient-words.service";

import type {
  BuildFinitePersonFormsArguments,
  FormGender,
} from "./forms.types";

/**
 * Service responsible for building verb forms based on raw morphological data and applying necessary transformations.
 */
@Injectable()
export class FormsBuilderVerbService {
  // 🏗 Dependency Injection

  constructor(
    private readonly guards: FormsBuilderGuardsService,
    private readonly transientWordsService: FormsTransientWordsService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Applies the given tense to all forms in the array that are instances of ParticipleForm.
   */
  private applyTenseToParticipleForms(
    forms: Form[],
    tense: FormNonFiniteTense,
  ): void {
    for (const form of forms) {
      if (form instanceof ParticipleForm) {
        form.tense = tense;
      }
    }
  }

  /**
   * Builds a finite verb form for a specific person based on the provided arguments, including lexeme, mood, number, tense, voice, and associated raw words. The built form is returned with transient words set for later association during persistence.
   */
  private buildFiniteVerbForm(
    args: BuildFinitePersonFormsArguments & {
      lexeme: Lexeme;
      person: (typeof formPersonValues)[number];
      words: string[];
    },
  ): Form {
    const { lexeme, mood, number, person, tense, voice, words } = args;
    const form = new FiniteVerbForm();
    form.lexeme = lexeme;
    form.mood = mood;
    form.voice = voice;
    form.tense = tense;
    form.number = number;
    form.person = person;
    this.transientWordsService.setTransientWords(form, words);
    return form;
  }

  /**
   * Collects participle forms for a specific tense by validating the tense key, iter
   */
  private collectParticipleFormsForTense(args: {
    buildAdjectivalCaseForms: (
      caseMap: Record<string, unknown>,
      formGender: FormGender,
      lexeme: Lexeme,
    ) => Form[];
    lexeme: Lexeme;
    participleData: Record<string, unknown>;
    tenseKey: string;
  }): Form[] {
    const { buildAdjectivalCaseForms, lexeme, participleData, tenseKey } = args;
    if (!this.guards.isFormNonFiniteTense(tenseKey)) {
      return [];
    }

    const tenseData = participleData[tenseKey];
    if (!this.guards.isRecord(tenseData)) {
      return [];
    }

    const formsForTense: Form[] = [];
    for (const genderKey of Object.keys(tenseData)) {
      if (!this.guards.isFormGender(genderKey)) {
        continue;
      }

      const caseMap = tenseData[genderKey];
      if (!this.guards.isRecord(caseMap)) {
        continue;
      }

      formsForTense.push(
        ...buildAdjectivalCaseForms(caseMap, genderKey, lexeme),
      );
    }

    return formsForTense;
  }

  // 🌎 Public Methods

  /**
   * Builds finite verb forms for specific persons based on the provided arguments, including lexeme, mood, number, tense, voice, and associated raw words. The built forms are returned with transient words set for later association during persistence.
   */
  buildFinitePersonForms(args: BuildFinitePersonFormsArguments): Form[] {
    const forms: Form[] = [];

    for (const personKey of Object.keys(args.numberData)) {
      if (!this.guards.isFormPerson(personKey)) {
        continue;
      }

      const words = args.numberData[personKey];
      if (!this.guards.isStringArray(words) || words.length === 0) {
        continue;
      }

      forms.push(
        this.buildFiniteVerbForm({
          ...args,
          person: personKey,
          words,
        }),
      );
    }

    return forms;
  }

  /**
   * Builds participle forms from raw participle data by iterating through valid tenses
   */
  buildParticipleFormsFromRaw(args: {
    buildAdjectivalCaseForms: (
      caseMap: Record<string, unknown>,
      formGender: FormGender,
      lexeme: Lexeme,
    ) => Form[];
    lexeme: Lexeme;
    participleData: Record<string, unknown>;
  }): Form[] {
    const { buildAdjectivalCaseForms, lexeme, participleData } = args;
    const forms: Form[] = [];

    for (const tenseKey of Object.keys(participleData)) {
      if (!this.guards.isFormNonFiniteTense(tenseKey)) {
        continue;
      }

      const formsForTense = this.collectParticipleFormsForTense({
        buildAdjectivalCaseForms,
        lexeme,
        participleData,
        tenseKey,
      });

      if (formsForTense.length === 0) {
        continue;
      }

      this.applyTenseToParticipleForms(formsForTense, tenseKey);
      forms.push(...formsForTense);
    }

    return forms;
  }
}
