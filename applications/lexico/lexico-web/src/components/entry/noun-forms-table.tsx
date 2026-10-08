import * as React from "react";

import { FormsTable } from "./forms-table";

import type { FormCellProperties as FormCellProperties } from "./form-cell";

/**
 * Represents a single declined form of a noun.
 */
export interface NounForm {
  /** Grammatical case (nominative, genitive, etc.) */
  case: string;
  /** The declined form text */
  form: string;
  /** Grammatical number (singular or plural) */
  number: string;
}

/**
 * Properties for the NounFormsTable component.
 */
export interface NounFormsTableProperties {
  /** Additional class names */
  className?: string | undefined;
  /** Noun forms data */
  forms: NounForm[];
  /** Current search term for highlighting */
  search?: string | undefined;
}

// Case order for noun declension
const CASE_ORDER = [
  "nominative",
  "genitive",
  "dative",
  "accusative",
  "ablative",
  "vocative",
  "locative",
];
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
 * Build the singular + plural cell pair for one grammatical case.
 */
function buildNounCaseRow(
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
 * Render noun forms in a singular/plural table.
 */
function NounFormsTable(
  properties: NounFormsTableProperties,
): React.ReactElement {
  const { className, forms, search } = properties;
  const cells = React.useMemo(() => restructureNounForms(forms), [forms]);

  return (
    <div className={className}>
      <FormsTable
        forms={cells}
        search={search}
      />
    </div>
  );
}

/**
 * Restructure noun forms into a 2-column grid (singular, plural)
 * Each row is a case, columns are singular and plural.
 */
function restructureNounForms(forms: NounForm[]): FormCellProperties[] {
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
    buildNounCaseRow(caseName, byCase[caseName] ?? {}),
  );
}

export { NounFormsTable, restructureNounForms };
