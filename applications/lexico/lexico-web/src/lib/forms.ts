import type { AdjectiveForm } from "../components/entry/adjective-forms-table";
import type { NounForm } from "../components/entry/noun-forms-table";
import type { VerbForm } from "../components/entry/verb-forms-table";
import type { AdjectiveForms, Forms, NounForms, VerbForms } from "./types";

// Case order for declensions
const CASE_ORDER = [
  "nominative",
  "genitive",
  "dative",
  "accusative",
  "ablative",
  "vocative",
  "locative",
] as const;

// Person order for conjugations
const PERSON_ORDER = ["first", "second", "third"] as const;

// Number order
const NUMBER_ORDER = ["singular", "plural"] as const;

// Gender order
const GENDER_ORDER = ["masculine", "feminine", "neuter"] as const;

// Tense order for indicative
const INDICATIVE_TENSE_ORDER = [
  "present",
  "imperfect",
  "future",
  "perfect",
  "pluperfect",
  "futurePerfect",
] as const;

// Tense order for subjunctive
const SUBJUNCTIVE_TENSE_ORDER = [
  "present",
  "imperfect",
  "perfect",
  "pluperfect",
] as const;

// Voice order
const VOICE_ORDER = ["active", "passive"] as const;

/**
 * Person number record.
 */
interface PersonNumberRecord {
  plural?: Partial<Record<"first" | "second" | "third", string[]>>;
  singular?: Partial<Record<"first" | "second" | "third", string[]>>;
}

/**
 * Describes behavior.
 */
type TransformResult =
  | null
  | { forms: AdjectiveForm[]; type: "adjective" }
  | { forms: NounForm[]; type: "noun" }
  | { forms: VerbForm[]; type: "verb" };

/**
 * Convert nested adjective forms from database to flat array for AdjectiveFormsTable.
 */
export function transformAdjectiveForms(
  forms: AdjectiveForms,
): AdjectiveForm[] {
  const result: AdjectiveForm[] = [];

  for (const gender of GENDER_ORDER) {
    const genderData = forms[gender];
    if (!genderData) continue;

    for (const caseName of CASE_ORDER) {
      const caseData = genderData[caseName];
      if (!caseData) continue;

      for (const number of NUMBER_ORDER) {
        const formArray = caseData[number];
        if (!formArray || formArray.length === 0) continue;

        result.push({
          case: caseName,
          form: formArray.join(", "),
          gender,
          number,
        });
      }
    }
  }

  return result;
}

/**
 * Transform forms based on part of speech.
 */
export function transformForms(
  partOfSpeech: string,
  forms: Forms,
): TransformResult {
  if (Object.keys(forms).length === 0) {
    return null;
  }

  const pos = partOfSpeech.toLowerCase();
  return dispatchFormTransform(pos, forms);
}

/**
 * Convert nested noun forms from database to flat array for NounFormsTable.
 */
export function transformNounForms(forms: NounForms): NounForm[] {
  const result: NounForm[] = [];

  for (const caseName of CASE_ORDER) {
    const caseData = forms[caseName];
    if (!caseData) continue;

    for (const number of NUMBER_ORDER) {
      const formArray = caseData[number];
      if (!formArray || formArray.length === 0) continue;

      result.push({
        case: caseName,
        form: formArray.join(", "),
        number,
      });
    }
  }

  return result;
}

/**
 * Convert nested verb forms from database to flat array for VerbFormsTable.
 */
export function transformVerbForms(forms: VerbForms): VerbForm[] {
  return [
    ...transformIndicativeForms(forms),
    ...transformSubjunctiveForms(forms),
    ...transformImperativeForms(forms),
    ...transformNonFiniteForms(forms),
    ...transformVerbalNounForms(forms),
  ];
}

/**
 * Auto-detect form type by structure inspection when part-of-speech does not match.
 */
function autoDetectFormTransform(forms: Forms): TransformResult {
  if (isVerbForms(forms)) {
    return { forms: transformVerbForms(forms), type: "verb" };
  }

  if (isAdjectiveForms(forms)) {
    return { forms: transformAdjectiveForms(forms), type: "adjective" };
  }

  if (isNounForms(forms)) {
    return { forms: transformNounForms(forms), type: "noun" };
  }

  return null;
}

/**
 * Collect infinitive forms from all voices and tenses into result array.
 */
