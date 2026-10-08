import {
  AdjectiveInflection,
  AdverbInflection,
  type Inflection,
  NounInflection,
  PrepositionInflection,
  UninflectedInflection,
  VerbInflection,
} from "@codebase/lexico-entities";

import { AdjectiveInflectionType } from "./adjective-inflection.entities";
import { AdverbInflectionType } from "./adverb-inflection.entities";
import { NounInflectionType } from "./noun-inflection.entities";
import { PrepositionInflectionType } from "./preposition-inflection.entities";
import { UninflectedInflectionType } from "./uninflected-inflection.entities";
import { VerbInflectionType } from "./verb-inflection.entities";

import type { GraphQLFields } from "../../../lexico-api.types";
import type { InflectionType } from "./inflection.entities";

/**
 * Maps an inflection entity to the GraphQL type of its own part of speech,
 * the class the `Inflection` interface resolves a returned inflection by.
 */
export function toInflectionType(inflection: Inflection): InflectionType {
  if (inflection instanceof NounInflection) {
    return Object.assign(new NounInflectionType(), {
      declension: inflection.declension,
      gender: inflection.gender,
      id: inflection.id,
    } satisfies GraphQLFields<NounInflectionType>);
  }
  if (inflection instanceof VerbInflection) {
    return Object.assign(new VerbInflectionType(), {
      conjugation: inflection.conjugation,
      id: inflection.id,
      other: inflection.other,
    } satisfies GraphQLFields<VerbInflectionType>);
  }
  if (inflection instanceof AdjectiveInflection) {
    return Object.assign(new AdjectiveInflectionType(), {
      declension: inflection.declension,
      degree: inflection.degree,
      id: inflection.id,
    } satisfies GraphQLFields<AdjectiveInflectionType>);
  }
  return toInvariableInflectionType(inflection);
}

/** Maps the adverb, preposition, and uninflected inflections. */
function toInvariableInflectionType(inflection: Inflection): InflectionType {
  if (inflection instanceof AdverbInflection) {
    return Object.assign(new AdverbInflectionType(), {
      adverbType: inflection.adverbType,
      degree: inflection.degree,
      id: inflection.id,
    } satisfies GraphQLFields<AdverbInflectionType>);
  }
  if (inflection instanceof PrepositionInflection) {
    return Object.assign(new PrepositionInflectionType(), {
      case: inflection.case,
      id: inflection.id,
      other: inflection.other,
    } satisfies GraphQLFields<PrepositionInflectionType>);
  }
  if (inflection instanceof UninflectedInflection) {
    return Object.assign(new UninflectedInflectionType(), {
      id: inflection.id,
    } satisfies GraphQLFields<UninflectedInflectionType>);
  }
  throw new TypeError(
    `Inflection ${inflection.id} has no GraphQL type for its class ${inflection.constructor.name}`,
  );
}
