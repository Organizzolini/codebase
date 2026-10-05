import { startCase } from "lodash";

import {
  Badge,
  cn,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@codebase/components-web";

import type { ReactElement } from "react";

// Abbreviation mappings
const abbreviations: Record<string, string> = {
  // Parts of speech
  adjective: "ADJ",
  adverb: "ADV",
  conjunction: "CJN",
  determiner: "PRON",
  interjection: "!!",
  noun: "NOUN",
  numeral: "NUM",
  preposition: "PREP",
  pronoun: "PRON",
  properNoun: "PN",
  suffix: "-X-",
  verb: "VERB",
  // Cases
  ablative: "ABL",
  accusative: "ACC",
  dative: "DAT",
  genitive: "GEN",
  locative: "LOC",
  nominative: "NOM",
  vocative: "VOC",
  // Gender
  feminine: "FEM",
  masculine: "MASC",
  neuter: "NEU",
  // Number
  plural: "P",
  singular: "S",
  // Mood
  imperative: "IMPV",
  indicative: "IND",
  infinitive: "INF",
  "non finite": "NONF",
  subjunctive: "SUB",
  // Tense
  future: "FUT",
  "future perfect": "FUTP",
  imperfect: "IMP",
  perfect: "PERF",
  pluperfect: "PLUP",
  present: "PRES",
  // Misc
  gerund: "GER",
  "gerund/supine": "GER/SUP",
  participle: "PART",
  supine: "SUP",
  // Voice
  active: "ACT",
  passive: "PAS",
  // Person
  first: "1",
  second: "2",
  third: "3",
  // Declensions
  "fifth declension": "5TH DECL",
  "first declension": "1ST DECL",
  "fourth declension": "4TH DECL",
  "second declension": "2ND DECL",
  "third declension": "3RD DECL",
  // Conjugations
  "first conjugation": "1ST CONJ",
  "fourth conjugation": "4TH CONJ",
  "second conjugation": "2ND CONJ",
  "third conjugation": "3RD CONJ",
};

// Color styles for each identifier type
const identifierStyles: Record<
  string,
  { background: string; border?: string; rounded?: boolean; text: string }
> = {
  // Parts of speech (rounded)
  adjective: { background: "bg-green-600", rounded: true, text: "text-white" },
  adverb: { background: "bg-orange-500", rounded: true, text: "text-black" },
  conjunction: { background: "bg-pink-400", rounded: true, text: "text-black" },
  determiner: {
    background: "bg-purple-600",
    rounded: true,
    text: "text-white",
  },
  interjection: { background: "bg-black", rounded: true, text: "text-white" },
  noun: { background: "bg-blue-600", rounded: true, text: "text-white" },
  numeral: { background: "bg-gray-500", rounded: true, text: "text-black" },
  preposition: {
    background: "bg-yellow-400",
    rounded: true,
    text: "text-black",
  },
  pronoun: { background: "bg-purple-600", rounded: true, text: "text-white" },
  properNoun: { background: "bg-blue-600", rounded: true, text: "text-white" },
  suffix: { background: "bg-black", rounded: true, text: "text-white" },
  verb: { background: "bg-red-600", rounded: true, text: "text-white" },
  // Cases
  ablative: { background: "bg-pink-500", text: "text-white" },
  accusative: { background: "bg-red-500", text: "text-white" },
  dative: { background: "bg-lime-400", text: "text-black" },
  genitive: { background: "bg-green-700", text: "text-white" },
  locative: { background: "bg-amber-800", text: "text-white" },
  nominative: { background: "bg-blue-500", text: "text-white" },
  vocative: { background: "bg-orange-600", text: "text-white" },
  // Gender
  feminine: { background: "bg-green-500", text: "text-white" },
  masculine: { background: "bg-orange-500", text: "text-white" },
  neuter: { background: "bg-purple-500", text: "text-white" },
  // Number
  plural: { background: "bg-black", text: "text-white" },
  singular: { background: "bg-white", text: "text-black" },
  // Mood
  imperative: { background: "bg-rose-900", text: "text-white" },
  indicative: { background: "bg-sky-600", text: "text-white" },
  infinitive: { background: "bg-lime-500", text: "text-black" },
  "non finite": { background: "bg-olive-600", text: "text-black" },
  subjunctive: { background: "bg-fuchsia-500", text: "text-white" },
  // Tense
  future: { background: "bg-yellow-500", text: "text-black" },
  "future perfect": { background: "bg-emerald-600", text: "text-black" },
  imperfect: { background: "bg-green-800", text: "text-white" },
  perfect: { background: "bg-red-700", text: "text-white" },
  pluperfect: { background: "bg-indigo-700", text: "text-white" },
  present: { background: "bg-blue-600", text: "text-white" },
  // Misc
  gerund: { background: "bg-amber-500", text: "text-black" },
  "gerund/supine": { background: "bg-orange-400", text: "text-black" },
  participle: { background: "bg-sky-400", text: "text-black" },
  supine: { background: "bg-pink-600", text: "text-white" },
  // Voice
  active: {
    background: "bg-neutral-600",
    border: "border border-white",
    text: "text-white",
  },
  passive: {
    background: "bg-neutral-400",
    border: "border-2 border-black",
    text: "text-black",
  },
  // Person
  first: { background: "bg-blue-600", text: "text-white" },
  second: { background: "bg-red-600", text: "text-white" },
  third: { background: "bg-yellow-400", text: "text-black" },
};

/**
 * Properties for the Identifier component that displays labeled badges.
 */
export interface IdentifierProperties {
  /** Additional class names */
  className?: string;
  /** The identifier name (e.g., "noun", "nominative", "singular") */
  identifier: string;
}

/**
 * Badge component that displays abbreviated identifiers with tooltips.
 *
 */
export function Identifier(properties: IdentifierProperties): ReactElement {
  const { className, identifier } = properties;

  const identifierLowercase = identifier.toLowerCase();
  const abbreviation =
    abbreviations[identifierLowercase] ?? identifier.toUpperCase().slice(0, 4);
  const styles = identifierStyles[identifierLowercase] ?? {
    background: "bg-gray-600",
    text: "text-white",
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          className={cn(
            "cursor-default px-1 justify-center",
            styles.background,
            styles.text,
            styles.border,
            className,
          )}
          variant="outline"
        >
          {abbreviation}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="right">{startCase(identifier)}</TooltipContent>
    </Tooltip>
  );
}

export { abbreviations, identifierStyles };
