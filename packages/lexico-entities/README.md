# 📖 Lexico Entities

**The dictionary's shape.** TypeORM entities, PostgreSQL migrations, and the
shared enumerations for [Lexico](../../applications/lexico/README.md).

This package is the single definition of what a Latin word _is_ in this suite.
[lexico-ingestion](../../applications/lexico-ingestion/README.md) writes
through these entities, and the web application reads through them, so neither
carries its own idea of the schema.

## Usage

```ts
import { LexicoDatabaseModule, Lexeme, Word } from "@codebase/lexico-entities";
```

`LexicoDatabaseModule` connects to `lexico_development`.`lexico` as
`lexico_username` through [`@codebase/database`](../database/README.md)'s
`DatabaseModule.forRoot`, with lexico's pluralizing `LexicoNamingStrategy`.
`lexicoDataSource`, in `src/modules/lexico-database/data-source.constants.ts`,
is the same configuration as a standalone `DataSource`, built with the shared
`createDataSource`, which is what the migration command line runs against.
Neither synchronizes nor runs migrations on start, so only the data source and
the test harness are given `LEXICO_DATABASE_MIGRATIONS`.

Both read only `LEXICO_POSTGRES_*`, never the root's unprefixed `POSTGRES_*`,
which are the shared container's admin login. The importing application's
`ConfigModule` must be global.

| Variable                   | Default              |
| -------------------------- | -------------------- |
| `LEXICO_POSTGRES_HOST`     | `localhost`          |
| `LEXICO_POSTGRES_PORT`     | `5432`               |
| `LEXICO_POSTGRES_USERNAME` | `lexico_username`    |
| `LEXICO_POSTGRES_PASSWORD` | `lexico_password`    |
| `LEXICO_POSTGRES_DATABASE` | `lexico_development` |
| `LEXICO_POSTGRES_SCHEMA`   | `lexico`             |

## The schema

### Dictionary

| Entity | Holds |
| ------ | ----- |
| `Word` | A headword — the form a reader looks up |
| `Lexeme` | A lexical entry, joined to words through `WordLexeme` |
| `Form` | One inflected form, joined to words through `WordForm` |
| `Inflection` | How a lexeme inflects |
| `PrincipalPart` | The principal parts a verb or noun is cited by |
| `Translation` | An English sense |
| `Pronunciation` | Classical and ecclesiastical variants |

`Form` and `Inflection` are both **single-table hierarchies**, because Latin
morphology does not fit one flat row. A form is an `AdjectivalForm`,
`AdverbForm`, `FiniteVerbForm`, `GerundForm`, `InfinitiveForm`, `NominalForm`,
`ParticipleForm`, or `SupineForm`; an inflection is an `AdjectiveInflection`,
`AdverbInflection`, `NounInflection`, `PrepositionInflection`,
`VerbInflection`, or `UninflectedInflection`.

### Literature

| Entity | Holds |
| ------ | ----- |
| `Author` | A classical author |
| `Text` | One work |
| `Line` | A line of that work |
| `Token` | One word occurrence, linking a line back to the dictionary |

### Base classes

Every entity but `Inflection` extends `DeletableEntity`, a thin GraphQL layer
over [`@codebase/database`](../database/README.md)'s shared base of the same
name. The shared base declares the columns — a `uuid` id the database assigns
with `uuidv7()`, then the created, updated, and soft-deleted timestamps and
their nullable `*By` columns — and this layer adds only their `@Field`
decorators, so no entity restates them and the API schema stays as it was.
Rows restored from before the move keep their version 4 ids; new rows get
version 7.

No entity names a schema: it comes from `LEXICO_POSTGRES_SCHEMA`.

## Grammatical enumerations

Every grammatical axis is exported both as a runtime value array and as a
union type — `formCaseValues` / `FormCase`, `verbConjugationValues` /
`VerbConjugation`, and so on for gender, number, person, tense, mood, voice,
degree, and declension. Validation, GraphQL enums, and exhaustive switches all
read from the same source.

`LexicoNamingStrategy` maps entity and column names to the database's own
convention, so table names stay predictable across migrations.

## Migrations

```bash
nx run lexico-entities:migration:generate           # Diff entities → new migration
nx run lexico-entities:migration:run                # Apply pending migrations
nx run lexico-entities:migration:revert             # Roll back the last one
nx run lexico-entities:migration:show               # List applied and pending
nx run lexico-entities:migration:extract-sql-all    # Emit .sql alongside each migration
```

The `migration` target is the shared one from the root `nx.json` target
defaults, declared here as
`"migration": { "options": { "module": "src/modules/lexico-database" } }`,
which names the folder holding `data-source.constants.ts` and `migrations/`;
its SQL extraction script lives in
[`@codebase/database`](../database/README.md).
`generate` also extracts the SQL and formats the result, so a generated
migration lands ready to review. Every migration ships a `-up.sql` and
`-down.sql` next to its TypeScript, which is what makes a schema change
readable in a diff — those files are linted by `sqlfluff` and checked by
`squawk` like any other SQL in the repository.

## Moving local data out of `postgres`.`public`

Lexico's tables used to live in the shared container's default `postgres`
database under `public`. A Docker volume from before
[ADR 0022](../../docs/adr/0022-give-every-database-project-its-own-database-schema-and-role.md)
still holds them there. Moving them into `lexico_development`.`lexico` is a
one-time step, run from the workspace root against the running container,
with `pg_dump`, `pg_restore`, and `psql` 18 on the path. It copies rows
rather than moving them: `public` is left in place, and dropping it is the
maintainer's call once the counts below match.

1. **Back up everything first**, and confirm the file is not empty:

   ```bash
   nx run codebase:postgres-data:dump-complete
   ls -l data/complete.dump
   ```

2. **Create the role, database, and schema** if the volume predates them,
   with the Compose init script. Skip it if the objects already exist; never
   run `postgres-container:recreate`, which deletes the volume:

   ```bash
   docker exec -e POSTGRES_PROJECTS=lexico postgres sh /docker-entrypoint-initdb.d/databases.sh
   ```

3. **Dump `public`'s rows alone**, leaving out TypeORM's own bookkeeping —
   its metadata and, on a volume where the old migration ever ran, its
   migrations table — both of which the new migration writes for `lexico`:

   ```bash
   nx run codebase:postgres-data:dump-custom \
     --flags="-n public --data-only -T public.migrations -T public.typeorm_metadata" \
     --name=lexico-public
   ```

