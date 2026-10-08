import { Injectable } from "@nestjs/common";
import { z } from "zod";

import {
  formCaseValueList,
  formGerundCaseValueList,
  formMoodValueList,
  formNonFiniteTenseValueList,
  formNumberValueList,
  formPersonValueList,
  formSupineCaseValueList,
  formTenseValueList,
  formVoiceValueList,
  partOfSpeechValueList,
} from "./forms.constants";

import type { FormGender } from "./forms.types";
import type {
  formCaseValues,
  formGerundCaseValues,
  FormMood,
  FormNonFiniteTense,
  formNumberValues,
  formPersonValues,
  formSupineCaseValues,
  FormTense,
  formVoiceValues,
  PartOfSpeech,
} from "@codebase/lexico-entities";

/**
 * Type guard provider for raw form parsing inputs.
 */
@Injectable()
export class FormsBuilderGuardsService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Narrows a string to a supported grammatical case value.
   */
  isFormCase(value: string): value is (typeof formCaseValues)[number] {
    return formCaseValueList.includes(value);
  }

  /**
   * Narrows a string to one of the canonical
   */
  isFormGender(value: string): value is FormGender {
    return value === "feminine" || value === "masculine" || value === "neuter";
  }

  /**
   * Narrows a string to a supported finite mood value.
   */
  isFormMood(value: string): value is FormMood {
    return formMoodValueList.includes(value);
  }

  /**
   * Narrows a string to a supported non-finite tense value.
   */
  isFormNonFiniteTense(value: string): value is FormNonFiniteTense {
    return formNonFiniteTenseValueList.includes(value);
  }

  /**
   * Narrows a string to a supported grammatical number value.
   */
  isFormNumber(value: string): value is (typeof formNumberValues)[number] {
    return formNumberValueList.includes(value);
  }

  /**
   * Narrows a string to a supported grammatical person value.
   */
  isFormPerson(value: string): value is (typeof formPersonValues)[number] {
    return formPersonValueList.includes(value);
  }

  /**
   * Narrows a string to a supported grammatical tense value.
   */
  isFormTense(value: string): value is FormTense {
    return formTenseValueList.includes(value);
  }

  /**
   * Narrows a string to a supported voice value.
   */
  isFormVoice(value: string): value is (typeof formVoiceValues)[number] {
    return formVoiceValueList.includes(value);
  }

  /**
   * Narrows a string to a supported gerund case value.
   */
  isGerundCase(value: string): value is (typeof formGerundCaseValues)[number] {
    return formGerundCaseValueList.includes(value);
  }

  /**
   * Narrows a string to a supported supine case value.
   */
  isPartOfSpeech(value: unknown): value is PartOfSpeech {
    return typeof value === "string" && partOfSpeechValueList.includes(value);
  }

  /**
   * Guards unknown values as plain object records.
   */
  isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  /**
   * Guards unknown values as arrays containing only strings.
   */
  isStringArray(value: unknown): value is string[] {
    return z.array(z.string()).safeParse(value).success;
  }

  /**
   * Narrows a string to a supported supine case value.
   */
  isSupineCase(value: string): value is (typeof formSupineCaseValues)[number] {
    return formSupineCaseValueList.includes(value);
  }
}
