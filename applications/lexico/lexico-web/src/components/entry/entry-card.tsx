import { type ReactElement, useState } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Card,
  CardContent,
  CardHeader,
  cn,
  Separator,
} from "@codebase/components-web";

import { AdjectiveFormsTable } from "./adjective-forms-table";
import { NounFormsTable } from "./noun-forms-table";
import { PrincipalParts } from "./principal-parts";
import { Translations } from "./translations";
import { VerbFormsTable } from "./verb-forms-table";

import type { PartOfSpeech, Pronunciation } from "../../lib/types";
import type { AdjectiveForm } from "./adjective-forms-table";
import type { NounForm } from "./noun-forms-table";
import type { Inflection, PrincipalPart } from "./principal-parts";
import type { VerbForm } from "./verb-forms-table";

/**
 * Inputs for rendering one lexical entry with principal parts and expandable
 * translation/pronunciation/forms sections.
 */
export interface EntryCardProperties {
  /** Whether entry is bookmarked */
  bookmarked?: boolean;
  /** Additional class names */
  className?: string;
  /** Etymology text */
  etymology?: null | string;
  /** Transformed forms data */
  forms?: FormsData | null;
  /** Entry ID */
  id: string;
  /** Inflection data */
  inflection?: Inflection | null;
  /** Whether this result is from a Latin search (adds accent border) */
  isLatinSearchResult?: boolean;
  /** Callback when bookmark is toggled */
  onBookmarkToggle: (id: string) => void;
  /** Part of speech */
  partOfSpeech: PartOfSpeech;
  /** Principal parts array or object */
  principalParts: PrincipalPart[] | Record<string, string | undefined>;
  /** Pronunciation data */
  pronunciation?: null | Pronunciation;
  /** Translation strings */
  translations: string[];
  /** Whether translations are expanded by default */
  translationsExpanded?: boolean;
}

/**
 * Discriminated form payload used to choose the proper forms table renderer.
 */
export type FormsData =
  | { forms: AdjectiveForm[]; type: "adjective" }
  | { forms: NounForm[]; type: "noun" }
  | { forms: VerbForm[]; type: "verb" };

/**
 * Inputs for the collapsible detail area inside an entry card.
 */
interface EntryCardBodyProperties {
  accordionValue: string;
  etymology?: null | string;
  forms?: FormsData | null;
  onAccordionChange: (value: string) => void;
  pronunciation?: null | Pronunciation;
  translations: string[];
  translationsExpanded: boolean;
}

// 📋 Forms accordion section

/**
 * Forms accordion item props.
 */
interface FormsAccordionItemProperties {
  forms: EntryCardBodyProperties["forms"];
  hasEtymology: boolean;
}

// 🔊 Pronunciation accordion section

/**
 * Pronunciation accordion item props.
 */
interface PronunciationAccordionItemProperties {
  hasNext: boolean;
  pronunciation: EntryCardBodyProperties["pronunciation"];
}

/**
 * Renders a lexical entry card and wires accordion state for detail sections.
 */
export function EntryCard(properties: EntryCardProperties): ReactElement {
  const {
    bookmarked,
    etymology,
    forms,
    id,
    inflection,
    onBookmarkToggle,
    partOfSpeech,
    principalParts,
    pronunciation,
    translations,
    translationsExpanded = false,
    // isLatinSearchResult = true,
    className,
  } = properties;

  // 🪝 Hooks
  const [accordionValue, setAccordionValue] = useState(
    translationsExpanded ? "translations" : "",
  );

  // 🏗 Setup

  // 💪 Handlers

  // 🎨 Markup

  // 🔌 Short Circuits

  return (
    <Card className={cn(className)}>
      <CardHeader className="p-0">
        <PrincipalParts
          bookmarked={bookmarked}
          id={id}
          inflection={inflection}
          onBookmarkToggle={onBookmarkToggle}
          partOfSpeech={partOfSpeech}
          principalParts={principalParts}
        />
      </CardHeader>
      <Separator />
      <EntryCardBody
        accordionValue={accordionValue}
        {...(etymology !== undefined && { etymology })}
        {...(forms !== undefined && { forms })}
        onAccordionChange={setAccordionValue}
        {...(pronunciation !== undefined && { pronunciation })}
        translations={translations}
        translationsExpanded={translationsExpanded}
      />
    </Card>
  );
}

/**
 * Renders translations and optional pronunciation/forms/etymology sections for one entry.
 */
function EntryCardBody(properties: EntryCardBodyProperties): ReactElement {
  const {
    accordionValue,
    etymology,
    forms,
    onAccordionChange,
    pronunciation,
    translations,
    translationsExpanded,
  } = properties;

  const hasEtymology = Boolean(etymology);

  return (
    <CardContent>
      <Translations
        defaultOpen={translationsExpanded}
        translations={translations}
      />
      <Separator />
      <Accordion
        type="single"
        collapsible
        {...(accordionValue ? { value: accordionValue } : {})}
        onValueChange={(value: string) => onAccordionChange(value || "")}
      >
        <PronunciationAccordionItem
          hasNext={Boolean(forms) || hasEtymology}
          pronunciation={pronunciation}
        />
        <FormsAccordionItem
          forms={forms}
          hasEtymology={hasEtymology}
        />
        {etymology && (
          <AccordionItem
            className="border-b-0"
            value="etymology"
          >
            <AccordionTrigger className="px-4 text-sm font-medium">
              Etymology
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <p className="text-sm text-foreground">{etymology}</p>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </CardContent>
  );
}

/**
 * Forms accordion item.
 */
function FormsAccordionItem(
  properties: FormsAccordionItemProperties,
): null | ReactElement {
  const { forms, hasEtymology } = properties;
  if (!forms) return null;

  return (
    <>
      <AccordionItem
        className="border-b-0 group"
        value="forms"
      >
        <AccordionTrigger className="px-4 text-sm font-medium">
          Forms
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4">
          {forms.type === "noun" && <NounFormsTable forms={forms.forms} />}
          {forms.type === "verb" && <VerbFormsTable forms={forms.forms} />}
          {forms.type === "adjective" && (
            <AdjectiveFormsTable forms={forms.forms} />
          )}
        </AccordionContent>
      </AccordionItem>
      {hasEtymology && <Separator />}
    </>
  );
}

/**
 * Pronunciation accordion item.
 */
function PronunciationAccordionItem(
  properties: PronunciationAccordionItemProperties,
): null | ReactElement {
  const { hasNext, pronunciation } = properties;
  const classical = pronunciation?.classical;
  const ecclesiastical = pronunciation?.ecclesiastical;

  if (!classical && !ecclesiastical) return null;

  return (
    <>
      <AccordionItem
        className="border-b-0"
        value="pronunciation"
      >
        <AccordionTrigger className="px-4 text-sm font-medium">
          Pronunciation
        </AccordionTrigger>
        <AccordionContent className="px-4 space-y-2 text-sm pb-4">
          {classical?.phonetic && (
            <div className="flex items-start gap-2">
              <span className="font-medium text-muted-foreground">
                Classical:
              </span>
              <span className="font-mono">{classical.phonetic}</span>
            </div>
          )}
          {ecclesiastical?.phonetic && (
            <div className="flex items-start gap-2">
              <span className="font-medium text-muted-foreground">
                Ecclesiastical:
              </span>
              <span className="font-mono">{ecclesiastical.phonetic}</span>
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
      {hasNext && <Separator />}
    </>
  );
}
