import * as React from "react";

import { FormTabs } from "./form-tabs";
import { FormsTable } from "./forms-table";

import type { FormCellProperties as FormCellProperties } from "./form-cell";

/**
 * Represents a single conjugated form of a verb.
 */
export interface VerbForm {
  /** The conjugated form text */
  form: string;
  /** Grammatical mood (indicative, subjunctive, imperative) */
  mood: string;
  /** Grammatical number (singular or plural) */
  number?: string | undefined;
  /** Grammatical person (first, second, third) */
  person?: string | undefined;
  /** Tense (present, imperfect, future, etc.) */
  tense: string;
  /** Voice (active, passive) */
  voice: string;
}

/**
 * Properties for the VerbFormsTable component.
 */
export interface VerbFormsTableProperties {
  /** Additional class names */
  className?: string | undefined;
  /** Verb forms data */
  forms: VerbForm[];
  /** Current search term for highlighting */
  search?: string | undefined;
}

// Mood order
const MOOD_ORDER = [
  "indicative",
  "subjunctive",
  "imperative",
  "infinitive",
  "participle",
  "gerund",
  "supine",
];
const TENSE_ORDER = [
  "present",
  "imperfect",
  "future",
  "perfect",
  "pluperfect",
  "future perfect",
];
const VOICE_ORDER = ["active", "passive"];
const PERSON_ORDER = ["1st", "2nd", "3rd"];

const PERSON_ABBREVIATIONS: Record<string, string> = {
  "1st": "1st",
  "2nd": "2nd",
  "3rd": "3rd",
};

const NUMBER_ABBREVIATIONS: Record<string, string> = {
  plural: "PL",
  singular: "SG",
};

/**
 * Verb form group.
 */
interface VerbFormGroup {
  mood: string;
  tenses: {
    tense: string;
    voices: {
      cells: FormCellProperties[];
      voice: string;
    }[];
  }[];
}

/**
 * Build the singular + plural cell pair for one grammatical person.
 */
function buildPersonCells(
  person: string,
  byPersonNumber: Record<string, string>,
): FormCellProperties[] {
  const singularKey = `${person.toLowerCase()}-singular`;
  const pluralKey = `${person.toLowerCase()}-plural`;
  const singularForm = byPersonNumber[singularKey];
  const pluralForm = byPersonNumber[pluralKey];

  if (!singularForm && !pluralForm) return [];

  return [
    {
      centerText: singularForm || "-",
      topLeftText: PERSON_ABBREVIATIONS[person] || person,
      topRightText: NUMBER_ABBREVIATIONS["singular"],
    },
    {
      centerText: pluralForm || "-",
      topRightText: NUMBER_ABBREVIATIONS["plural"],
    },
  ];
}

/**
 * Convert a mood's nested tense/voice record into the ordered tenses array.
 */
function buildVerbFormTenses(
  moodGroup: Record<string, Record<string, VerbForm[]>>,
): VerbFormGroup["tenses"] {
  const tenses: VerbFormGroup["tenses"] = [];

  for (const tense of TENSE_ORDER) {
    if (!moodGroup[tense]) continue;

    const voices: VerbFormGroup["tenses"][0]["voices"] = [];

    for (const voice of VOICE_ORDER) {
      if (!moodGroup[tense][voice]) continue;
      const cells = restructureVerbForms(moodGroup[tense][voice]);
      if (cells.length > 0) voices.push({ cells, voice });
    }

    if (voices.length > 0) tenses.push({ tense, voices });
  }

  return tenses;
}

/**
 * Build a nested record of mood -\> tense -\> voice -\> VerbForm[].
 */
function buildVerbGroupRecord(
  forms: VerbForm[],
): Record<string, Record<string, Record<string, VerbForm[]>>> {
  const grouped: Record<
    string,
    Record<string, Record<string, VerbForm[]>>
  > = {};

  for (const form of forms) {
    const mood = form.mood.toLowerCase();
    const tense = form.tense.toLowerCase();
    const voice = form.voice.toLowerCase();

    if (!grouped[mood]) grouped[mood] = {};
    if (!grouped[mood][tense]) grouped[mood][tense] = {};
    if (!grouped[mood][tense][voice]) grouped[mood][tense][voice] = [];

    grouped[mood][tense][voice].push(form);
  }

  return grouped;
}