4. **Build the empty schema** with the migration, as `lexico_username`:

   ```bash
   nx run lexico-entities:migration:run
   ```

5. **Restore the rows into `lexico`.** `pg_restore` cannot rename a schema, so
   render the archive's `-n public` entries as SQL and point each `COPY` and
   `ALTER TABLE` line at `lexico`; no data line can start with either, since
   every table's first column is a `uuid`. It runs as the admin login because
   `texts` references itself, and loading such a table's rows takes
   `--disable-triggers`, which only a superuser may use:

   ```bash
   PGPASSWORD=postgres pg_restore --data-only --disable-triggers -n public \
     -f - data/lexico-public.dump \
     | sed -E 's/^(COPY|ALTER TABLE) public\./\1 lexico./' \
     | PGPASSWORD=postgres psql -h localhost -U postgres -d lexico_development \
       --single-transaction -v ON_ERROR_STOP=1 -q
   ```

6. **Compare every table's row count** in both schemas; `diff` printing
   nothing means every table matches:

   ```bash
   row_counts() {
     PGPASSWORD=postgres psql -h localhost -U postgres -d "$1" -At -v schema="$2" <<'SQL'
   SELECT
     table_name,
     (xpath('/row/c/text()', query_to_xml(
       format('SELECT count(*) AS c FROM %I.%I', table_schema, table_name),
       FALSE, TRUE, ''
     )))[1]::text::bigint AS row_count
   FROM information_schema.tables
   WHERE table_schema = :'schema'
     AND table_type = 'BASE TABLE'
     AND table_name NOT IN ('migrations', 'typeorm_metadata')
   ORDER BY table_name;
   SQL
   }

   diff <(row_counts postgres public) <(row_counts lexico_development lexico)
   ```

Restored rows keep their version 4 ids; rows written afterwards get the
`uuidv7()` default.

## Testing

```bash
nx run lexico-entities:vitest:unit
nx run lexico-entities:vitest:integration   # Against a Testcontainers PostgreSQL
```

Integration tests start a throwaway Postgres 18 through
[`@codebase/database/testing`](../database/README.md), laid out like local
Docker: `lexico_username` owning `lexico_testing` with a `lexico` schema. The
schema is built by running the real migrations, never by synchronizing, and
the suite asserts the entities have nothing left to change, so entity mappings
and migrations are verified against the database rather than against a mock.

## Related

- 🐺 [lexico](../../applications/lexico/README.md) — the web application
- 🚰 [lexico-ingestion](../../applications/lexico-ingestion/README.md) — fills these tables
- 🎨 [components-web](../components-web/README.md) — the interface

## License

MIT — see [LICENSE](../../LICENSE).

<!-- callidescope:start -->

## 🔭 Callidescope

Call stacks traced through `packages/lexico-entities`, deepest first. Each frame shows what it takes, what it returns, and what its documentation says.

| Measure | Value |
| --- | --- |
| Callables | 85 |
| Files | 44 |
| Calls traced | 0 |
| Call stacks | 0 |
| Deepest stack | 0 |
| Stacks through recursion | 0 |
| Unfollowable calls | 1 |

### Limits

What this project is judged against, as declared in its own `callidescope.config.ts`.

| Limit | Value |
| --- | --- |
| `maximumDepth` | 3 |
| `maximumBreadth` | 3 |

### Call stacks (depth)

None.

### Breadth

None.
<!-- callidescope:end -->

## 🕸️ Codependix

