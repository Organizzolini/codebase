import { Test } from "@nestjs/testing";
import "reflect-metadata";
import { DataSource, getMetadataArgsStorage } from "typeorm";
import { beforeAll, describe, expect, it } from "vitest";

import {
  assertEntityHasTableMetadata,
  assertEntityRegistryMatches,
  assertExactSet,
  assertRelationOptions,
  type EntityClass,
  getEntityRelationMetadata,
  getEntityRelations,
  getEntityTableMetadata,
} from "../../../testing/entity-definition-assertions";
import {
  LEXICO_DATABASE_ENTITIES,
  lexicoDataSource,
} from "../lexico-database/data-source.constants";
import {
  adjectiveDegreeValues,
  adverbDegrees,
  adverbTypes,
  formCaseValues,
  formDegreeValues,
  formGenderValues,
  formMoodValues,
  formNumberValues,
  formPersonValues,
  formTenseValues,
  formVoiceValues,
  inflectionDeclensionValues,
  nounGenders,
  prepositionCases,
  verbConjugationValues,
} from "../lexico-database/lexico-database.constants";

import { partsOfSpeech } from "./dictionary/PartOfSpeech.entity";
import { pronunciationVariants } from "./dictionary/Pronunciation.entity";
import { EntitiesService } from "./entities.service";

class MetadataDataSource extends DataSource {
  public async buildMetadataForTests(): Promise<void> {
    await this.buildMetadatas();
  }
}

const metadataDataSource = new MetadataDataSource({
  ...lexicoDataSource.options,
  entities: [...LEXICO_DATABASE_ENTITIES],
});

interface EntityColumnExpectation {
  readonly databaseName?: string;
  readonly enumValues?: readonly string[];
  readonly generationStrategy?: "increment" | "rowid" | "uuid";
  readonly isGenerated?: boolean;
  readonly isNullable?: boolean;
  readonly isPrimary?: boolean;
  readonly type?: string;
}

interface EntityDefinitionExpectation {
  readonly columns: Readonly<Record<string, EntityColumnExpectation>>;
  readonly entityClass: EntityClass;
  readonly indexes: readonly EntityIndexExpectation[];
  readonly primaryKeyPropertyNames: readonly string[];
  readonly tableName: string;
  readonly uniqueConstraints: readonly (readonly string[])[];
}

interface EntityExpectationOverrides {
  readonly columns?: Readonly<Record<string, EntityColumnExpectation>>;
  readonly indexes?: readonly EntityIndexExpectation[];
  readonly primaryKeyPropertyNames?: readonly string[];
  readonly tableName: string;
  readonly uniqueConstraints?: readonly (readonly string[])[];
}

interface EntityIndexExpectation {
  readonly isUnique?: boolean;
  readonly propertyNames: readonly string[];
}

interface EntityInheritanceExpectation {
  readonly childDiscriminatorValues?: Readonly<Record<string, string>>;
  readonly discriminatorColumnName?: string;
  readonly discriminatorValue?: string;
  readonly entityClass: EntityClass;
  readonly inheritancePattern?: "STI";
  readonly parentEntityName?: string;
}

interface EntityRelationExpectation {
  readonly inverseSidePropertyName?: string;
  readonly isEager?: boolean;
  readonly isNullable?: boolean;
  readonly kind: "many-to-many" | "many-to-one" | "one-to-many" | "one-to-one";
  readonly onDelete?: "CASCADE" | "NO ACTION" | "SET NULL";
  readonly onUpdate?: "CASCADE" | "NO ACTION" | "SET NULL";
  readonly propertyName: string;
}

const AUDITABLE_COLUMN_EXPECTATIONS = {
  createdBy: {
    type: "uuid",
  },
  deletedAt: {},
  deletedBy: {
    type: "uuid",
  },
  id: {
    isGenerated: false,
    isPrimary: true,
    type: "uuid",
  },
  updatedBy: {
    type: "uuid",
  },
} satisfies Readonly<Record<string, EntityColumnExpectation>>;

const INFLECTION_COLUMN_EXPECTATIONS = {
  id: {
    generationStrategy: "uuid",
    isPrimary: true,
    type: "uuid",
  },
} satisfies Readonly<Record<string, EntityColumnExpectation>>;

const FORM_INDEX_EXPECTATIONS = [
  { propertyNames: ["lexeme"] },
  { propertyNames: ["type"] },
] satisfies readonly EntityIndexExpectation[];

const INFLECTION_INDEX_EXPECTATIONS = [
  { propertyNames: ["type"] },
] satisfies readonly EntityIndexExpectation[];

const FORM_CHILD_DISCRIMINATOR_VALUES = {
  AdjectivalForm: "adjectival",
  AdverbForm: "adverb",
  FiniteVerbForm: "finite-verb",
  GerundForm: "gerund",
  InfinitiveForm: "infinitive",
  NominalForm: "nominal",
  ParticipleForm: "participle",
  SupineForm: "supine",
} satisfies Readonly<Record<string, string>>;

const INFLECTION_CHILD_DISCRIMINATOR_VALUES = {
  AdjectiveInflection: "adjective",
  AdverbInflection: "adverb",
  NounInflection: "noun",
  PrepositionInflection: "preposition",
  UninflectedInflection: "uninflected",
  VerbInflection: "verb",
} satisfies Readonly<Record<string, string>>;

