import * as React from "react";

import { FormTabs } from "./form-tabs";
import { FormsTable } from "./forms-table";

import type { FormCellProperties as FormCellProperties } from "./form-cell";

/**
 * Represents a single declined form of an adjective.
 */
export interface AdjectiveForm {
  /** Grammatical case (nominative, genitive, etc.) */
  case: string;
  /** Degree of comparison (positive, comparative, superlative) */
  degree?: string | undefined;
  /** The declined form text */
  form: string;
  /** Grammatical gender (masculine, feminine, neuter) */
  gender: string;
  /** Grammatical number (singular or plural) */
  number: string;
}

/**
 * Properties for the AdjectiveFormsTable component.
 */
export interface AdjectiveFormsTableProperties {
  /** Additional class names */
  className?: string | undefined;
  /** Adjective forms data */
  forms: AdjectiveForm[];
  /** Current search term for highlighting */
  search?: string | undefined;
}

// Case order for adjective declension
const CASE_ORDER = [
  "nominative",
  "genitive",
  "dative",
  "accusative",
  "ablative",
  "vocative",
  "locative",
];
const GENDER_ORDER = ["masculine", "feminine", "neuter"];
const DEGREE_ORDER = ["positive", "comparative", "superlative"];

const CASE_ABBREVIATIONS: Record<string, string> = {
  ablative: "Abl.",
  accusative: "Acc.",
  dative: "Dat.",
  genitive: "Gen.",
  locative: "Loc.",
  nominative: "Nom.",
  vocative: "Voc.",
};

/**
 * Adjective form group.
 */
interface AdjectiveFormGroup {
  degree: string;
  genders: {
    cells: FormCellProperties[];
    gender: string;
  }[];
}

/**
 * Render adjective forms with degree and gender tab navigation.
 */
function AdjectiveFormsTable(
  properties: AdjectiveFormsTableProperties,
): null | React.ReactElement {
  const { className, forms, search } = properties;
  const grouped = React.useMemo(() => groupAdjectiveForms(forms), [forms]);

  const [activeDegree, setActiveDegree] = React.useState(0);
  const [activeGender, setActiveGender] = React.useState(0);

  const handleDegreeChange = (index: number): void => {
    setActiveDegree(index);
    setActiveGender(0);
  };

  if (grouped.length === 0) {
    return null;
  }

  const currentDegree = grouped[activeDegree];
  const degreeTabs = grouped.map((group) => group.degree);
  const genderContent = renderAdjectiveGenderContent({
    activeGender,
    currentDegree,
    search,
    setActiveGender,
  });

  if (grouped.length > 1) {
    return (
      <div className={className}>
        <FormTabs
          activeTab={activeDegree}
          onTabChange={handleDegreeChange}
          tabs={degreeTabs}
        >
          {genderContent}
        </FormTabs>
      </div>
    );
  }

  return <div className={className}>{genderContent}</div>;
}

/**
 * Build the singular + plural cell pair for one grammatical case.
 */
function buildAdjectiveCaseRow(
  caseName: string,
  caseData: { plural?: string; singular?: string },
): [FormCellProperties, FormCellProperties] {
  return [
    {
      centerText: caseData.singular || "-",
      topLeftText: CASE_ABBREVIATIONS[caseName] || caseName,
      topRightText: "SG",
    },
    {
      centerText: caseData.plural || "-",
      topRightText: "PL",
    },
  ];
}

/**
 * Build degree groups when the forms include degree data.
 */
function buildDegreeGroupsFromForms(
  forms: AdjectiveForm[],
): AdjectiveFormGroup[] {
  const grouped: Record<string, AdjectiveForm[]> = {};

  for (const form of forms) {
    const degree = form.degree?.toLowerCase() ?? "positive";
    if (!grouped[degree]) grouped[degree] = [];
    grouped[degree].push(form);
  }

  const result: AdjectiveFormGroup[] = [];

  for (const degree of DEGREE_ORDER) {
    if (!grouped[degree]) continue;
    const genders = groupByGender(grouped[degree]);
    if (genders.length > 0) result.push({ degree, genders });
  }

  return result;
}

/**
 * Group adjective forms by degree -\> gender for tabs.
 */
function groupAdjectiveForms(forms: AdjectiveForm[]): AdjectiveFormGroup[] {
  if (!forms.some((form) => form.degree)) {
    return [{ degree: "positive", genders: groupByGender(forms) }];
  }
  return buildDegreeGroupsFromForms(forms);
}

/**
 * Group forms by gender and restructure into cells.
 */
function groupByGender(forms: AdjectiveForm[]): AdjectiveFormGroup["genders"] {
  const grouped: Record<string, AdjectiveForm[]> = {};

  for (const form of forms) {
    const gender = form.gender.toLowerCase();
    if (!grouped[gender]) grouped[gender] = [];
    grouped[gender].push(form);
  }

  const result: AdjectiveFormGroup["genders"] = [];

  for (const gender of GENDER_ORDER) {
    if (!grouped[gender]) continue;

    const cells = restructureAdjectiveForms(grouped[gender]);
    if (cells.length > 0) {
      result.push({ cells, gender });
    }
  }

  return result;
}

/**
 * Render the gender tabs (and forms table) for the currently selected degree.
 */
function renderAdjectiveGenderContent(args: {
  activeGender: number;
  currentDegree: AdjectiveFormGroup | undefined;
  search: string | undefined;
  setActiveGender: (index: number) => void;
}): null | React.ReactElement {
  const { activeGender, currentDegree, search, setActiveGender } = args;
  const genderTabs =
    currentDegree?.genders.map((gender) => gender.gender) ?? [];
  const currentGender = currentDegree?.genders[activeGender];
  const formsTable = currentGender ? (
    <FormsTable
      forms={currentGender.cells}
      search={search}
    />
  ) : null;

  if (genderTabs.length > 1) {
    return (
      <FormTabs
        activeTab={activeGender}
        onTabChange={setActiveGender}
        tabs={genderTabs}
      >
        {formsTable}
      </FormTabs>
    );
  }

  return formsTable;
}

/**
 * Restructure adjective forms for a specific gender into cells.
 */
function restructureAdjectiveForms(
  forms: AdjectiveForm[],
): FormCellProperties[] {
  const byCase: Record<string, { plural?: string; singular?: string }> = {};

  for (const form of forms) {
    const caseName = form.case.toLowerCase();
    if (!byCase[caseName]) byCase[caseName] = {};
    const number = form.number.toLowerCase();
    if (number === "singular") {
      byCase[caseName].singular = form.form;
    } else if (number === "plural") {
      byCase[caseName].plural = form.form;
    }
  }

  return CASE_ORDER.filter((caseName) => byCase[caseName]).flatMap((caseName) =>
    buildAdjectiveCaseRow(caseName, byCase[caseName] ?? {}),
  );
}

export { AdjectiveFormsTable, groupAdjectiveForms, restructureAdjectiveForms };
