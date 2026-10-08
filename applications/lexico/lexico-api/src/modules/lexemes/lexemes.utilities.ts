import {
  mapNullableRelation,
  mapNullableRelations,
  mapRelations,
  toDeletableFields,
} from "../../lexico-api.utilities";

import { toFormType } from "./forms/forms.utilities";
import { toInflectionType } from "./inflections/inflections.utilities";
import { LexemeType } from "./lexeme.entities";
import { PrincipalPartType } from "./principal-part.entities";
import { PronunciationType } from "./pronunciation.entities";
import { TranslationType } from "./translation.entities";

import type { GraphQLFields, MappedFields } from "../../lexico-api.types";
import type { LexemeRelationField } from "./lexemes.types";
import type {
  Lexeme,
  PrincipalPart,
  Pronunciation,
  Translation,
} from "@codebase/lexico-entities";

/** Maps a lexeme entity, and each relation it loaded, to its GraphQL type. */
export function toLexemeType(lexeme: Lexeme): LexemeType {
  return Object.assign(new LexemeType(), {
    ...toDeletableFields(lexeme),
    disambiguator: lexeme.disambiguator,
    etymology: lexeme.etymology,
    forms: mapRelations(lexeme.forms, toFormType),
    inflection: mapNullableRelation(lexeme.inflection, toInflectionType),
    lemma: lexeme.lemma,
    partOfSpeech: lexeme.partOfSpeech,
    principalParts: mapRelations(lexeme.principalParts, toPrincipalPartType),
    pronunciations: mapNullableRelations(
      lexeme.pronunciations,
      toPronunciationType,
    ),
    translations: mapNullableRelations(lexeme.translations, toTranslationType),
  } satisfies MappedFields<LexemeType, LexemeRelationField>);
}

/** Maps a principal part entity to its GraphQL type. */
export function toPrincipalPartType(
  principalPart: PrincipalPart,
): PrincipalPartType {
  return Object.assign(new PrincipalPartType(), {
    ...toDeletableFields(principalPart),
    name: principalPart.name,
    text: principalPart.text,
  } satisfies GraphQLFields<PrincipalPartType>);
}

/** Maps a pronunciation entity to its GraphQL type. */
export function toPronunciationType(
  pronunciation: Pronunciation,
): PronunciationType {
  return Object.assign(new PronunciationType(), {
    ...toDeletableFields(pronunciation),
    phonemes: pronunciation.phonemes,
    phonemic: pronunciation.phonemic,
    phonetic: pronunciation.phonetic,
    variant: pronunciation.variant,
  } satisfies GraphQLFields<PronunciationType>);
}

/** Maps a translation entity to its GraphQL type. */
export function toTranslationType(translation: Translation): TranslationType {
  return Object.assign(new TranslationType(), {
    ...toDeletableFields(translation),
    data: translation.data,
  } satisfies GraphQLFields<TranslationType>);
}
