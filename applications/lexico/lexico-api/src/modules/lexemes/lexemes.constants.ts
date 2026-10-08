// ♟️ Constants

import { AdjectivalFormType } from "./forms/adjectival-form.entities";
import { AdverbFormType } from "./forms/adverb-form.entities";
import { FiniteVerbFormType } from "./forms/finite-verb-form.entities";
import { GerundFormType } from "./forms/gerund-form.entities";
import { InfinitiveFormType } from "./forms/infinitive-form.entities";
import { NominalFormType } from "./forms/nominal-form.entities";
import { ParticipleFormType } from "./forms/participle-form.entities";
import { SupineFormType } from "./forms/supine-form.entities";
import { AdjectiveInflectionType } from "./inflections/adjective-inflection.entities";
import { AdverbInflectionType } from "./inflections/adverb-inflection.entities";
import { NounInflectionType } from "./inflections/noun-inflection.entities";
import { PrepositionInflectionType } from "./inflections/preposition-inflection.entities";
import { UninflectedInflectionType } from "./inflections/uninflected-inflection.entities";
import { VerbInflectionType } from "./inflections/verb-inflection.entities";

/**
 * Every concrete form and inflection, which no resolver names, so the schema
 * can resolve the `Form` and `Inflection` interfaces a lexeme returns.
 */
export const ORPHANED_GRAPHQL_TYPES = [
  NominalFormType,
  FiniteVerbFormType,
  ParticipleFormType,
  AdverbFormType,
  InfinitiveFormType,
  GerundFormType,
  SupineFormType,
  AdjectivalFormType,
  NounInflectionType,
  VerbInflectionType,
  AdjectiveInflectionType,
  AdverbInflectionType,
  PrepositionInflectionType,
  UninflectedInflectionType,
] as const;
