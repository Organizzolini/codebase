import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import "reflect-metadata";

import { createDataSource } from "@codebase/database";
import { startPostgresContainer } from "@codebase/database/testing";

import {
  LEXICO_DATABASE_ENTITIES,
  LEXICO_DATABASE_MIGRATIONS,
} from "../lexico-database/data-source.constants";
import { LexicoNamingStrategy } from "../lexico-database/lexico-database.constants";

import { Author } from "./literature/Author.entity";
import { Line } from "./literature/Line.entity";
import { Text } from "./literature/Text.entity";
import { Token } from "./literature/Token.entity";

import type { StartedPostgresContainer } from "@codebase/database/testing";
import type { DataSource } from "typeorm";

interface EntityIntegrationExpectation {
  readonly representativeIndexes: readonly (readonly string[])[];
  readonly representativeUniqueConstraints: readonly (readonly string[])[];
  readonly tableName: string;
}

interface TableIndexSnapshot {
  readonly columnNames: readonly string[];
  readonly isUnique: boolean;
}

const INTEGRATION_SCHEMA_NAME = "lexico";
const MIGRATIONS_TABLE_NAME = "migrations";
const TYPEORM_METADATA_TABLE_NAME = "typeorm_metadata";

/** Starting Postgres and running every migration takes longer than a test. */
const CONTAINER_TIMEOUT_MILLISECONDS = 120_000;

const ENTITY_INTEGRATION_EXPECTATIONS: Readonly<
  Record<string, EntityIntegrationExpectation>
> = {
  AdjectivalForm: {
    representativeIndexes: [["lexeme_id"]],
    representativeUniqueConstraints: [],
    tableName: "forms",
  },
  AdjectiveInflection: {
    representativeIndexes: [["type"]],
    representativeUniqueConstraints: [],
    tableName: "inflections",
  },
  AdverbForm: {
    representativeIndexes: [["lexeme_id"]],
    representativeUniqueConstraints: [],
    tableName: "forms",
  },
  AdverbInflection: {
    representativeIndexes: [["type"]],
    representativeUniqueConstraints: [],
    tableName: "inflections",
  },
  Author: {
    representativeIndexes: [],
    representativeUniqueConstraints: [["slug"]],
    tableName: "authors",
  },
  FiniteVerbForm: {
    representativeIndexes: [["lexeme_id"]],
    representativeUniqueConstraints: [],
    tableName: "forms",
  },
  Form: {
    representativeIndexes: [["lexeme_id"]],
    representativeUniqueConstraints: [],
    tableName: "forms",
  },
  GerundForm: {
    representativeIndexes: [["lexeme_id"]],
    representativeUniqueConstraints: [],
    tableName: "forms",
  },
  InfinitiveForm: {
    representativeIndexes: [["lexeme_id"]],
    representativeUniqueConstraints: [],
    tableName: "forms",
  },
  Inflection: {
    representativeIndexes: [["type"]],
    representativeUniqueConstraints: [["lexeme_id"]],
    tableName: "inflections",
  },
  Lexeme: {
    representativeIndexes: [["lemma"]],
    representativeUniqueConstraints: [["disambiguator", "lemma"]],
    tableName: "lexemes",
  },
  Line: {
    representativeIndexes: [["author_id"]],
    representativeUniqueConstraints: [["index", "text_id"]],
    tableName: "lines",
  },
  NominalForm: {
    representativeIndexes: [["lexeme_id"]],
    representativeUniqueConstraints: [],
    tableName: "forms",
  },
  NounInflection: {
    representativeIndexes: [["type"]],
    representativeUniqueConstraints: [],
    tableName: "inflections",
  },
  ParticipleForm: {
    representativeIndexes: [["lexeme_id"]],
    representativeUniqueConstraints: [],
    tableName: "forms",
  },
  PrepositionInflection: {
    representativeIndexes: [["type"]],
    representativeUniqueConstraints: [],
    tableName: "inflections",
  },
  PrincipalPart: {
    representativeIndexes: [["lexeme_id"]],
    representativeUniqueConstraints: [],
    tableName: "principal_parts",
  },
  Pronunciation: {
    representativeIndexes: [["lexeme_id"]],
    representativeUniqueConstraints: [["lexeme_id", "variant"]],
    tableName: "pronunciations",
  },
  SupineForm: {
    representativeIndexes: [["lexeme_id"]],
    representativeUniqueConstraints: [],
    tableName: "forms",
  },
  Text: {
    representativeIndexes: [["author_id"], ["parent_text_id"]],
    representativeUniqueConstraints: [["slug"]],
    tableName: "texts",
  },
  Token: {
    representativeIndexes: [["word_id"]],
    representativeUniqueConstraints: [["index", "line_id"]],
    tableName: "tokens",
  },
  Translation: {
    representativeIndexes: [["lexeme_id"], ["translation_full_text_search"]],
    representativeUniqueConstraints: [],
    tableName: "translations",
  },
  UninflectedInflection: {
    representativeIndexes: [["type"]],
    representativeUniqueConstraints: [],
    tableName: "inflections",
  },
  VerbInflection: {
    representativeIndexes: [["type"]],
    representativeUniqueConstraints: [],
    tableName: "inflections",
  },
  Word: {
    representativeIndexes: [],
    representativeUniqueConstraints: [["data"]],
    tableName: "words",
  },
  WordForm: {
    representativeIndexes: [["form_id"], ["word_id"]],
    representativeUniqueConstraints: [["form_id", "word_id"]],
    tableName: "word_forms",
  },
  WordLexeme: {
    representativeIndexes: [["lexeme_id"], ["word_id"]],
    representativeUniqueConstraints: [["lexeme_id", "word_id"]],
    tableName: "word_lexemes",
  },
};

