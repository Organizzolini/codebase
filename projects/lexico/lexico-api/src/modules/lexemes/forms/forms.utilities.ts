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

import { AdjectivalFormType } from "./adjectival-form.entities";
import { AdverbFormType } from "./adverb-form.entities";
import { FiniteVerbFormType } from "./finite-verb-form.entities";
import { GerundFormType } from "./gerund-form.entities";
import { InfinitiveFormType } from "./infinitive-form.entities";
import { NominalFormType } from "./nominal-form.entities";
import { ParticipleFormType } from "./participle-form.entities";
import { SupineFormType } from "./supine-form.entities";

import type { GraphQLFields } from "../../../lexico-api.types";
import type { FormType } from "./form.entities";

/**
 * Maps a form entity to the GraphQL type of its own kind, the class the
 * `Form` interface resolves a returned form by.
 */
export function toFormType(form: Form): FormType {
  if (form instanceof NominalForm) {
    return Object.assign(new NominalFormType(), {
      case: form.case,
      id: form.id,
      number: form.number,
    } satisfies GraphQLFields<NominalFormType>);
  }
  if (form instanceof AdjectivalForm) {
    return Object.assign(new AdjectivalFormType(), {
      case: form.case,
      gender: form.gender,
      id: form.id,
      number: form.number,
    } satisfies GraphQLFields<AdjectivalFormType>);
  }
  if (form instanceof FiniteVerbForm) {
    return Object.assign(new FiniteVerbFormType(), {
      id: form.id,
      mood: form.mood,
      number: form.number,
      person: form.person,
      tense: form.tense,
      voice: form.voice,
    } satisfies GraphQLFields<FiniteVerbFormType>);
  }
  return toNonFiniteFormType(form);
}

/** Maps the verbal-noun, participle, infinitive, and adverb forms. */
function toNonFiniteFormType(form: Form): FormType {
  if (form instanceof ParticipleForm) {
    return Object.assign(new ParticipleFormType(), {
      id: form.id,
      tense: form.tense,
      voice: form.voice,
    } satisfies GraphQLFields<ParticipleFormType>);
  }
  if (form instanceof InfinitiveForm) {
    return Object.assign(new InfinitiveFormType(), {
      id: form.id,
      tense: form.tense,
      voice: form.voice,
    } satisfies GraphQLFields<InfinitiveFormType>);
  }
  return toVerbalNounFormType(form);
}

/** Maps the gerund, supine, and adverb forms, the last of the kinds. */
function toVerbalNounFormType(form: Form): FormType {
  if (form instanceof GerundForm) {
    return Object.assign(new GerundFormType(), {
      case: form.case,
      id: form.id,
    } satisfies GraphQLFields<GerundFormType>);
  }
  if (form instanceof SupineForm) {
    return Object.assign(new SupineFormType(), {
      case: form.case,
      id: form.id,
    } satisfies GraphQLFields<SupineFormType>);
  }
  if (form instanceof AdverbForm) {
    return Object.assign(new AdverbFormType(), {
      degree: form.degree,
      id: form.id,
    } satisfies GraphQLFields<AdverbFormType>);
  }
  throw new TypeError(
    `Form ${form.id} has no GraphQL type for its class ${form.constructor.name}`,
  );
}
