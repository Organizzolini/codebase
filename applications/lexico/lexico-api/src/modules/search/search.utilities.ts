import {
  AdjectivalForm,
  AdverbForm,
  FiniteVerbForm,
  type Form,
  GerundForm,
  InfinitiveForm,
  NominalForm,
  ParticipleForm,
  SupineForm,
} from "@codebase/lexico-entities";

import { fromCursorSafe, toCursor } from "../../lexico-api.utilities";
import { toLexemeType } from "../lexemes/lexemes.utilities";
import { ENTITY_ID_PATTERN } from "../literature/literature.constants";

import {
  ENCLITIC_FALSE_POSITIVES,
  ENCLITIC_SUFFIXES,
  LATIN_TIER_SOURCES,
} from "./search.constants";
import { LexemeSearchResult, SearchMatchSource } from "./search.entities";

import type { GraphQLFields } from "../../lexico-api.types";
import type { CursorClaim } from "../literature/literature.types";
import type {
  EncliticDecompositionResult,
  LexemeSearchMatch,
  SearchCursorPayload,
} from "./search.types";

/**
 * Decomposes possible Latin enclitic suffixes (-que, -ve, -ne) from a query string.
 */
export function decomposeEnclitic(
  rawQuery: string,
): EncliticDecompositionResult {
  const normalized = rawQuery.trim().toLowerCase();
  if (ENCLITIC_FALSE_POSITIVES.has(normalized)) {
    return { enclitic: null, stem: normalized };
  }

  for (const suffix of ENCLITIC_SUFFIXES) {
    const minimumLength = suffix.length + 1;
    if (normalized.endsWith(suffix) && normalized.length > minimumLength) {
      return {
        enclitic: suffix,
        stem: normalized.slice(0, -suffix.length),
      };
    }
  }

  return { enclitic: null, stem: normalized };
}

/**
 * Formats grammatical and morphological description strings from a lexical Form.
 */
export function formatFormIdentifier(form: Form): null | string {
  if (form instanceof FiniteVerbForm) {
    const parts = [
      `${form.person} person`,
      form.number,
      form.tense,
      form.voice,
      form.mood,
    ];
    return parts.join(" ");
  }

  return formatDeclinedForm(form);
}

/**
 * Reads the lexeme and score a search cursor names, as the row it claims:
 * its id, and its negated score as the sort key the ranking pages by. Null
 * for anything that is not the canonical cursor of a scored lexeme.
 */
export function readSearchCursor(cursor: string): CursorClaim | null {
  const payload = fromCursorSafe<null | { id?: unknown; score?: unknown }>(
    cursor,
  );
  const id = payload?.id;
  const score = payload?.score;
  return typeof id === "string" &&
    ENTITY_ID_PATTERN.test(id) &&
    typeof score === "number" &&
    toCursor({ id, score } satisfies SearchCursorPayload) === cursor
    ? { id, key: -score }
    : null;
}

/**
 * Names the Latin tier a lexeme's best score came from, reading a score no
 * tier gives as the lowest tier, fuzzy matching.
 */
export function toLatinMatchSource(score: number): SearchMatchSource {
  return LATIN_TIER_SOURCES.get(score) ?? SearchMatchSource.FUZZY;
}

/**
 * Maps a search match, and the lexeme it matched, to the result the API returns.
 */
export function toLexemeSearchResult(
  match: LexemeSearchMatch,
): LexemeSearchResult {
  return Object.assign(new LexemeSearchResult(), {
    enclitic: match.enclitic,
    identifiers: match.identifiers,
    lexeme: toLexemeType(match.lexeme),
    score: match.score,
    source: match.source,
  } satisfies GraphQLFields<LexemeSearchResult>);
}

/**
 * Reads a ranked row's score back from the sort key it pages by, which is the
 * score negated so the best score sorts first.
 */
export function toRankedScore(key: unknown): number {
  return -Number(key);
}

/**
 * Formats nominal, adjectival, and participial declined forms.
 */
function formatDeclinedForm(form: Form): null | string {
  if (form instanceof NominalForm) {
    return [form.case, form.number].join(" ");
  }
  if (form instanceof AdjectivalForm) {
    return [form.case, form.number, form.gender].join(" ");
  }
  if (form instanceof ParticipleForm) {
    return [form.tense, form.voice, "participle"].join(" ");
  }
  return formatNonFiniteForm(form);
}

/**
 * Formats non-finite verb and uninflected forms like infinitives, gerunds, supines, and adverbs.
 */
function formatNonFiniteForm(form: Form): null | string {
  if (form instanceof InfinitiveForm) {
    return [form.tense, form.voice, "infinitive"].join(" ");
  }
  if (form instanceof GerundForm) {
    return [form.case, "gerund"].join(" ");
  }
  if (form instanceof SupineForm) {
    return [form.case, "supine"].join(" ");
  }
  if (form instanceof AdverbForm) {
    return [form.degree, "adverb"].join(" ");
  }
  return null;
}