let container: StartedPostgresContainer | undefined;
let integrationDataSource: DataSource;

async function getTableIndexes(
  dataSource: DataSource,
  schemaName: string,
  tableName: string,
): Promise<readonly TableIndexSnapshot[]> {
  const queryResult: unknown = await dataSource.query(
    `
      SELECT
        index_definition.indisunique AS "isUnique",
        json_agg(attribute.attname ORDER BY array_position(index_definition.indkey, attribute.attnum)) AS "columnNames"
      FROM pg_class AS table_definition
      INNER JOIN pg_namespace AS namespace_definition
        ON namespace_definition.oid = table_definition.relnamespace
      INNER JOIN pg_index AS index_definition
        ON table_definition.oid = index_definition.indrelid
      INNER JOIN pg_class AS index_class
        ON index_class.oid = index_definition.indexrelid
      INNER JOIN pg_attribute AS attribute
        ON attribute.attrelid = table_definition.oid
       AND attribute.attnum = ANY(index_definition.indkey)
      WHERE namespace_definition.nspname = $1
        AND table_definition.relname = $2
        AND index_definition.indisprimary = FALSE
      GROUP BY index_class.relname, index_definition.indisunique
    `,
    [schemaName, tableName],
  );
  const indexRows = toRecordArray(queryResult);

  return indexRows.map((indexRow) => ({
    columnNames: normalizeStringArray(toStringArray(indexRow["columnNames"])),
    isUnique: toBoolean(indexRow["isUnique"]),
  }));
}

async function getTableNames(
  dataSource: DataSource,
  schemaName: string,
): Promise<readonly string[]> {
  const queryResult: unknown = await dataSource.query(
    `
      SELECT tables.table_name AS "tableName"
      FROM information_schema.tables AS tables
      WHERE tables.table_schema = $1
        AND tables.table_type = 'BASE TABLE'
    `,
    [schemaName],
  );
  const tableRows = toRecordArray(queryResult);

  return normalizeStringArray(
    tableRows.map((tableRow) => {
      const tableName = tableRow["tableName"];

      if (typeof tableName !== "string") {
        throw new TypeError(
          "Expected database query result to include a string table name.",
        );
      }

      return tableName;
    }),
  );
}

async function getTableUniqueConstraints(
  dataSource: DataSource,
  schemaName: string,
  tableName: string,
): Promise<readonly (readonly string[])[]> {
  const queryResult: unknown = await dataSource.query(
    `
      SELECT
        json_agg(key_column_usage.column_name ORDER BY key_column_usage.ordinal_position) AS "columnNames"
      FROM information_schema.table_constraints AS table_constraints
      INNER JOIN information_schema.key_column_usage AS key_column_usage
        ON key_column_usage.constraint_name = table_constraints.constraint_name
       AND key_column_usage.table_name = table_constraints.table_name
       AND key_column_usage.table_schema = table_constraints.table_schema
      WHERE table_constraints.constraint_type = 'UNIQUE'
        AND table_constraints.table_schema = $1
        AND table_constraints.table_name = $2
      GROUP BY table_constraints.constraint_name
    `,
    [schemaName, tableName],
  );
  const uniqueRows = toRecordArray(queryResult);

  return uniqueRows.map((constraintRow) =>
    normalizeStringArray(toStringArray(constraintRow["columnNames"])),
  );
}

function getTableUniqueIndexes(
  indexes: readonly TableIndexSnapshot[],
): readonly (readonly string[])[] {
  return indexes
    .filter((index) => index.isUnique)
    .map((index) => normalizeStringArray(index.columnNames));
}

function isRecordArray(
  value: readonly unknown[],
): value is readonly Record<string, unknown>[] {
  return value.every(
    (entry) =>
      typeof entry === "object" && entry !== null && !Array.isArray(entry),
  );
}