function collectInfinitiveForms(
  infinitive: NonNullable<NonNullable<VerbForms["nonFinite"]>["infinitive"]>,
  result: VerbForm[],
): void {
  for (const voice of VOICE_ORDER) {
    const voiceData = infinitive[voice];
    if (!voiceData) continue;

    for (const tense of ["present", "perfect", "future"] as const) {
      const formArray = voiceData[tense];
      if (!formArray || formArray.length === 0) continue;
      result.push({
        form: formArray.join(", "),
        mood: "infinitive",
        tense,
        voice,
      });
    }
  }
}

/**
 * Collect participle tense forms for one voice into result array.
 */
function collectParticipialTenseForms<T extends string>(args: {
  result: VerbForm[];
  tenseMap: Partial<Record<T, string[]>>;
  tenses: readonly T[];
  voice: string;
}): void {
  const { result, tenseMap, tenses, voice } = args;
  for (const tense of tenses) {
    const formArray = tenseMap[tense];
    if (!formArray?.length) continue;
    result.push({
      form: formArray.join(", "),
      mood: "participle",
      tense,
      voice,
    });
  }
}

/**
 * Collect participle forms (active and passive) into result array.
 */
function collectParticipleForms(
  participle: NonNullable<NonNullable<VerbForms["nonFinite"]>["participle"]>,
  result: VerbForm[],
): void {
  if (participle.active) {
    collectParticipialTenseForms({
      result,
      tenseMap: participle.active,
      tenses: ["present", "future"] as const,
      voice: "active",
    });
  }

  if (participle.passive) {
    collectParticipialTenseForms({
      result,
      tenseMap: participle.passive,
      tenses: ["perfect", "future"] as const,
      voice: "passive",
    });
  }
}

/**
 * Collect finite verb forms from a number/person structure into result array.
 */
function collectPersonNumberForms(args: {
  mood: string;
  persons: readonly ("first" | "second" | "third")[];
  result: VerbForm[];
  tense: string;
  tenseData: PersonNumberRecord;
  voice: string;
}): void {
  const { mood, persons, result, tense, tenseData, voice } = args;
  for (const number of NUMBER_ORDER) {
    const numberData = tenseData[number];
    if (!numberData) continue;

    for (const person of persons) {
      const formArray = numberData[person];
      if (!formArray || formArray.length === 0) continue;

      result.push({
        form: formArray.join(", "),
        mood,
        number,
        person: personDisplay(person),
        tense,
        voice,
      });
    }
  }
}

/**
 * Collect verbal noun case forms (gerund or supine) into result array.
 */
function collectVerbalNounCaseForms<T extends string>(args: {
  caseForms: Partial<Record<T, string[]>>;
  cases: readonly T[];
  mood: string;
  result: VerbForm[];
}): void {
  const { caseForms, cases, mood, result } = args;
  for (const caseName of cases) {
    const formArray = caseForms[caseName];
    if (!formArray || formArray.length === 0) continue;
    result.push({
      form: formArray.join(", "),
      mood,
      tense: caseName,
      voice: "active",
    });
  }
}

/**
 * Dispatch form transformation by part-of-speech string, then fall back to type-guard auto-detection.
 */
function dispatchFormTransform(pos: string, forms: Forms): TransformResult {
  if (pos === "verb" && isVerbForms(forms)) {
    return { forms: transformVerbForms(forms), type: "verb" };
  }

  if (isNounPos(pos) && isNounForms(forms)) {
    return { forms: transformNounForms(forms), type: "noun" };
  }

  if (isAdjectivePos(pos) && isAdjectiveForms(forms)) {
    return { forms: transformAdjectiveForms(forms), type: "adjective" };
  }

  return autoDetectFormTransform(forms);
}

/**
 * Determine if forms are adjective forms (has gender keys).
 */
function isAdjectiveForms(forms: Forms): forms is AdjectiveForms {
  return "masculine" in forms || "feminine" in forms || "neuter" in forms;
}

/**
 * Determine if the part-of-speech string maps to adjective forms.
 */
function isAdjectivePos(pos: string): boolean {
  return pos === "adjective" || pos === "participle" || pos === "numeral";
}

/**
 * Determine if forms are noun forms (has case keys directly with number groups).
 */