Dependency graphs exported by [codependix](https://github.com/Organizzolini/codebase/tree/main/packages/ic-suite/codependix/codependix-cli), regenerated by `nx run codebase:codependix:write`.

### Nx Neighborhood

<!-- codependix:start name="codependix-nx-projects" -->
```mermaid
graph LR
  database["database"]
  lexico_api["lexico-api"]
  lexico_entities["lexico-entities"]
  lexico_ingestion["lexico-ingestion"]
  lexico_api --> lexico_entities
  lexico_entities --> database
  lexico_ingestion --> lexico_entities
  classDef subject fill:#7c3aed,color:#fff,stroke:#4c1d95,stroke-width:2px
  class lexico_entities subject
```
<!-- codependix:end name="codependix-nx-projects" -->

### NestJS Module Graph

<!-- codependix:start name="codependix-nestjs-modules" -->
```mermaid
flowchart LR
  DatabaseModule
  EntitiesModule
  LexicoDatabaseModule
  TypeOrmModule
  DatabaseModule --> TypeOrmModule
  LexicoDatabaseModule --> DatabaseModule
```
<!-- codependix:end name="codependix-nestjs-modules" -->

### File Imports

<!-- codependix:start name="codependix-file-imports" -->
```mermaid
graph LR
  file_callidescope_config_ts["callidescope.config.ts"]
  file_codependix_config_ts["codependix.config.ts"]
  file_codometer_config_ts["codometer.config.ts"]
  file_eslint_config_ts["eslint.config.ts"]
  file_src_index_ts["src/index.ts"]
  file_src_modules_entities_base_Deletable_entity_ts["src/modules/entities/base/Deletable.entity.ts"]
  file_src_modules_entities_dictionary_form_AdjectivalForm_entity_ts["src/modules/entities/dictionary/form/AdjectivalForm.entity.ts"]
  file_src_modules_entities_dictionary_form_AdverbForm_entity_ts["src/modules/entities/dictionary/form/AdverbForm.entity.ts"]
  file_src_modules_entities_dictionary_form_FiniteVerbForm_entity_ts["src/modules/entities/dictionary/form/FiniteVerbForm.entity.ts"]
  file_src_modules_entities_dictionary_form_Form_entity_ts["src/modules/entities/dictionary/form/Form.entity.ts"]
  file_src_modules_entities_dictionary_form_GerundForm_entity_ts["src/modules/entities/dictionary/form/GerundForm.entity.ts"]
  file_src_modules_entities_dictionary_form_InfinitiveForm_entity_ts["src/modules/entities/dictionary/form/InfinitiveForm.entity.ts"]
  file_src_modules_entities_dictionary_form_NominalForm_entity_ts["src/modules/entities/dictionary/form/NominalForm.entity.ts"]
  file_src_modules_entities_dictionary_form_ParticipleForm_entity_ts["src/modules/entities/dictionary/form/ParticipleForm.entity.ts"]
  file_src_modules_entities_dictionary_form_SupineForm_entity_ts["src/modules/entities/dictionary/form/SupineForm.entity.ts"]
  file_src_modules_entities_dictionary_inflection_AdjectiveInflection_entity_ts["src/modules/entities/dictionary/inflection/AdjectiveInflection.entity.ts"]
  file_src_modules_entities_dictionary_inflection_AdverbInflection_entity_ts["src/modules/entities/dictionary/inflection/AdverbInflection.entity.ts"]
  file_src_modules_entities_dictionary_inflection_Inflection_entity_ts["src/modules/entities/dictionary/inflection/Inflection.entity.ts"]
  file_src_modules_entities_dictionary_inflection_NounInflection_entity_ts["src/modules/entities/dictionary/inflection/NounInflection.entity.ts"]
  file_src_modules_entities_dictionary_inflection_PrepositionInflection_entity_ts["src/modules/entities/dictionary/inflection/PrepositionInflection.entity.ts"]
  file_src_modules_entities_dictionary_inflection_Uninflected_entity_ts["src/modules/entities/dictionary/inflection/Uninflected.entity.ts"]
  file_src_modules_entities_dictionary_inflection_VerbInflection_entity_ts["src/modules/entities/dictionary/inflection/VerbInflection.entity.ts"]
  file_src_modules_entities_dictionary_Lexeme_entity_ts["src/modules/entities/dictionary/Lexeme.entity.ts"]
  file_src_modules_entities_dictionary_PartOfSpeech_entity_ts["src/modules/entities/dictionary/PartOfSpeech.entity.ts"]
  file_src_modules_entities_dictionary_PrincipalPart_entity_ts["src/modules/entities/dictionary/PrincipalPart.entity.ts"]
  file_src_modules_entities_dictionary_Pronunciation_entity_ts["src/modules/entities/dictionary/Pronunciation.entity.ts"]
  file_src_modules_entities_dictionary_Translation_entity_ts["src/modules/entities/dictionary/Translation.entity.ts"]
  file_src_modules_entities_dictionary_Word_entity_ts["src/modules/entities/dictionary/Word.entity.ts"]
  file_src_modules_entities_dictionary_WordForm_entity_ts["src/modules/entities/dictionary/WordForm.entity.ts"]
  file_src_modules_entities_dictionary_WordLexeme_entity_ts["src/modules/entities/dictionary/WordLexeme.entity.ts"]
  file_src_modules_entities_entities_constants_ts["src/modules/entities/entities.constants.ts"]
  file_src_modules_entities_entities_module_integration_test_ts["src/modules/entities/entities.module.integration.test.ts"]
  file_src_modules_entities_entities_module_ts["src/modules/entities/entities.module.ts"]
  file_src_modules_entities_entities_service_integration_test_ts["src/modules/entities/entities.service.integration.test.ts"]
  file_src_modules_entities_entities_service_ts["src/modules/entities/entities.service.ts"]
  file_src_modules_entities_entities_service_unit_test_ts["src/modules/entities/entities.service.unit.test.ts"]
  file_src_modules_entities_entities_types_ts["src/modules/entities/entities.types.ts"]
  file_src_modules_entities_literature_Author_entity_ts["src/modules/entities/literature/Author.entity.ts"]
  file_src_modules_entities_literature_Line_entity_ts["src/modules/entities/literature/Line.entity.ts"]
  file_src_modules_entities_literature_Text_entity_ts["src/modules/entities/literature/Text.entity.ts"]
  file_src_modules_entities_literature_Token_entity_ts["src/modules/entities/literature/Token.entity.ts"]
  file_src_modules_lexico_database_data_source_constants_ts["src/modules/lexico-database/data-source.constants.ts"]
  file_src_modules_lexico_database_data_source_constants_unit_test_ts["src/modules/lexico-database/data-source.constants.unit.test.ts"]
  file_src_modules_lexico_database_lexico_database_constants_ts["src/modules/lexico-database/lexico-database.constants.ts"]
  file_src_modules_lexico_database_lexico_database_module_ts["src/modules/lexico-database/lexico-database.module.ts"]
  file_src_modules_lexico_database_lexico_database_service_ts["src/modules/lexico-database/lexico-database.service.ts"]
  file_src_modules_lexico_database_lexico_database_service_unit_test_ts["src/modules/lexico-database/lexico-database.service.unit.test.ts"]
  file_src_modules_lexico_database_lexico_database_types_ts["src/modules/lexico-database/lexico-database.types.ts"]
  file_src_modules_lexico_database_migrations_1791164926316_migration_ts["src/modules/lexico-database/migrations/1791164926316-migration.ts"]
  file_testing_entity_definition_assertions_ts["testing/entity-definition-assertions.ts"]
  file_testing_setup_ts["testing/setup.ts"]
  file_vitest_config_ts["vitest.config.ts"]
  file_src_modules_entities_dictionary_form_AdjectivalForm_entity_ts --> file_src_modules_entities_dictionary_form_Form_entity_ts
  file_src_modules_entities_dictionary_form_AdjectivalForm_entity_ts --> file_src_modules_lexico_database_lexico_database_constants_ts
  file_src_modules_entities_dictionary_form_AdverbForm_entity_ts --> file_src_modules_entities_dictionary_form_Form_entity_ts
  file_src_modules_entities_dictionary_form_AdverbForm_entity_ts --> file_src_modules_lexico_database_lexico_database_constants_ts
  file_src_modules_entities_dictionary_form_FiniteVerbForm_entity_ts --> file_src_modules_entities_dictionary_form_Form_entity_ts
  file_src_modules_entities_dictionary_form_FiniteVerbForm_entity_ts --> file_src_modules_lexico_database_lexico_database_constants_ts
  file_src_modules_entities_dictionary_form_Form_entity_ts --> file_src_modules_entities_base_Deletable_entity_ts
  file_src_modules_entities_dictionary_form_Form_entity_ts --> file_src_modules_entities_dictionary_Lexeme_entity_ts
  file_src_modules_entities_dictionary_form_Form_entity_ts --> file_src_modules_entities_dictionary_WordForm_entity_ts
  file_src_modules_entities_dictionary_form_GerundForm_entity_ts --> file_src_modules_entities_dictionary_form_Form_entity_ts
  file_src_modules_entities_dictionary_form_GerundForm_entity_ts --> file_src_modules_lexico_database_lexico_database_constants_ts
  file_src_modules_entities_dictionary_form_InfinitiveForm_entity_ts --> file_src_modules_entities_dictionary_form_Form_entity_ts
  file_src_modules_entities_dictionary_form_InfinitiveForm_entity_ts --> file_src_modules_lexico_database_lexico_database_constants_ts
  file_src_modules_entities_dictionary_form_NominalForm_entity_ts --> file_src_modules_entities_dictionary_form_Form_entity_ts
  file_src_modules_entities_dictionary_form_NominalForm_entity_ts --> file_src_modules_lexico_database_lexico_database_constants_ts
  file_src_modules_entities_dictionary_form_ParticipleForm_entity_ts --> file_src_modules_entities_dictionary_form_Form_entity_ts
  file_src_modules_entities_dictionary_form_ParticipleForm_entity_ts --> file_src_modules_lexico_database_lexico_database_constants_ts
  file_src_modules_entities_dictionary_form_SupineForm_entity_ts --> file_src_modules_entities_dictionary_form_Form_entity_ts
  file_src_modules_entities_dictionary_form_SupineForm_entity_ts --> file_src_modules_lexico_database_lexico_database_constants_ts
  file_src_modules_entities_dictionary_inflection_AdjectiveInflection_entity_ts --> file_src_modules_entities_dictionary_inflection_Inflection_entity_ts
  file_src_modules_entities_dictionary_inflection_AdjectiveInflection_entity_ts --> file_src_modules_lexico_database_lexico_database_constants_ts
  file_src_modules_entities_dictionary_inflection_AdverbInflection_entity_ts --> file_src_modules_entities_dictionary_inflection_Inflection_entity_ts
  file_src_modules_entities_dictionary_inflection_AdverbInflection_entity_ts --> file_src_modules_lexico_database_lexico_database_constants_ts
  file_src_modules_entities_dictionary_inflection_Inflection_entity_ts --> file_src_modules_entities_dictionary_Lexeme_entity_ts
  file_src_modules_entities_dictionary_inflection_NounInflection_entity_ts --> file_src_modules_entities_dictionary_inflection_Inflection_entity_ts
  file_src_modules_entities_dictionary_inflection_NounInflection_entity_ts --> file_src_modules_lexico_database_lexico_database_constants_ts
  file_src_modules_entities_dictionary_inflection_PrepositionInflection_entity_ts --> file_src_modules_entities_dictionary_inflection_Inflection_entity_ts
  file_src_modules_entities_dictionary_inflection_PrepositionInflection_entity_ts --> file_src_modules_lexico_database_lexico_database_constants_ts
  file_src_modules_entities_dictionary_inflection_Uninflected_entity_ts --> file_src_modules_entities_dictionary_inflection_Inflection_entity_ts
  file_src_modules_entities_dictionary_inflection_VerbInflection_entity_ts --> file_src_modules_entities_dictionary_inflection_Inflection_entity_ts
  file_src_modules_entities_dictionary_inflection_VerbInflection_entity_ts --> file_src_modules_lexico_database_lexico_database_constants_ts
  file_src_modules_entities_dictionary_Lexeme_entity_ts --> file_src_modules_entities_base_Deletable_entity_ts
  file_src_modules_entities_dictionary_Lexeme_entity_ts --> file_src_modules_entities_dictionary_form_Form_entity_ts
  file_src_modules_entities_dictionary_Lexeme_entity_ts --> file_src_modules_entities_dictionary_inflection_Inflection_entity_ts
  file_src_modules_entities_dictionary_Lexeme_entity_ts --> file_src_modules_entities_dictionary_PartOfSpeech_entity_ts
  file_src_modules_entities_dictionary_Lexeme_entity_ts --> file_src_modules_entities_dictionary_PrincipalPart_entity_ts
  file_src_modules_entities_dictionary_Lexeme_entity_ts --> file_src_modules_entities_dictionary_Pronunciation_entity_ts
  file_src_modules_entities_dictionary_Lexeme_entity_ts --> file_src_modules_entities_dictionary_Translation_entity_ts
  file_src_modules_entities_dictionary_Lexeme_entity_ts --> file_src_modules_entities_dictionary_WordLexeme_entity_ts
  file_src_modules_entities_dictionary_PrincipalPart_entity_ts --> file_src_modules_entities_base_Deletable_entity_ts
  file_src_modules_entities_dictionary_PrincipalPart_entity_ts --> file_src_modules_entities_dictionary_Lexeme_entity_ts
  file_src_modules_entities_dictionary_Pronunciation_entity_ts --> file_src_modules_entities_base_Deletable_entity_ts
  file_src_modules_entities_dictionary_Pronunciation_entity_ts --> file_src_modules_entities_dictionary_Lexeme_entity_ts
  file_src_modules_entities_dictionary_Translation_entity_ts --> file_src_modules_entities_base_Deletable_entity_ts
  file_src_modules_entities_dictionary_Translation_entity_ts --> file_src_modules_entities_dictionary_Lexeme_entity_ts
  file_src_modules_entities_dictionary_Word_entity_ts --> file_src_modules_entities_base_Deletable_entity_ts
  file_src_modules_entities_dictionary_Word_entity_ts --> file_src_modules_entities_dictionary_WordForm_entity_ts
  file_src_modules_entities_dictionary_Word_entity_ts --> file_src_modules_entities_dictionary_WordLexeme_entity_ts
  file_src_modules_entities_dictionary_WordForm_entity_ts --> file_src_modules_entities_base_Deletable_entity_ts
  file_src_modules_entities_dictionary_WordForm_entity_ts --> file_src_modules_entities_dictionary_form_Form_entity_ts
  file_src_modules_entities_dictionary_WordForm_entity_ts --> file_src_modules_entities_dictionary_Word_entity_ts
  file_src_modules_entities_dictionary_WordLexeme_entity_ts --> file_src_modules_entities_base_Deletable_entity_ts
  file_src_modules_entities_dictionary_WordLexeme_entity_ts --> file_src_modules_entities_dictionary_Lexeme_entity_ts
  file_src_modules_entities_dictionary_WordLexeme_entity_ts --> file_src_modules_entities_dictionary_Word_entity_ts
  file_src_modules_entities_entities_module_ts --> file_src_modules_entities_entities_service_ts
  file_src_modules_entities_entities_service_integration_test_ts --> file_src_modules_lexico_database_data_source_constants_ts
  file_src_modules_entities_entities_service_integration_test_ts --> file_src_modules_lexico_database_lexico_database_constants_ts
  file_src_modules_entities_entities_service_unit_test_ts --> file_src_modules_entities_dictionary_PartOfSpeech_entity_ts
  file_src_modules_entities_entities_service_unit_test_ts --> file_src_modules_entities_dictionary_Pronunciation_entity_ts
  file_src_modules_entities_entities_service_unit_test_ts --> file_src_modules_entities_entities_service_ts
  file_src_modules_entities_entities_service_unit_test_ts --> file_src_modules_lexico_database_data_source_constants_ts
  file_src_modules_entities_entities_service_unit_test_ts --> file_src_modules_lexico_database_lexico_database_constants_ts
  file_src_modules_entities_entities_service_unit_test_ts --> file_testing_entity_definition_assertions_ts
  file_src_modules_entities_literature_Author_entity_ts --> file_src_modules_entities_base_Deletable_entity_ts
  file_src_modules_entities_literature_Author_entity_ts --> file_src_modules_entities_literature_Text_entity_ts
  file_src_modules_entities_literature_Line_entity_ts --> file_src_modules_entities_base_Deletable_entity_ts
  file_src_modules_entities_literature_Line_entity_ts --> file_src_modules_entities_literature_Author_entity_ts
  file_src_modules_entities_literature_Line_entity_ts --> file_src_modules_entities_literature_Text_entity_ts
  file_src_modules_entities_literature_Line_entity_ts --> file_src_modules_entities_literature_Token_entity_ts
  file_src_modules_entities_literature_Text_entity_ts --> file_src_modules_entities_base_Deletable_entity_ts
  file_src_modules_entities_literature_Text_entity_ts --> file_src_modules_entities_literature_Author_entity_ts
  file_src_modules_entities_literature_Text_entity_ts --> file_src_modules_entities_literature_Line_entity_ts
  file_src_modules_entities_literature_Token_entity_ts --> file_src_modules_entities_base_Deletable_entity_ts
  file_src_modules_entities_literature_Token_entity_ts --> file_src_modules_entities_dictionary_Word_entity_ts
  file_src_modules_entities_literature_Token_entity_ts --> file_src_modules_entities_literature_Author_entity_ts
  file_src_modules_entities_literature_Token_entity_ts --> file_src_modules_entities_literature_Line_entity_ts
  file_src_modules_entities_literature_Token_entity_ts --> file_src_modules_entities_literature_Text_entity_ts
  file_src_modules_lexico_database_data_source_constants_ts --> file_src_modules_entities_dictionary_form_AdjectivalForm_entity_ts
  file_src_modules_lexico_database_data_source_constants_ts --> file_src_modules_entities_dictionary_form_AdverbForm_entity_ts
  file_src_modules_lexico_database_data_source_constants_ts --> file_src_modules_entities_dictionary_form_FiniteVerbForm_entity_ts
  file_src_modules_lexico_database_data_source_constants_ts --> file_src_modules_entities_dictionary_form_Form_entity_ts
  file_src_modules_lexico_database_data_source_constants_ts --> file_src_modules_entities_dictionary_form_GerundForm_entity_ts
  file_src_modules_lexico_database_data_source_constants_ts --> file_src_modules_entities_dictionary_form_InfinitiveForm_entity_ts
  file_src_modules_lexico_database_data_source_constants_ts --> file_src_modules_entities_dictionary_form_NominalForm_entity_ts
  file_src_modules_lexico_database_data_source_constants_ts --> file_src_modules_entities_dictionary_form_ParticipleForm_entity_ts
  file_src_modules_lexico_database_data_source_constants_ts --> file_src_modules_entities_dictionary_form_SupineForm_entity_ts
  file_src_modules_lexico_database_data_source_constants_ts --> file_src_modules_entities_dictionary_inflection_AdjectiveInflection_entity_ts
  file_src_modules_lexico_database_data_source_constants_ts --> file_src_modules_entities_dictionary_inflection_AdverbInflection_entity_ts
  file_src_modules_lexico_database_data_source_constants_ts --> file_src_modules_entities_dictionary_inflection_Inflection_entity_ts
  file_src_modules_lexico_database_data_source_constants_ts --> file_src_modules_entities_dictionary_inflection_NounInflection_entity_ts
  file_src_modules_lexico_database_data_source_constants_ts --> file_src_modules_entities_dictionary_inflection_PrepositionInflection_entity_ts
  file_src_modules_lexico_database_data_source_constants_ts --> file_src_modules_entities_dictionary_inflection_Uninflected_entity_ts
  file_src_modules_lexico_database_data_source_constants_ts --> file_src_modules_entities_dictionary_inflection_VerbInflection_entity_ts
  file_src_modules_lexico_database_data_source_constants_ts --> file_src_modules_entities_dictionary_Lexeme_entity_ts
  file_src_modules_lexico_database_data_source_constants_ts --> file_src_modules_entities_dictionary_PrincipalPart_entity_ts
  file_src_modules_lexico_database_data_source_constants_ts --> file_src_modules_entities_dictionary_Pronunciation_entity_ts
  file_src_modules_lexico_database_data_source_constants_ts --> file_src_modules_entities_dictionary_Translation_entity_ts
  file_src_modules_lexico_database_data_source_constants_ts --> file_src_modules_entities_dictionary_Word_entity_ts
  file_src_modules_lexico_database_data_source_constants_ts --> file_src_modules_entities_dictionary_WordForm_entity_ts
  file_src_modules_lexico_database_data_source_constants_ts --> file_src_modules_entities_dictionary_WordLexeme_entity_ts
  file_src_modules_lexico_database_data_source_constants_ts --> file_src_modules_entities_literature_Author_entity_ts
  file_src_modules_lexico_database_data_source_constants_ts --> file_src_modules_entities_literature_Line_entity_ts
  file_src_modules_lexico_database_data_source_constants_ts --> file_src_modules_entities_literature_Text_entity_ts
  file_src_modules_lexico_database_data_source_constants_ts --> file_src_modules_entities_literature_Token_entity_ts
  file_src_modules_lexico_database_data_source_constants_ts --> file_src_modules_lexico_database_lexico_database_constants_ts
  file_src_modules_lexico_database_data_source_constants_ts --> file_src_modules_lexico_database_migrations_1791164926316_migration_ts
  file_src_modules_lexico_database_data_source_constants_unit_test_ts --> file_src_modules_lexico_database_data_source_constants_ts
  file_src_modules_lexico_database_data_source_constants_unit_test_ts --> file_src_modules_lexico_database_lexico_database_constants_ts
  file_src_modules_lexico_database_lexico_database_module_ts --> file_src_modules_lexico_database_data_source_constants_ts
  file_src_modules_lexico_database_lexico_database_module_ts --> file_src_modules_lexico_database_lexico_database_constants_ts
  file_src_modules_lexico_database_lexico_database_module_ts --> file_src_modules_lexico_database_lexico_database_service_ts
  file_src_modules_lexico_database_lexico_database_service_unit_test_ts --> file_src_modules_lexico_database_lexico_database_service_ts
```
<!-- codependix:end name="codependix-file-imports" -->

<!-- codometer:start -->

## ⏲️ Codometer

### Project

![Lines of Code](https://img.shields.io/badge/Lines_of_Code-4894-22c55e?style=flat-square)
![Repository Size](https://img.shields.io/badge/Repository_Size-209.12_kB-6b7280?style=flat-square)
![Folders](https://img.shields.io/badge/Folders-11-4a4a4a?style=flat-square)
![Source Files](https://img.shields.io/badge/Source_Files-52-3178c6?style=flat-square)

### Measured Targets

![Compiled JavaScript Size](https://img.shields.io/badge/Compiled_JavaScript_Size-27.07_kB_gzip-6b7280?style=flat-square)

### TypeScript

![TypeScript Files](https://img.shields.io/badge/TypeScript_Files-52-3178c6?style=flat-square)
![Interfaces](https://img.shields.io/badge/Interfaces-8-0ea5e9?style=flat-square)
![Generic Declarations](https://img.shields.io/badge/Generic_Declarations-2-0369a1?style=flat-square)
![Enums](https://img.shields.io/badge/Enums-0-f97316?style=flat-square)
![Decorators](https://img.shields.io/badge/Decorators-261-db2777?style=flat-square)
![Doc Comments](https://img.shields.io/badge/Doc_Comments-82-6366f1?style=flat-square)
![Static Methods](https://img.shields.io/badge/Static_Methods-0-166534?style=flat-square)

### JavaScript

![JavaScript Files](https://img.shields.io/badge/JavaScript_Files-0-f7df1e?style=flat-square)
![Test Files](https://img.shields.io/badge/Test_Files-5-10b981?style=flat-square)
![External Packages](https://img.shields.io/badge/External_Packages-14-8b5cf6?style=flat-square)
![Classes](https://img.shields.io/badge/Classes-36-7c3aed?style=flat-square)
![Functions](https://img.shields.io/badge/Functions-189-16a34a?style=flat-square)
![Methods](https://img.shields.io/badge/Methods-85-15803d?style=flat-square)
![Sync Functions](https://img.shields.io/badge/Sync_Functions-249-4ade80?style=flat-square)
![Async Functions](https://img.shields.io/badge/Async_Functions-25-059669?style=flat-square)
![Constants](https://img.shields.io/badge/Constants-144-dc2626?style=flat-square)
![Imports](https://img.shields.io/badge/Imports-214-0284c7?style=flat-square)
![Exported Symbols](https://img.shields.io/badge/Exported_Symbols-110-ea580c?style=flat-square)
![Comments](https://img.shields.io/badge/Comments-111-64748b?style=flat-square)
![Comment Lines](https://img.shields.io/badge/Comment_Lines-200-475569?style=flat-square)
![TODO Comments](https://img.shields.io/badge/TODO_Comments-3-ca8a04?style=flat-square)

### Python

![Python Files](https://img.shields.io/badge/Python_Files-0-3776ab?style=flat-square)
![Python Lines](https://img.shields.io/badge/Python_Lines-0-4b8bbe?style=flat-square)
![Python Classes](https://img.shields.io/badge/Python_Classes-0-7c3aed?style=flat-square)
![Python Functions](https://img.shields.io/badge/Python_Functions-0-16a34a?style=flat-square)
![Python Protocols](https://img.shields.io/badge/Python_Protocols-0-0ea5e9?style=flat-square)
![Python Constants](https://img.shields.io/badge/Python_Constants-0-dc2626?style=flat-square)
![Python Imports](https://img.shields.io/badge/Python_Imports-0-0284c7?style=flat-square)
![Python Decorators](https://img.shields.io/badge/Python_Decorators-0-db2777?style=flat-square)
![Docstrings](https://img.shields.io/badge/Docstrings-0-6366f1?style=flat-square)
![Docstring Lines](https://img.shields.io/badge/Docstring_Lines-0-818cf8?style=flat-square)
![Python Comments](https://img.shields.io/badge/Python_Comments-0-64748b?style=flat-square)
![Python Comment Lines](https://img.shields.io/badge/Python_Comment_Lines-0-475569?style=flat-square)

### JSON

![JSON Files](https://img.shields.io/badge/JSON_Files-4-a16207?style=flat-square)
![JSON Lines](https://img.shields.io/badge/JSON_Lines-151-ca8a04?style=flat-square)
![JSON Objects](https://img.shields.io/badge/JSON_Objects-41-7c3aed?style=flat-square)
![JSON Arrays](https://img.shields.io/badge/JSON_Arrays-10-8b5cf6?style=flat-square)
![JSON Properties](https://img.shields.io/badge/JSON_Properties-103-0284c7?style=flat-square)
![JSON Strings](https://img.shields.io/badge/JSON_Strings-77-16a34a?style=flat-square)
![JSON Numbers](https://img.shields.io/badge/JSON_Numbers-1-059669?style=flat-square)
![JSON Booleans](https://img.shields.io/badge/JSON_Booleans-8-0ea5e9?style=flat-square)
![JSON Nulls](https://img.shields.io/badge/JSON_Nulls-0-64748b?style=flat-square)
![JSON Items](https://img.shields.io/badge/JSON_Items-30-475569?style=flat-square)
![JSON Nodes](https://img.shields.io/badge/JSON_Nodes-137-dc2626?style=flat-square)
![JSON Max Depth](https://img.shields.io/badge/JSON_Max_Depth-7-ea580c?style=flat-square)

### YAML

![YAML Files](https://img.shields.io/badge/YAML_Files-0-cb171e?style=flat-square)
![YAML Lines](https://img.shields.io/badge/YAML_Lines-0-e34c26?style=flat-square)
![YAML Documents](https://img.shields.io/badge/YAML_Documents-0-f97316?style=flat-square)
![YAML Mappings](https://img.shields.io/badge/YAML_Mappings-0-7c3aed?style=flat-square)
![YAML Sequences](https://img.shields.io/badge/YAML_Sequences-0-8b5cf6?style=flat-square)
![YAML Keys](https://img.shields.io/badge/YAML_Keys-0-0284c7?style=flat-square)
![YAML Scalars](https://img.shields.io/badge/YAML_Scalars-0-16a34a?style=flat-square)
![YAML Anchors](https://img.shields.io/badge/YAML_Anchors-0-059669?style=flat-square)
![YAML Aliases](https://img.shields.io/badge/YAML_Aliases-0-10b981?style=flat-square)
![YAML Comments](https://img.shields.io/badge/YAML_Comments-0-64748b?style=flat-square)
![YAML Max Depth](https://img.shields.io/badge/YAML_Max_Depth-0-ea580c?style=flat-square)

### TOML

![TOML Files](https://img.shields.io/badge/TOML_Files-0-9c4221?style=flat-square)
![TOML Lines](https://img.shields.io/badge/TOML_Lines-0-b45309?style=flat-square)
![TOML Tables](https://img.shields.io/badge/TOML_Tables-0-7c3aed?style=flat-square)
![TOML Array Tables](https://img.shields.io/badge/TOML_Array_Tables-0-8b5cf6?style=flat-square)
![TOML Keys](https://img.shields.io/badge/TOML_Keys-0-0284c7?style=flat-square)
![TOML Arrays](https://img.shields.io/badge/TOML_Arrays-0-16a34a?style=flat-square)
![TOML Comments](https://img.shields.io/badge/TOML_Comments-0-64748b?style=flat-square)

### Shell

![Shell Files](https://img.shields.io/badge/Shell_Files-0-89e051?style=flat-square)
![Shell Lines](https://img.shields.io/badge/Shell_Lines-0-4eaa25?style=flat-square)
![Shell Functions](https://img.shields.io/badge/Shell_Functions-0-16a34a?style=flat-square)
![Shell Variables](https://img.shields.io/badge/Shell_Variables-0-0284c7?style=flat-square)
![Shell Exports](https://img.shields.io/badge/Shell_Exports-0-ea580c?style=flat-square)
![Shell Conditionals](https://img.shields.io/badge/Shell_Conditionals-0-7c3aed?style=flat-square)
![Shell Loops](https://img.shields.io/badge/Shell_Loops-0-8b5cf6?style=flat-square)
![Shell Pipelines](https://img.shields.io/badge/Shell_Pipelines-0-059669?style=flat-square)
![Shebangs](https://img.shields.io/badge/Shebangs-0-6b7280?style=flat-square)
![Shell Comments](https://img.shields.io/badge/Shell_Comments-0-64748b?style=flat-square)
![Shell Comment Lines](https://img.shields.io/badge/Shell_Comment_Lines-0-475569?style=flat-square)

### SQL

![SQL Files](https://img.shields.io/badge/SQL_Files-2-e38c00?style=flat-square)
![SQL Lines](https://img.shields.io/badge/SQL_Lines-362-f29111?style=flat-square)
![SQL Statements](https://img.shields.io/badge/SQL_Statements-325-7c3aed?style=flat-square)
![SQL Selects](https://img.shields.io/badge/SQL_Selects-0-16a34a?style=flat-square)
![SQL Inserts](https://img.shields.io/badge/SQL_Inserts-31-22c55e?style=flat-square)
![SQL Updates](https://img.shields.io/badge/SQL_Updates-17-0ea5e9?style=flat-square)
![SQL Deletes](https://img.shields.io/badge/SQL_Deletes-18-dc2626?style=flat-square)
![SQL Creates](https://img.shields.io/badge/SQL_Creates-58-0284c7?style=flat-square)
![SQL Joins](https://img.shields.io/badge/SQL_Joins-0-8b5cf6?style=flat-square)
![SQL CTEs](https://img.shields.io/badge/SQL_CTEs-37-059669?style=flat-square)
![SQL Comments](https://img.shields.io/badge/SQL_Comments-0-64748b?style=flat-square)

### HCL

![HCL Files](https://img.shields.io/badge/HCL_Files-0-844fba?style=flat-square)
![HCL Lines](https://img.shields.io/badge/HCL_Lines-0-a78bfa?style=flat-square)
![HCL Blocks](https://img.shields.io/badge/HCL_Blocks-0-7c3aed?style=flat-square)
![HCL Resources](https://img.shields.io/badge/HCL_Resources-0-0284c7?style=flat-square)
![HCL Variables](https://img.shields.io/badge/HCL_Variables-0-16a34a?style=flat-square)
![HCL Outputs](https://img.shields.io/badge/HCL_Outputs-0-059669?style=flat-square)
![HCL Attributes](https://img.shields.io/badge/HCL_Attributes-0-0ea5e9?style=flat-square)
![HCL Interpolations](https://img.shields.io/badge/HCL_Interpolations-0-db2777?style=flat-square)
![HCL Comments](https://img.shields.io/badge/HCL_Comments-0-64748b?style=flat-square)

### CSS

![CSS Files](https://img.shields.io/badge/CSS_Files-0-264de4?style=flat-square)
![CSS Lines](https://img.shields.io/badge/CSS_Lines-0-2965f1?style=flat-square)
![CSS Rules](https://img.shields.io/badge/CSS_Rules-0-7c3aed?style=flat-square)
![CSS Selectors](https://img.shields.io/badge/CSS_Selectors-0-8b5cf6?style=flat-square)
![CSS Declarations](https://img.shields.io/badge/CSS_Declarations-0-0284c7?style=flat-square)
![CSS At Rules](https://img.shields.io/badge/CSS_At_Rules-0-f97316?style=flat-square)
![CSS Media Queries](https://img.shields.io/badge/CSS_Media_Queries-0-ea580c?style=flat-square)
![CSS Custom Properties](https://img.shields.io/badge/CSS_Custom_Properties-0-16a34a?style=flat-square)
![CSS Comments](https://img.shields.io/badge/CSS_Comments-0-64748b?style=flat-square)

### Conventions

![Module Files](https://img.shields.io/badge/Module_Files-2-7c3aed?style=flat-square)
![Service Files](https://img.shields.io/badge/Service_Files-2-0284c7?style=flat-square)
![Command Files](https://img.shields.io/badge/Command_Files-0-16a34a?style=flat-square)
![Constants Files](https://img.shields.io/badge/Constants_Files-3-ea580c?style=flat-square)
![Types Files](https://img.shields.io/badge/Types_Files-2-db2777?style=flat-square)
![Utilities Files](https://img.shields.io/badge/Utilities_Files-0-0ea5e9?style=flat-square)
![TypeORM Entities](https://img.shields.io/badge/TypeORM_Entities-29-059669?style=flat-square)
![Unit Tests](https://img.shields.io/badge/Unit_Tests-3-ca8a04?style=flat-square)
![Integration Tests](https://img.shields.io/badge/Integration_Tests-2-7c3aed?style=flat-square)
![End To End Tests](https://img.shields.io/badge/End_To_End_Tests-0-0284c7?style=flat-square)
![CSS Comment Budget](https://img.shields.io/badge/CSS_Comment_Budget-0-16a34a?style=flat-square)
![HCL Comment Budget](https://img.shields.io/badge/HCL_Comment_Budget-0-ea580c?style=flat-square)
![Python Comment Budget](https://img.shields.io/badge/Python_Comment_Budget-0-db2777?style=flat-square)
![SQL Comment Budget](https://img.shields.io/badge/SQL_Comment_Budget-0-0ea5e9?style=flat-square)
![TOML Comment Budget](https://img.shields.io/badge/TOML_Comment_Budget-0-059669?style=flat-square)
![TypeScript Comment Budget](https://img.shields.io/badge/TypeScript_Comment_Budget-0-ca8a04?style=flat-square)
![YAML Comment Budget](https://img.shields.io/badge/YAML_Comment_Budget-0-7c3aed?style=flat-square)
![Shell Comment Budget](https://img.shields.io/badge/Shell_Comment_Budget-0-0284c7?style=flat-square)

### Jupyter

![Notebooks](https://img.shields.io/badge/Notebooks-0-f37626?style=flat-square)
![Notebook Cells](https://img.shields.io/badge/Notebook_Cells-0-e8a33d?style=flat-square)
![Code Cells](https://img.shields.io/badge/Code_Cells-0-3776ab?style=flat-square)
![Markdown Cells](https://img.shields.io/badge/Markdown_Cells-0-083fa1?style=flat-square)
![Raw Cells](https://img.shields.io/badge/Raw_Cells-0-9ca3af?style=flat-square)
![Executed Cells](https://img.shields.io/badge/Executed_Cells-0-16a34a?style=flat-square)
![Cell Outputs](https://img.shields.io/badge/Cell_Outputs-0-059669?style=flat-square)
![Notebook Code Lines](https://img.shields.io/badge/Notebook_Code_Lines-0-4b8bbe?style=flat-square)
![Notebook Classes](https://img.shields.io/badge/Notebook_Classes-0-7c3aed?style=flat-square)
![Notebook Functions](https://img.shields.io/badge/Notebook_Functions-0-22c55e?style=flat-square)
![Notebook Imports](https://img.shields.io/badge/Notebook_Imports-0-0284c7?style=flat-square)
![Notebook Decorators](https://img.shields.io/badge/Notebook_Decorators-0-db2777?style=flat-square)
![Notebook Prose Lines](https://img.shields.io/badge/Notebook_Prose_Lines-0-1f6feb?style=flat-square)
![Notebook Headings](https://img.shields.io/badge/Notebook_Headings-0-a78bfa?style=flat-square)
![Notebook Links](https://img.shields.io/badge/Notebook_Links-0-10b981?style=flat-square)
![Notebook Images](https://img.shields.io/badge/Notebook_Images-0-34d399?style=flat-square)
![Notebook Code Blocks](https://img.shields.io/badge/Notebook_Code_Blocks-0-dc2626?style=flat-square)
![Notebook Properties](https://img.shields.io/badge/Notebook_Properties-0-ca8a04?style=flat-square)
![Notebook Nodes](https://img.shields.io/badge/Notebook_Nodes-0-a16207?style=flat-square)
![Notebook Max Depth](https://img.shields.io/badge/Notebook_Max_Depth-0-ea580c?style=flat-square)

### Markdown

![Markdown Files](https://img.shields.io/badge/Markdown_Files-0-083fa1?style=flat-square)
![Markdown Lines](https://img.shields.io/badge/Markdown_Lines-0-1f6feb?style=flat-square)
![H1](https://img.shields.io/badge/H1-0-7c3aed?style=flat-square)
![H2](https://img.shields.io/badge/H2-0-8b5cf6?style=flat-square)
![H3](https://img.shields.io/badge/H3-0-a78bfa?style=flat-square)
![H4](https://img.shields.io/badge/H4-0-c4b5fd?style=flat-square)
![H5](https://img.shields.io/badge/H5-0-ddd6fe?style=flat-square)
![H6](https://img.shields.io/badge/H6-0-ede9fe?style=flat-square)
![Paragraphs](https://img.shields.io/badge/Paragraphs-0-64748b?style=flat-square)
![Lists](https://img.shields.io/badge/Lists-0-16a34a?style=flat-square)
![List Items](https://img.shields.io/badge/List_Items-0-22c55e?style=flat-square)
![Task List Items](https://img.shields.io/badge/Task_List_Items-0-4ade80?style=flat-square)
![Tables](https://img.shields.io/badge/Tables-0-0284c7?style=flat-square)
![Table Rows](https://img.shields.io/badge/Table_Rows-0-0ea5e9?style=flat-square)
![Links](https://img.shields.io/badge/Links-0-059669?style=flat-square)
![Images](https://img.shields.io/badge/Images-0-10b981?style=flat-square)
![Code Blocks](https://img.shields.io/badge/Code_Blocks-0-dc2626?style=flat-square)
![Inline Code](https://img.shields.io/badge/Inline_Code-0-ef4444?style=flat-square)
![Block Quotes](https://img.shields.io/badge/Block_Quotes-0-ca8a04?style=flat-square)
![Thematic Breaks](https://img.shields.io/badge/Thematic_Breaks-0-a16207?style=flat-square)
<!-- codometer:end -->