function createAuditableEntityExpectation(
  entityName: string,
  overrides: EntityExpectationOverrides,
): EntityDefinitionExpectation {
  return createEntityExpectation(getRegisteredEntityClass(entityName), {
    ...overrides,
    columns: {
      ...AUDITABLE_COLUMN_EXPECTATIONS,
      ...overrides.columns,
    },
  });
}

function createEntityExpectation(
  entityClass: EntityClass,
  overrides: EntityExpectationOverrides,
): EntityDefinitionExpectation {
  return {
    columns: overrides.columns ?? {},
    entityClass,
    indexes: overrides.indexes ?? [],
    primaryKeyPropertyNames: overrides.primaryKeyPropertyNames ?? ["id"],
    tableName: overrides.tableName,
    uniqueConstraints: overrides.uniqueConstraints ?? [],
  };
}

function createEntityInheritanceExpectation(
  entityName: string,
  overrides: Omit<EntityInheritanceExpectation, "entityClass">,
): EntityInheritanceExpectation {
  return {
    entityClass: getRegisteredEntityClass(entityName),
    ...overrides,
  };
}

function createInflectionEntityExpectation(
  entityName: string,
  overrides: EntityExpectationOverrides,
): EntityDefinitionExpectation {
  return createEntityExpectation(getRegisteredEntityClass(entityName), {
    ...overrides,
    columns: {
      ...INFLECTION_COLUMN_EXPECTATIONS,
      ...overrides.columns,
    },
  });
}

function getComparableInheritanceDiscriminatorValue(
  entityName: string,
  discriminatorValue: string,
): string {
  return `${entityName}:${discriminatorValue}`;
}

function getRegisteredEntityClass(entityName: string): EntityClass {
  const entityClass = LEXICO_DATABASE_ENTITIES.find(
    (registeredEntityClass) => registeredEntityClass.name === entityName,
  );

  if (entityClass === undefined) {
    throw new Error(`Missing registered entity '${entityName}'.`);
  }

  return entityClass;
}

function getRegisteredInheritanceEntityNames(): readonly string[] {
  return LEXICO_DATABASE_ENTITIES.map((entityClass) =>
    metadataDataSource.getMetadata(entityClass),
  )
    .filter(
      (entityMetadata) =>
        entityMetadata.childEntityMetadatas.length > 0 ||
        entityMetadata.tableType === "entity-child",
    )
    .map((entityMetadata) => entityMetadata.name);
}

function normalizeColumnType(columnType: unknown): string {
  return typeof columnType === "function"
    ? columnType.name
    : String(columnType);
}

function normalizeEnumValues(
  enumValues: readonly (number | string)[] | undefined,
): readonly string[] {
  if (enumValues === undefined) {
    return [];
  }

  return normalizeStringArray(enumValues.map(String));
}

function normalizeStringArray(values: readonly string[]): readonly string[] {
  return [...new Set(values)].toSorted((firstValue, secondValue) =>
    firstValue.localeCompare(secondValue),
  );
}

function verifyColumnExpectations(
  entityExpectation: EntityDefinitionExpectation,
): void {
  const entityMetadata = metadataDataSource.getMetadata(
    entityExpectation.entityClass,
  );

  for (const [propertyName, columnExpectation] of Object.entries(
    entityExpectation.columns,
  )) {
    const columnMetadata =
      entityMetadata.findColumnWithPropertyName(propertyName);

    expect(
      columnMetadata,
      `Missing column metadata '${propertyName}' for entity ${entityExpectation.entityClass.name}.`,
    ).toBeDefined();

    if (columnMetadata === undefined) {
      continue;
    }

    if (columnExpectation.databaseName !== undefined) {
      expect(columnMetadata.databaseName).toBe(columnExpectation.databaseName);
    }

    if (columnExpectation.enumValues !== undefined) {
      expect(normalizeColumnType(columnMetadata.type)).toBe("enum");
      expect(normalizeEnumValues(columnMetadata.enum)).toStrictEqual(
        normalizeStringArray(columnExpectation.enumValues),
      );
    }

    if (columnExpectation.generationStrategy !== undefined) {
      expect(columnMetadata.generationStrategy).toBe(
        columnExpectation.generationStrategy,
      );
    }

    if (columnExpectation.isGenerated !== undefined) {
      expect(columnMetadata.isGenerated).toBe(columnExpectation.isGenerated);
    }

    if (columnExpectation.isNullable !== undefined) {
      expect(columnMetadata.isNullable).toBe(columnExpectation.isNullable);
    }

    if (columnExpectation.isPrimary !== undefined) {
      expect(columnMetadata.isPrimary).toBe(columnExpectation.isPrimary);
    }

    if (columnExpectation.type !== undefined) {
      expect(normalizeColumnType(columnMetadata.type)).toBe(
        columnExpectation.type,
      );
    }
  }
}