/**
 * Group verb forms by mood -\> tense -\> voice for nested tabs.
 */
function groupVerbForms(forms: VerbForm[]): VerbFormGroup[] {
  const grouped = buildVerbGroupRecord(forms);
  const result: VerbFormGroup[] = [];

  for (const mood of MOOD_ORDER) {
    if (!grouped[mood]) continue;
    const tenses = buildVerbFormTenses(grouped[mood]);
    if (tenses.length > 0) result.push({ mood, tenses });
  }

  return result;
}

/**
 * Render inner tense/voice tab hierarchy for a given state selection.
 */
function renderVerbFormContent(args: {
  activeTense: number;
  activeVoice: number;
  currentVoice: undefined | VerbFormGroup["tenses"][0]["voices"][0];
  search: string | undefined;
  setActiveTense: (index: number) => void;
  setActiveVoice: (index: number) => void;
  tenseTabs: string[];
  voiceTabs: string[];
}): null | React.ReactElement {
  const {
    activeTense,
    activeVoice,
    currentVoice,
    search,
    setActiveTense,
    setActiveVoice,
    tenseTabs,
    voiceTabs,
  } = args;
  const formsTable = currentVoice ? (
    <FormsTable
      forms={currentVoice.cells}
      search={search}
    />
  ) : null;

  const voiceTabsNode =
    voiceTabs.length > 1 ? (
      <FormTabs
        activeTab={activeVoice}
        onTabChange={setActiveVoice}
        tabs={voiceTabs}
      >
        {formsTable}
      </FormTabs>
    ) : (
      formsTable
    );

  if (tenseTabs.length > 1) {
    return (
      <FormTabs
        activeTab={activeTense}
        onTabChange={setActiveTense}
        tabs={tenseTabs}
      >
        {voiceTabsNode}
      </FormTabs>
    );
  }

  return voiceTabsNode;
}

/**
 * Restructure verb forms for a specific mood/tense/voice into cells.
 */
function restructureVerbForms(forms: VerbForm[]): FormCellProperties[] {
  const byPersonNumber: Record<string, string> = {};

  for (const form of forms) {
    const person = form.person?.toLowerCase() ?? "";
    const number = form.number?.toLowerCase() ?? "";
    byPersonNumber[`${person}-${number}`] = form.form;
  }

  const hasPerson = forms.some((form) => form.person);
  if (!hasPerson) {
    return forms.map((form) => ({ centerText: form.form || "-" }));
  }

  return PERSON_ORDER.flatMap((person) =>
    buildPersonCells(person, byPersonNumber),
  );
}

/**
 * Render verb forms with mood, tense, and voice tab navigation.
 */
function VerbFormsTable(
  properties: VerbFormsTableProperties,
): null | React.ReactElement {
  const { className, forms, search } = properties;
  const grouped = React.useMemo(() => groupVerbForms(forms), [forms]);

  const [activeMood, setActiveMood] = React.useState(0);
  const [activeTense, setActiveTense] = React.useState(0);
  const [activeVoice, setActiveVoice] = React.useState(0);

  const handleMoodChange = (index: number): void => {
    setActiveMood(index);
    setActiveTense(0);
    setActiveVoice(0);
  };

  const handleTenseChange = (index: number): void => {
    setActiveTense(index);
    setActiveVoice(0);
  };

  if (grouped.length === 0) {
    return null;
  }

  const currentMood = grouped[activeMood];
  const currentTense = currentMood?.tenses[activeTense];
  const currentVoice = currentTense?.voices[activeVoice];

  const moodTabs = grouped.map((group) => group.mood);
  const tenseTabs = currentMood?.tenses.map((tense) => tense.tense) ?? [];
  const voiceTabs = currentTense?.voices.map((voice) => voice.voice) ?? [];

  return (
    <div className={className}>
      <FormTabs
        activeTab={activeMood}
        onTabChange={handleMoodChange}
        tabs={moodTabs}
      >
        {renderVerbFormContent({
          activeTense,
          activeVoice,
          currentVoice,
          search,
          setActiveTense: handleTenseChange,
          setActiveVoice,
          tenseTabs,
          voiceTabs,
        })}
      </FormTabs>
    </div>
  );
}

export { groupVerbForms, restructureVerbForms, VerbFormsTable };
