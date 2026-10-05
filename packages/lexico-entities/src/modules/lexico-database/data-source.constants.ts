import "reflect-metadata";

import { createDataSource } from "@codebase/database";

import { AdjectivalForm } from "../entities/dictionary/form/AdjectivalForm.entity";
import { AdverbForm } from "../entities/dictionary/form/AdverbForm.entity";
import { FiniteVerbForm } from "../entities/dictionary/form/FiniteVerbForm.entity";
import { Form } from "../entities/dictionary/form/Form.entity";
import { GerundForm } from "../entities/dictionary/form/GerundForm.entity";
import { InfinitiveForm } from "../entities/dictionary/form/InfinitiveForm.entity";
import { NominalForm } from "../entities/dictionary/form/NominalForm.entity";
import { ParticipleForm } from "../entities/dictionary/form/ParticipleForm.entity";
import { SupineForm } from "../entities/dictionary/form/SupineForm.entity";
import { AdjectiveInflection } from "../entities/dictionary/inflection/AdjectiveInflection.entity";
import { AdverbInflection } from "../entities/dictionary/inflection/AdverbInflection.entity";
import { Inflection } from "../entities/dictionary/inflection/Inflection.entity";
import { NounInflection } from "../entities/dictionary/inflection/NounInflection.entity";
import { PrepositionInflection } from "../entities/dictionary/inflection/PrepositionInflection.entity";
import { UninflectedInflection } from "../entities/dictionary/inflection/Uninflected.entity";
import { VerbInflection } from "../entities/dictionary/inflection/VerbInflection.entity";
import { Lexeme } from "../entities/dictionary/Lexeme.entity";
import { PrincipalPart } from "../entities/dictionary/PrincipalPart.entity";
import { Pronunciation } from "../entities/dictionary/Pronunciation.entity";
import { Translation } from "../entities/dictionary/Translation.entity";
import { Word } from "../entities/dictionary/Word.entity";
import { WordForm } from "../entities/dictionary/WordForm.entity";
import { WordLexeme } from "../entities/dictionary/WordLexeme.entity";
import { Author } from "../entities/literature/Author.entity";
import { Line } from "../entities/literature/Line.entity";
import { Text } from "../entities/literature/Text.entity";
import { Token } from "../entities/literature/Token.entity";

import { LexicoNamingStrategy } from "./lexico-database.constants";
import { Migration1781126991393 } from "./migrations/1781126991393-migration";

export const LEXICO_DATABASE_ENTITIES = [
  Lexeme,
  Inflection,
  NounInflection,
  VerbInflection,
  AdjectiveInflection,
  AdverbInflection,
  PrepositionInflection,
  UninflectedInflection,
  PrincipalPart,
  Pronunciation,
  Word,
  Translation,
  Form,
  NominalForm,
  AdjectivalForm,
  AdverbForm,
  FiniteVerbForm,
  InfinitiveForm,
  ParticipleForm,
  GerundForm,
  SupineForm,
  WordForm,
  WordLexeme,
  Author,
  Text,
  Line,
  Token,
] as const;

/** Every migration, in order, for the test harness; the runtime module runs none. */
export const LEXICO_DATABASE_MIGRATIONS = [Migration1781126991393] as const;

/**
 * The data source the TypeORM command line reads for
 * `nx run lexico-entities:migration:*`, built from the same options as the
 * runtime `LexicoDatabaseModule`. Reads only `LEXICO_POSTGRES_*`, defaulting to
 * `lexico_development`.`lexico` as `lexico_username`, and never synchronizes.
 */
export const lexicoDataSource = createDataSource({
  entities: [...LEXICO_DATABASE_ENTITIES],
  migrations: ["src/modules/lexico-database/migrations/*.ts"],
  namingStrategy: new LexicoNamingStrategy(),
  project: "lexico",
});