function verifyEntityDefinitionExpectation(
  entityExpectation: EntityDefinitionExpectation,
): void {
  assertEntityHasTableMetadata(entityExpectation.entityClass);

  expect(
    getEntityTableMetadata(entityExpectation.entityClass).schema,
    `Entity ${entityExpectation.entityClass.name} names a schema; it must come from LEXICO_POSTGRES_SCHEMA.`,
  ).toBeUndefined();

  const entityMetadata = metadataDataSource.getMetadata(
    entityExpectation.entityClass,
  );

  expect(entityMetadata.tableName).toBe(entityExpectation.tableName);
  expect(
    normalizeStringArray(
      entityMetadata.primaryColumns.map(
        (columnMetadata) => columnMetadata.propertyName,
      ),
    ),
  ).toStrictEqual(
    normalizeStringArray(entityExpectation.primaryKeyPropertyNames),
  );

  verifyColumnExpectations(entityExpectation);
}

function verifyEntityInheritanceExpectation(
  entityInheritanceExpectation: EntityInheritanceExpectation,
): void {
  const entityMetadata = metadataDataSource.getMetadata(
    entityInheritanceExpectation.entityClass,
  );

  if (entityInheritanceExpectation.inheritancePattern !== undefined) {
    expect(entityMetadata.inheritancePattern).toBe(
      entityInheritanceExpectation.inheritancePattern,
    );
  }

  if (entityInheritanceExpectation.discriminatorColumnName !== undefined) {
    expect(entityMetadata.discriminatorColumn?.propertyName).toBe(
      entityInheritanceExpectation.discriminatorColumnName,
    );
    expect(entityMetadata.discriminatorColumn?.databaseName).toBe(
      entityInheritanceExpectation.discriminatorColumnName,
    );
  }

  if (entityInheritanceExpectation.discriminatorValue !== undefined) {
    expect(entityMetadata.discriminatorValue).toBe(
      entityInheritanceExpectation.discriminatorValue,
    );
  }

  if (entityInheritanceExpectation.parentEntityName !== undefined) {
    expect(entityMetadata.parentEntityMetadata.name).toBe(
      entityInheritanceExpectation.parentEntityName,
    );
  }

  if (entityInheritanceExpectation.childDiscriminatorValues !== undefined) {
    assertExactSet(
      entityMetadata.childEntityMetadatas
        .map((childEntityMetadata) => {
          const discriminatorValue = childEntityMetadata.discriminatorValue;

          return discriminatorValue === undefined
            ? undefined
            : getComparableInheritanceDiscriminatorValue(
                childEntityMetadata.name,
                discriminatorValue,
              );
        })
        .filter((value): value is string => value !== undefined),
      Object.entries(entityInheritanceExpectation.childDiscriminatorValues).map(
        ([entityName, discriminatorValue]) =>
          getComparableInheritanceDiscriminatorValue(
            entityName,
            discriminatorValue,
          ),
      ),
      {
        label: `${entityInheritanceExpectation.entityClass.name} discriminator metadata`,
        toComparableString: (value) => value,
      },
    );
  }
}

function verifyRelationExpectations(
  entityClass: EntityClass,
  relationExpectations: readonly EntityRelationExpectation[],
): void {
  const actualRelations = getEntityRelations(entityClass);

  assertExactSet(
    actualRelations.map((relation) => relation.propertyName),
    relationExpectations.map((expectation) => expectation.propertyName),
    {
      label: `${entityClass.name} relation properties`,
      toComparableString: (value) => value,
    },
  );

  for (const relationExpectation of relationExpectations) {
    const relationMetadata = getEntityRelationMetadata(
      entityClass,
      relationExpectation.propertyName,
    );

    expect(relationMetadata.relationType).toBe(relationExpectation.kind);

    if (relationExpectation.isEager !== undefined) {
      assertRelationOptions(relationMetadata, {
        eager: relationExpectation.isEager,
      });
    }

    if (relationExpectation.isNullable !== undefined) {
      assertRelationOptions(relationMetadata, {
        nullable: relationExpectation.isNullable,
      });
    }

    if (relationExpectation.onDelete !== undefined) {
      assertRelationOptions(relationMetadata, {
        onDelete: relationExpectation.onDelete,
      });
    }

    if (relationExpectation.onUpdate !== undefined) {
      expect(relationMetadata.options.onUpdate).toBe(
        relationExpectation.onUpdate,
      );
    }
  }
}