function normalizeStringArray(values: readonly string[]): readonly string[] {
  return [...new Set(values)].toSorted((firstValue, secondValue) =>
    firstValue.localeCompare(secondValue),
  );
}

function toBoolean(value: unknown): boolean {
  if (typeof value !== "boolean") {
    throw new TypeError(
      "Expected database query result to return a boolean value.",
    );
  }

  return value;
}

function toRecordArray(value: unknown): readonly Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    throw new TypeError("Expected database query result to return an array.");
  }

  const unknownEntries: readonly unknown[] = value;

  if (!isRecordArray(unknownEntries)) {
    throw new TypeError(
      "Expected database query result array entries to be plain objects.",
    );
  }

  return unknownEntries;
}

function toStringArray(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    throw new TypeError(
      "Expected database query result to return a string array.",
    );
  }

  const unknownEntries: readonly unknown[] = value;

  if (
    !unknownEntries.every((entry): entry is string => typeof entry === "string")
  ) {
    throw new TypeError(
      "Expected database query result array entries to all be strings.",
    );
  }

  return unknownEntries;
}

async function verifyDatabaseSchema(): Promise<void> {
  const tableNames = await getTableNames(
    integrationDataSource,
    INTEGRATION_SCHEMA_NAME,
  );

  expect(tableNames).toContain(MIGRATIONS_TABLE_NAME);
  expect(tableNames).toContain(TYPEORM_METADATA_TABLE_NAME);

  const relevantTableNames = tableNames.filter(
    (tableName) =>
      tableName !== MIGRATIONS_TABLE_NAME &&
      tableName !== TYPEORM_METADATA_TABLE_NAME,
  );

  expect(relevantTableNames).toStrictEqual(
    normalizeStringArray(
      Object.values(ENTITY_INTEGRATION_EXPECTATIONS).map(
        (expectation) => expectation.tableName,
      ),
    ),
  );

  for (const expectation of Object.values(ENTITY_INTEGRATION_EXPECTATIONS)) {
    const indexes = await getTableIndexes(
      integrationDataSource,
      INTEGRATION_SCHEMA_NAME,
      expectation.tableName,
    );

    const uniqueConstraints = await getTableUniqueConstraints(
      integrationDataSource,
      INTEGRATION_SCHEMA_NAME,
      expectation.tableName,
    );
    const uniqueIndexes = getTableUniqueIndexes(indexes);

    for (const representativeIndex of expectation.representativeIndexes) {
      expect(
        indexes.some(
          (index) =>
            !index.isUnique &&
            normalizeStringArray(index.columnNames).join(",") ===
              normalizeStringArray(representativeIndex).join(","),
        ),
      ).toBe(true);
    }

    for (const representativeUniqueConstraint of expectation.representativeUniqueConstraints) {
      expect(
        uniqueConstraints.some(
          (uniqueConstraint) =>
            normalizeStringArray(uniqueConstraint).join(",") ===
            normalizeStringArray(representativeUniqueConstraint).join(","),
        ) ||
          uniqueIndexes.some(
            (uniqueIndex) =>
              normalizeStringArray(uniqueIndex).join(",") ===
              normalizeStringArray(representativeUniqueConstraint).join(","),
          ),
      ).toBe(true);
    }
  }
}