function isNounForms(forms: Forms): forms is NounForms {
  if ("masculine" in forms || "feminine" in forms || "neuter" in forms)
    return false;
  if ("indicative" in forms || "subjunctive" in forms) return false;

  const nominative = (forms as NounForms).nominative;
  return (
    nominative !== undefined &&
    ("singular" in nominative || "plural" in nominative)
  );
}

/**
 * Determine if the part-of-speech string maps to noun forms.
 */
function isNounPos(pos: string): boolean {
  return pos === "noun" || pos === "pronoun";
}

/**
 * Determine if forms are verb forms.
 */
function isVerbForms(forms: Forms): forms is VerbForms {
  return (
    "indicative" in forms ||
    "subjunctive" in forms ||
    "imperative" in forms ||
    "nonFinite" in forms
  );
}

/**
 * Helper to get person display string.
 */
function personDisplay(person: string): string {
  switch (person) {
    case "first": {
      return "1st";
    }
    case "second": {
      return "2nd";
    }
    case "third": {
      return "3rd";
    }
    default: {
      return person;
    }
  }
}

/**
 * Extract imperative mood forms into flat VerbForm rows.
 */
function transformImperativeForms(forms: VerbForms): VerbForm[] {
  const result: VerbForm[] = [];
  if (!forms.imperative) return result;

  for (const voice of VOICE_ORDER) {
    const voiceData = forms.imperative[voice];
    if (!voiceData) continue;

    for (const tense of ["present", "future"] as const) {
      const tenseData = voiceData[tense];
      if (!tenseData) continue;
      collectPersonNumberForms({
        mood: "imperative",
        persons: ["second", "third"],
        result,
        tense,
        tenseData,
        voice,
      });
    }
  }

  return result;
}

/**
 * Extract indicative mood forms into flat VerbForm rows.
 */
function transformIndicativeForms(forms: VerbForms): VerbForm[] {
  const result: VerbForm[] = [];
  if (!forms.indicative) return result;

  for (const voice of VOICE_ORDER) {
    const voiceData = forms.indicative[voice];
    if (!voiceData) continue;

    for (const tense of INDICATIVE_TENSE_ORDER) {
      const tenseData = voiceData[tense];
      if (!tenseData) continue;
      collectPersonNumberForms({
        mood: "indicative",
        persons: PERSON_ORDER,
        result,
        tense,
        tenseData,
        voice,
      });
    }
  }

  return result;
}

/**
 * Extract non-finite forms (infinitives and participles) into flat VerbForm rows.
 */
function transformNonFiniteForms(forms: VerbForms): VerbForm[] {
  const result: VerbForm[] = [];
  if (!forms.nonFinite) return result;

  if (forms.nonFinite.infinitive) {
    collectInfinitiveForms(forms.nonFinite.infinitive, result);
  }

  if (forms.nonFinite.participle) {
    collectParticipleForms(forms.nonFinite.participle, result);
  }

  return result;
}

/**
 * Extract subjunctive mood forms into flat VerbForm rows.
 */
function transformSubjunctiveForms(forms: VerbForms): VerbForm[] {
  const result: VerbForm[] = [];
  if (!forms.subjunctive) return result;

  for (const voice of VOICE_ORDER) {
    const voiceData = forms.subjunctive[voice];
    if (!voiceData) continue;

    for (const tense of SUBJUNCTIVE_TENSE_ORDER) {
      const tenseData = voiceData[tense];
      if (!tenseData) continue;
      collectPersonNumberForms({
        mood: "subjunctive",
        persons: PERSON_ORDER,
        result,
        tense,
        tenseData,
        voice,
      });
    }
  }

  return result;
}

/**
 * Extract verbal noun forms (gerund and supine) into flat VerbForm rows.
 */
function transformVerbalNounForms(forms: VerbForms): VerbForm[] {
  const result: VerbForm[] = [];
  if (!forms.verbalNoun) return result;

  if (forms.verbalNoun.gerund) {
    collectVerbalNounCaseForms({
      caseForms: forms.verbalNoun.gerund,
      cases: ["genitive", "dative", "accusative", "ablative"] as const,
      mood: "gerund",
      result,
    });
  }

  if (forms.verbalNoun.supine) {
    collectVerbalNounCaseForms({
      caseForms: forms.verbalNoun.supine,
      cases: ["accusative", "ablative"] as const,
      mood: "supine",
      result,
    });
  }

  return result;
}