const ENTITY_EXPECTATIONS = {
  AdjectivalForm: createAuditableEntityExpectation("AdjectivalForm", {
    columns: {
      case: {
        databaseName: "form_case",
        enumValues: formCaseValues,
        type: "enum",
      },
      gender: {
        enumValues: formGenderValues,
        type: "enum",
      },
      number: {
        enumValues: formNumberValues,
        type: "enum",
      },
    },
    indexes: FORM_INDEX_EXPECTATIONS,
    tableName: "forms",
  }),
  AdjectiveInflection: createInflectionEntityExpectation(
    "AdjectiveInflection",
    {
      columns: {
        declension: {
          enumValues: inflectionDeclensionValues,
          type: "enum",
        },
        degree: {
          enumValues: adjectiveDegreeValues,
          type: "enum",
        },
      },
      indexes: INFLECTION_INDEX_EXPECTATIONS,
      tableName: "inflections",
    },
  ),
  AdverbForm: createAuditableEntityExpectation("AdverbForm", {
    columns: {
      degree: {
        enumValues: formDegreeValues,
        type: "enum",
      },
    },
    indexes: FORM_INDEX_EXPECTATIONS,
    tableName: "forms",
  }),
  AdverbInflection: createInflectionEntityExpectation("AdverbInflection", {
    columns: {
      adverbType: {
        enumValues: adverbTypes,
        type: "enum",
      },
      degree: {
        enumValues: adverbDegrees,
        type: "enum",
      },
    },
    indexes: INFLECTION_INDEX_EXPECTATIONS,
    tableName: "inflections",
  }),
  Author: createAuditableEntityExpectation("Author", {
    columns: {
      metadata: {},
      name: {},
      slug: {},
    },
    tableName: "authors",
    uniqueConstraints: [["slug"]],
  }),
  FiniteVerbForm: createAuditableEntityExpectation("FiniteVerbForm", {
    columns: {
      mood: {
        enumValues: formMoodValues,
        type: "enum",
      },
      number: {
        enumValues: formNumberValues,
        type: "enum",
      },
      person: {
        enumValues: formPersonValues,
        type: "enum",
      },
      tense: {
        enumValues: formTenseValues,
        type: "enum",
      },
      voice: {
        enumValues: formVoiceValues,
        type: "enum",
      },
    },
    indexes: FORM_INDEX_EXPECTATIONS,
    tableName: "forms",
  }),
  Form: createAuditableEntityExpectation("Form", {
    indexes: FORM_INDEX_EXPECTATIONS,
    tableName: "forms",
  }),
  GerundForm: createAuditableEntityExpectation("GerundForm", {
    columns: {
      case: {
        databaseName: "form_case",
        enumValues: formCaseValues,
        type: "enum",
      },
    },
    indexes: FORM_INDEX_EXPECTATIONS,
    tableName: "forms",
  }),
  InfinitiveForm: createAuditableEntityExpectation("InfinitiveForm", {
    columns: {
      tense: {
        enumValues: formTenseValues,
        type: "enum",
      },
      voice: {
        enumValues: formVoiceValues,
        type: "enum",
      },
    },
    indexes: FORM_INDEX_EXPECTATIONS,
    tableName: "forms",
  }),
  Inflection: createInflectionEntityExpectation("Inflection", {
    indexes: INFLECTION_INDEX_EXPECTATIONS,
    tableName: "inflections",
    uniqueConstraints: [["lexeme"]],
  }),
  Lexeme: createAuditableEntityExpectation("Lexeme", {
    columns: {
      disambiguator: {},
      etymology: {},
      lemma: {},
      partOfSpeech: {
        enumValues: partsOfSpeech,
        type: "enum",
      },
    },
    indexes: [
      { propertyNames: ["lemma"] },
      { propertyNames: ["partOfSpeech"] },
    ],
    tableName: "lexemes",
    uniqueConstraints: [["disambiguator", "lemma"]],
  }),
  Line: createAuditableEntityExpectation("Line", {
    columns: {
      data: {},
      index: {},
      label: {},
    },
    indexes: [
      { propertyNames: ["author"] },
      { isUnique: true, propertyNames: ["index", "text"] },
    ],
    tableName: "lines",
  }),
  NominalForm: createAuditableEntityExpectation("NominalForm", {
    columns: {
      case: {
        databaseName: "form_case",
        enumValues: formCaseValues,
        type: "enum",
      },
      number: {
        enumValues: formNumberValues,
        type: "enum",
      },
    },
    indexes: FORM_INDEX_EXPECTATIONS,
    tableName: "forms",
  }),
  NounInflection: createInflectionEntityExpectation("NounInflection", {
    columns: {
      declension: {
        enumValues: inflectionDeclensionValues,
        type: "enum",
      },
      gender: {
        enumValues: nounGenders,
        type: "enum",
      },
    },
    indexes: INFLECTION_INDEX_EXPECTATIONS,
    tableName: "inflections",
  }),
  ParticipleForm: createAuditableEntityExpectation("ParticipleForm", {
    columns: {
      tense: {
        enumValues: formTenseValues,
        type: "enum",
      },
      voice: {
        enumValues: formVoiceValues,
        type: "enum",
      },
    },
    indexes: FORM_INDEX_EXPECTATIONS,
    tableName: "forms",
  }),
  PrepositionInflection: createInflectionEntityExpectation(
    "PrepositionInflection",
    {
      columns: {
        case: {
          enumValues: prepositionCases,
          type: "enum",
        },
        other: {},
      },
      indexes: INFLECTION_INDEX_EXPECTATIONS,
      tableName: "inflections",
    },
  ),
  PrincipalPart: createAuditableEntityExpectation("PrincipalPart", {
    columns: {
      name: {},
      text: {},
    },
    indexes: [{ propertyNames: ["lexeme"] }],
    tableName: "principal_parts",
  }),
  Pronunciation: createAuditableEntityExpectation("Pronunciation", {
    columns: {
      phonemes: {},
      phonemic: {},
      phonetic: {},
      variant: {
        enumValues: pronunciationVariants,
        type: "enum",
      },
    },
    indexes: [
      { propertyNames: ["lexeme"] },
      { propertyNames: ["phonemes"] },
      { propertyNames: ["phonemic"] },
      { propertyNames: ["variant"] },
    ],
    tableName: "pronunciations",
    uniqueConstraints: [["lexeme", "variant"]],
  }),
  SupineForm: createAuditableEntityExpectation("SupineForm", {
    columns: {
      case: {
        databaseName: "form_case",
        enumValues: formCaseValues,
        type: "enum",
      },
    },
    indexes: FORM_INDEX_EXPECTATIONS,
    tableName: "forms",
  }),
  Text: createAuditableEntityExpectation("Text", {
    columns: {
      metadata: {},
      slug: {},
      title: {},
      type: {},
    },
    indexes: [{ propertyNames: ["author"] }, { propertyNames: ["parentText"] }],
    tableName: "texts",
    uniqueConstraints: [["slug"]],
  }),
  Token: createAuditableEntityExpectation("Token", {
    columns: {
      data: {},
      index: {},
      isPunctuation: {},
      word: {},
    },
    indexes: [
      { propertyNames: ["author"] },
      { propertyNames: ["data"] },
      { isUnique: true, propertyNames: ["index", "line"] },
      { propertyNames: ["index", "text"] },
      { propertyNames: ["word"] },
    ],
    tableName: "tokens",
  }),
  Translation: createAuditableEntityExpectation("Translation", {
    columns: {
      data: {},
      translationFullTextSearch: {
        type: "tsvector",
      },
    },
    indexes: [
      { propertyNames: ["data"] },
      { propertyNames: ["lexeme"] },
      { propertyNames: ["translationFullTextSearch"] },
    ],
    tableName: "translations",
  }),
  UninflectedInflection: createInflectionEntityExpectation(
    "UninflectedInflection",
    {
      indexes: INFLECTION_INDEX_EXPECTATIONS,
      tableName: "inflections",
    },
  ),
  VerbInflection: createInflectionEntityExpectation("VerbInflection", {
    columns: {
      conjugation: {
        enumValues: verbConjugationValues,
        type: "enum",
      },
      other: {},
    },
    indexes: INFLECTION_INDEX_EXPECTATIONS,
    tableName: "inflections",
  }),
  Word: createAuditableEntityExpectation("Word", {
    columns: {
      data: {},
    },
    tableName: "words",
    uniqueConstraints: [["data"]],
  }),
  WordForm: createAuditableEntityExpectation("WordForm", {
    indexes: [
      { propertyNames: ["form"] },
      { isUnique: true, propertyNames: ["form", "word"] },
      { propertyNames: ["word"] },
    ],
    tableName: "word_forms",
  }),
  WordLexeme: createAuditableEntityExpectation("WordLexeme", {
    indexes: [
      { propertyNames: ["lexeme"] },
      { isUnique: true, propertyNames: ["lexeme", "word"] },
      { propertyNames: ["word"] },
    ],
    tableName: "word_lexemes",
  }),
} satisfies Record<string, EntityDefinitionExpectation>;