describe("entity integration schema", () => {
  beforeAll(async (): Promise<void> => {
    container = await startPostgresContainer({
      migrations: [...LEXICO_DATABASE_MIGRATIONS],
      project: "lexico",
    });

    // 🎯 The root `.env`, which Nx loads into every task, names the shared
    // container's admin login under the unprefixed variables; the data
    // source must read only `LEXICO_POSTGRES_*`.
    vi.stubEnv("POSTGRES_DB", "postgres");
    vi.stubEnv("POSTGRES_USER", "postgres");

    integrationDataSource = createDataSource(
      {
        entities: [...LEXICO_DATABASE_ENTITIES],
        migrations: [...LEXICO_DATABASE_MIGRATIONS],
        namingStrategy: new LexicoNamingStrategy(),
        project: "lexico",
      },
      { ...process.env, ...container.environment },
    );
    await integrationDataSource.initialize();
  }, CONTAINER_TIMEOUT_MILLISECONDS);

  afterAll(async (): Promise<void> => {
    if (integrationDataSource.isInitialized) {
      await integrationDataSource.destroy();
    }

    await container?.stop();
    vi.unstubAllEnvs();
  }, CONTAINER_TIMEOUT_MILLISECONDS);

  it("connects as lexico_username to lexico_testing", async () => {
    const [session]: { database: string; role: string }[] =
      await integrationDataSource.query(
        "SELECT current_database() AS database, current_user AS role",
      );

    expect(session).toStrictEqual({
      database: "lexico_testing",
      role: "lexico_username",
    });
  });

  it("builds the schema from the migration alone, leaving nothing for the entities to change", async () => {
    const migrations: { name: string }[] = await integrationDataSource.query(
      `SELECT name FROM "${INTEGRATION_SCHEMA_NAME}"."${MIGRATIONS_TABLE_NAME}"`,
    );
    const pending = await integrationDataSource.driver
      .createSchemaBuilder()
      .log();

    expect(migrations.map(({ name }) => name)).toStrictEqual(
      LEXICO_DATABASE_MIGRATIONS.map((migration) => migration.name),
    );
    expect(pending.upQueries.map(({ query }) => query)).toStrictEqual([]);
  });

  it("assigns new rows a uuidv7 id in the database", async () => {
    const [author]: { id: string }[] = await integrationDataSource.query(
      `INSERT INTO "${INTEGRATION_SCHEMA_NAME}"."authors" (name, slug) VALUES ('Vergil', 'vergil') RETURNING id`,
    );

    expect(author?.id).toMatch(
      /^[\da-f]{8}-[\da-f]{4}-7[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/,
    );
  });

  it("stores line and token indexes as bigints that read back as numbers", async () => {
    const columns: { column_name: string; data_type: string }[] =
      await integrationDataSource.query(
        `SELECT table_name || '.' || column_name AS column_name, data_type FROM information_schema.columns WHERE table_schema = $1 AND table_name IN ('lines', 'tokens') AND column_name = 'index' ORDER BY table_name`,
        [INTEGRATION_SCHEMA_NAME],
      );
    const author = await integrationDataSource
      .getRepository(Author)
      .save(Object.assign(new Author(), { name: "Ovid", slug: "ovid" }));
    const text = await integrationDataSource.getRepository(Text).save(
      Object.assign(new Text(), {
        author,
        slug: "ovid/elegies",
        title: "Elegies",
      }),
    );
    const line = await integrationDataSource.getRepository(Line).save(
      Object.assign(new Line(), {
        author,
        data: "arma",
        index: 7,
        label: "8",
        text,
      }),
    );
    await integrationDataSource.getRepository(Token).save(
      Object.assign(new Token(), {
        author,
        data: "arma",
        index: 3,
        isPunctuation: false,
        line,
        text,
      }),
    );

    expect(columns).toStrictEqual([
      { column_name: "lines.index", data_type: "bigint" },
      { column_name: "tokens.index", data_type: "bigint" },
    ]);
    await expect(
      integrationDataSource
        .getRepository(Line)
        .findOneByOrFail({ id: line.id }),
    ).resolves.toMatchObject({ index: 7 });
    await expect(
      integrationDataSource
        .getRepository(Token)
        .findOneByOrFail({ line: { id: line.id } }),
    ).resolves.toMatchObject({ index: 3 });
  });

  it("creates the expected tables, indexes, and uniqueness constraints", async () => {
    await expect(verifyDatabaseSchema()).resolves.toBeUndefined();
  });

  it("should have all registered entities", () => {
    const entityMetadataList = integrationDataSource.entityMetadatas;

    expect(entityMetadataList.length).toBeGreaterThan(0);
    expect(
      entityMetadataList.map((entityMetadata) => entityMetadata.name),
    ).toContain("Author");
    expect(
      entityMetadataList.map((entityMetadata) => entityMetadata.name),
    ).toContain("Text");
    expect(
      entityMetadataList.map((entityMetadata) => entityMetadata.name),
    ).toContain("Line");
    expect(
      entityMetadataList.map((entityMetadata) => entityMetadata.name),
    ).toContain("Token");
  });

  it("should retrieve table metadata for all entities", () => {
    const entityMetadataList = integrationDataSource.entityMetadatas;
    const tableNames = entityMetadataList.map(
      (entityMetadata) => entityMetadata.tableName,
    );

    expect(tableNames).toContain("authors");
    expect(tableNames).toContain("texts");
    expect(tableNames).toContain("lines");
    expect(tableNames).toContain("tokens");
    expect(tableNames).toContain("words");
    expect(tableNames).toContain("lexemes");
  });

  it("should define relationships on Text entity", () => {
    const textMetadata = integrationDataSource.getMetadata("Text");
    const relations = textMetadata.relations;

    expect(
      relations.some((relation) => relation.propertyName === "author"),
    ).toBe(true);
    expect(
      relations.some((relation) => relation.propertyName === "lines"),
    ).toBe(true);
  });

  it("should define relationships on Token entity", () => {
    const tokenMetadata = integrationDataSource.getMetadata("Token");
    const relations = tokenMetadata.relations;

    expect(relations.some((relation) => relation.propertyName === "line")).toBe(
      true,
    );
    expect(relations.some((relation) => relation.propertyName === "text")).toBe(
      true,
    );
    expect(relations.some((relation) => relation.propertyName === "word")).toBe(
      true,
    );
  });
});