const ENTITY_RELATION_EXPECTATIONS: Readonly<
  Record<string, readonly EntityRelationExpectation[]>
> = {
  AdjectivalForm: [],
  AdjectiveInflection: [],
  AdverbForm: [],
  AdverbInflection: [],
  Author: [
    {
      inverseSidePropertyName: "author",
      kind: "one-to-many",
      propertyName: "texts",
    },
  ],
  FiniteVerbForm: [],
  Form: [
    {
      inverseSidePropertyName: "forms",
      kind: "many-to-one",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
      propertyName: "lexeme",
    },
    {
      inverseSidePropertyName: "form",
      kind: "one-to-many",
      propertyName: "wordForms",
    },
  ],
  GerundForm: [],
  InfinitiveForm: [],
  Inflection: [
    {
      inverseSidePropertyName: "inflection",
      kind: "one-to-one",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
      propertyName: "lexeme",
    },
  ],
  Lexeme: [
    {
      inverseSidePropertyName: "lexeme",
      kind: "one-to-many",
      onDelete: "CASCADE",
      propertyName: "forms",
    },
    {
      inverseSidePropertyName: "lexeme",
      kind: "one-to-one",
      propertyName: "inflection",
    },
    {
      inverseSidePropertyName: "lexeme",
      kind: "one-to-many",
      onDelete: "CASCADE",
      propertyName: "principalParts",
    },
    {
      inverseSidePropertyName: "lexeme",
      kind: "one-to-many",
      onDelete: "CASCADE",
      propertyName: "pronunciations",
    },
    {
      inverseSidePropertyName: "lexeme",
      kind: "one-to-many",
      onDelete: "CASCADE",
      propertyName: "translations",
    },
    {
      inverseSidePropertyName: "lexeme",
      kind: "one-to-many",
      propertyName: "wordLexemes",
    },
  ],
  Line: [
    {
      kind: "many-to-one",
      onDelete: "CASCADE",
      propertyName: "author",
    },
    {
      inverseSidePropertyName: "lines",
      isEager: true,
      kind: "many-to-one",
      onDelete: "CASCADE",
      propertyName: "text",
    },
    {
      inverseSidePropertyName: "line",
      kind: "one-to-many",
      propertyName: "tokens",
    },
  ],
  NominalForm: [],
  NounInflection: [],
  ParticipleForm: [],
  PrepositionInflection: [],
  PrincipalPart: [
    {
      inverseSidePropertyName: "principalParts",
      kind: "many-to-one",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
      propertyName: "lexeme",
    },
  ],
  Pronunciation: [
    {
      inverseSidePropertyName: "pronunciations",
      kind: "many-to-one",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
      propertyName: "lexeme",
    },
  ],
  SupineForm: [],
  Text: [
    {
      inverseSidePropertyName: "texts",
      isEager: true,
      kind: "many-to-one",
      onDelete: "CASCADE",
      propertyName: "author",
    },
    {
      inverseSidePropertyName: "parentText",
      kind: "one-to-many",
      propertyName: "childTexts",
    },
    {
      inverseSidePropertyName: "text",
      kind: "one-to-many",
      propertyName: "lines",
    },
    {
      inverseSidePropertyName: "childTexts",
      kind: "many-to-one",
      onDelete: "CASCADE",
      propertyName: "parentText",
    },
  ],
  Token: [
    {
      kind: "many-to-one",
      onDelete: "CASCADE",
      propertyName: "author",
    },
    {
      inverseSidePropertyName: "tokens",
      kind: "many-to-one",
      onDelete: "CASCADE",
      propertyName: "line",
    },
    {
      kind: "many-to-one",
      onDelete: "CASCADE",
      propertyName: "text",
    },
    {
      kind: "many-to-one",
      propertyName: "word",
    },
  ],
  Translation: [
    {
      inverseSidePropertyName: "translations",
      kind: "many-to-one",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
      propertyName: "lexeme",
    },
  ],
  UninflectedInflection: [],
  VerbInflection: [],
  Word: [
    {
      inverseSidePropertyName: "word",
      kind: "one-to-many",
      propertyName: "wordForms",
    },
    {
      inverseSidePropertyName: "word",
      kind: "one-to-many",
      propertyName: "wordLexemes",
    },
  ],
  WordForm: [
    {
      inverseSidePropertyName: "wordForms",
      kind: "many-to-one",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
      propertyName: "form",
    },
    {
      inverseSidePropertyName: "wordForms",
      kind: "many-to-one",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
      propertyName: "word",
    },
  ],
  WordLexeme: [
    {
      inverseSidePropertyName: "wordLexemes",
      kind: "many-to-one",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
      propertyName: "lexeme",
    },
    {
      inverseSidePropertyName: "wordLexemes",
      kind: "many-to-one",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
      propertyName: "word",
    },
  ],
} satisfies Readonly<Record<string, readonly EntityRelationExpectation[]>>;

const ENTITY_INHERITANCE_EXPECTATIONS = {
  AdjectivalForm: createEntityInheritanceExpectation("AdjectivalForm", {
    discriminatorColumnName: "type",
    discriminatorValue: "adjectival",
    parentEntityName: "Form",
  }),
  AdjectiveInflection: createEntityInheritanceExpectation(
    "AdjectiveInflection",
    {
      discriminatorColumnName: "type",
      discriminatorValue: "adjective",
      parentEntityName: "Inflection",
    },
  ),
  AdverbForm: createEntityInheritanceExpectation("AdverbForm", {
    discriminatorColumnName: "type",
    discriminatorValue: "adverb",
    parentEntityName: "Form",
  }),
  AdverbInflection: createEntityInheritanceExpectation("AdverbInflection", {
    discriminatorColumnName: "type",
    discriminatorValue: "adverb",
    parentEntityName: "Inflection",
  }),
  FiniteVerbForm: createEntityInheritanceExpectation("FiniteVerbForm", {
    discriminatorColumnName: "type",
    discriminatorValue: "finite-verb",
    parentEntityName: "Form",
  }),
  Form: createEntityInheritanceExpectation("Form", {
    childDiscriminatorValues: FORM_CHILD_DISCRIMINATOR_VALUES,
    discriminatorColumnName: "type",
    inheritancePattern: "STI",
  }),
  GerundForm: createEntityInheritanceExpectation("GerundForm", {
    discriminatorColumnName: "type",
    discriminatorValue: "gerund",
    parentEntityName: "Form",
  }),
  InfinitiveForm: createEntityInheritanceExpectation("InfinitiveForm", {
    discriminatorColumnName: "type",
    discriminatorValue: "infinitive",
    parentEntityName: "Form",
  }),
  Inflection: createEntityInheritanceExpectation("Inflection", {
    childDiscriminatorValues: INFLECTION_CHILD_DISCRIMINATOR_VALUES,
    discriminatorColumnName: "type",
    inheritancePattern: "STI",
  }),
  NominalForm: createEntityInheritanceExpectation("NominalForm", {
    discriminatorColumnName: "type",
    discriminatorValue: "nominal",
    parentEntityName: "Form",
  }),
  NounInflection: createEntityInheritanceExpectation("NounInflection", {
    discriminatorColumnName: "type",
    discriminatorValue: "noun",
    parentEntityName: "Inflection",
  }),
  ParticipleForm: createEntityInheritanceExpectation("ParticipleForm", {
    discriminatorColumnName: "type",
    discriminatorValue: "participle",
    parentEntityName: "Form",
  }),
  PrepositionInflection: createEntityInheritanceExpectation(
    "PrepositionInflection",
    {
      discriminatorColumnName: "type",
      discriminatorValue: "preposition",
      parentEntityName: "Inflection",
    },
  ),
  SupineForm: createEntityInheritanceExpectation("SupineForm", {
    discriminatorColumnName: "type",
    discriminatorValue: "supine",
    parentEntityName: "Form",
  }),
  UninflectedInflection: createEntityInheritanceExpectation(
    "UninflectedInflection",
    {
      discriminatorColumnName: "type",
      discriminatorValue: "uninflected",
      parentEntityName: "Inflection",
    },
  ),
  VerbInflection: createEntityInheritanceExpectation("VerbInflection", {
    discriminatorColumnName: "type",
    discriminatorValue: "verb",
    parentEntityName: "Inflection",
  }),
} satisfies Readonly<Record<string, EntityInheritanceExpectation>>;

describe(EntitiesService, () => {
  let service: EntitiesService;

  beforeAll(async (): Promise<void> => {
    const module = await Test.createTestingModule({
      providers: [EntitiesService],
    }).compile();

    service = await module.resolve(EntitiesService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("eNTITY_EXPECTATIONS", () => {
    beforeAll(async (): Promise<void> => {
      if (metadataDataSource.entityMetadatas.length > 0) {
        return;
      }

      await metadataDataSource.buildMetadataForTests();
    });

    it("covers every registered entity exactly once", () => {
      expect(() => {
        assertEntityRegistryMatches(
          Object.values(ENTITY_EXPECTATIONS).map(
            (entityExpectation) => entityExpectation.entityClass,
          ),
          LEXICO_DATABASE_ENTITIES,
        );

        assertExactSet(
          Object.keys(ENTITY_EXPECTATIONS),
          LEXICO_DATABASE_ENTITIES.map((entityClass) => entityClass.name),
          {
            label: "entity expectation coverage",
            toComparableString: (value) => value,
          },
        );
      }).not.toThrow();
    });

    it("defines a canonical metadata expectation surface", () => {
      for (const entityExpectation of Object.values(ENTITY_EXPECTATIONS)) {
        expect(entityExpectation.entityClass.name).toBeTypeOf("string");
        expect(entityExpectation.tableName).toBeTypeOf("string");
        expect(entityExpectation.primaryKeyPropertyNames).toStrictEqual(["id"]);
        expect(Object.keys(entityExpectation.columns).length).toBeGreaterThan(
          0,
        );
      }
    });
  });

  describe("entity metadata definitions", () => {
    it.each(Object.values(ENTITY_EXPECTATIONS))(
      "$entityClass.name matches its metadata contract",
      (entityExpectation) => {
        expect(() => {
          verifyEntityDefinitionExpectation(entityExpectation);
        }).not.toThrow();
      },
    );
  });

  describe("entity relation contracts", () => {
    beforeAll(async (): Promise<void> => {
      if (metadataDataSource.entityMetadatas.length > 0) {
        return;
      }

      await metadataDataSource.buildMetadataForTests();
    });

    it("covers every registered entity exactly once in relation expectations", () => {
      expect(() => {
        assertExactSet(
          Object.keys(ENTITY_RELATION_EXPECTATIONS),
          LEXICO_DATABASE_ENTITIES.map((entityClass) => entityClass.name),
          {
            label: "entity relation expectation coverage",
            toComparableString: (value) => value,
          },
        );
      }).not.toThrow();
    });

    it.each(Object.entries(ENTITY_RELATION_EXPECTATIONS))(
      "%s relation definitions match their contract",
      (entityName, relationExpectations) => {
        const entityClass = getRegisteredEntityClass(entityName);

        expect(() => {
          verifyRelationExpectations(entityClass, relationExpectations);
        }).not.toThrow();
      },
    );
  });

  describe("entity inheritance contracts", () => {
    beforeAll(async (): Promise<void> => {
      if (metadataDataSource.entityMetadatas.length > 0) {
        return;
      }

      await metadataDataSource.buildMetadataForTests();
    });

    it("covers every registered inheritance entity exactly once", () => {
      expect(() => {
        assertExactSet(
          getRegisteredInheritanceEntityNames(),
          Object.keys(ENTITY_INHERITANCE_EXPECTATIONS),
          {
            label: "entity inheritance expectation coverage",
            toComparableString: (value) => value,
          },
        );
      }).not.toThrow();
    });

    it.each(Object.values(ENTITY_INHERITANCE_EXPECTATIONS))(
      "$entityClass.name inheritance metadata matches its contract",
      (entityInheritanceExpectation) => {
        expect(() => {
          verifyEntityInheritanceExpectation(entityInheritanceExpectation);
        }).not.toThrow();
      },
    );
  });

  type EntityRelationMetadata = ReturnType<
    typeof getMetadataArgsStorage
  >["relations"][number];
  type RelationMetadataWithTarget = Pick<
    EntityRelationMetadata,
    "inverseSideProperty" | "propertyName" | "target" | "type"
  >;

  function createRelationProxy(): Record<string, string> {
    return new Proxy<Record<string, string>>(
      {},
      {
        get: (_target, propertyName) => String(propertyName),
      },
    );
  }

  function getRelationMetadataForKnownEntities(): readonly RelationMetadataWithTarget[] {
    const metadataStorage = getMetadataArgsStorage();

    return metadataStorage.relations.filter((relationMetadata) =>
      isKnownEntityTargetForCallbacks(relationMetadata.target),
    );
  }

  function isKnownEntityTargetForCallbacks(
    relationTarget: EntityRelationMetadata["target"],
  ): boolean {
    if (typeof relationTarget === "string") {
      return LEXICO_DATABASE_ENTITIES.some(
        (entityClass) => entityClass.name === relationTarget,
      );
    }

    if (typeof relationTarget === "function") {
      return LEXICO_DATABASE_ENTITIES.some(
        (entityClass) => entityClass.name === relationTarget.name,
      );
    }

    return false;
  }

  describe("entity decorator callback metadata", () => {
    it("resolves relation callbacks for all registered entity relations", () => {
      const relationMetadataList = getRelationMetadataForKnownEntities();

      expect(relationMetadataList.length).toBeGreaterThan(0);

      const resolvedRelationTypes: unknown[] = [];
      const resolvedInverseSideProperties: unknown[] = [];

      for (const relationMetadata of relationMetadataList) {
        if (typeof relationMetadata.type === "function") {
          const relationType: unknown = relationMetadata.type;
          resolvedRelationTypes.push(relationType);
        }

        if (typeof relationMetadata.inverseSideProperty === "function") {
          const inverseSideProperty: unknown =
            relationMetadata.inverseSideProperty(createRelationProxy());
          resolvedInverseSideProperties.push(inverseSideProperty);
        }
      }

      expect(resolvedRelationTypes).not.toContain(undefined);
      expect(resolvedInverseSideProperties).not.toContain(undefined);
    });

    it("ensures all relation targets map to registered entities", () => {
      const relationMetadataList = getRelationMetadataForKnownEntities();

      const unmatchedRelationTargets: string[] = [];

      for (const relationMetadata of relationMetadataList) {
        if (isKnownEntityTargetForCallbacks(relationMetadata.target)) {
          continue;
        }

        unmatchedRelationTargets.push(relationMetadata.propertyName);
      }

      expect(unmatchedRelationTargets).toStrictEqual([]);
    });
  });

  class UndecoratedEntity {
    public readonly marker = "undecorated";
  }

  describe("entity-definition-assertions branches", () => {
    const authorEntityClass = getRegisteredEntityClass("Author");
    const textEntityClass = getRegisteredEntityClass("Text");
    const baseRelationMetadata = getEntityRelationMetadata(
      textEntityClass,
      "author",
    );

    it("should validate exact sets when values match", () => {
      expect(() => {
        assertExactSet(["b", "a", "a"], ["a", "b"], {
          label: "letters",
          toComparableString: (value) => value,
        });
      }).not.toThrow();
    });

    it("should fail exact set assertion when values differ", () => {
      expect(() => {
        assertExactSet(["a"], ["a", "b"], {
          label: "letters",
          toComparableString: (value) => value,
        });
      }).toThrow(/Set assertion failed for letters/);
    });

    it("should render <empty> for expected values in set failures", () => {
      expect(() => {
        assertExactSet(["a"], [], {
          label: "letters",
          toComparableString: (value) => value,
        });
      }).toThrow(/Expected: <empty>/);
    });

    it("should render <empty> for received values in set failures", () => {
      expect(() => {
        assertExactSet([], ["a"], {
          label: "letters",
          toComparableString: (value) => value,
        });
      }).toThrow(/Received: <empty>/);
    });

    it("should validate entity registry when classes match", () => {
      expect(() => {
        assertEntityRegistryMatches(
          [authorEntityClass, textEntityClass],
          [textEntityClass, authorEntityClass],
        );
      }).not.toThrow();
    });

    it("should fail entity registry when duplicates exist", () => {
      expect(() => {
        assertEntityRegistryMatches(
          [authorEntityClass, textEntityClass, authorEntityClass],
          [authorEntityClass, textEntityClass],
        );
      }).toThrow(/duplicate classes/);
    });

    it("should return relation metadata for a known relation", () => {
      const relationMetadata = getEntityRelationMetadata(
        textEntityClass,
        "author",
      );

      expect(relationMetadata.propertyName).toBe("author");
    });

    it("should fail relation metadata lookup for unknown relation", () => {
      expect(() => {
        getEntityRelationMetadata(textEntityClass, "missingRelation");
      }).toThrow(/Missing relation 'missingRelation'/);
    });

    it("should return table metadata for an entity", () => {
      const tableMetadata = getEntityTableMetadata(authorEntityClass);

      expect(tableMetadata.name).toBe("authors");
    });

    it("should fail table metadata lookup for an undecorated entity", () => {
      expect(() => {
        getEntityTableMetadata(UndecoratedEntity);
      }).toThrow(/Missing table metadata/);
    });

    it("should validate relation options with scalar values", () => {
      const relationMetadata = getEntityRelationMetadata(
        textEntityClass,
        "author",
      );

      expect(() => {
        assertRelationOptions(relationMetadata, {
          eager: true,
        });
      }).not.toThrow();
    });

    it("should validate relation options with cascade arrays", () => {
      const relationMetadata = {
        ...baseRelationMetadata,
        options: {
          ...baseRelationMetadata.options,
          cascade: ["insert", "update"],
        },
        propertyName: "testRelation",
      } satisfies Parameters<typeof assertRelationOptions>[0];

      expect(() => {
        assertRelationOptions(relationMetadata, {
          cascade: ["update", "insert"],
        });
      }).not.toThrow();
    });
  });
});
