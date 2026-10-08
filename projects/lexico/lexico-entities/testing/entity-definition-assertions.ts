import { getMetadataArgsStorage } from "typeorm";

/** Represents an entity class constructor used by the metadata assertions. */
export type EntityClass = abstract new (
  ...constructorArguments: never[]
) => object;

/** Describes a single TypeORM relation metadata entry. */
type EntityRelationMetadata = MetadataStorage["relations"][number];

/** Describes a single TypeORM table metadata entry. */
type EntityTableMetadata = MetadataStorage["tables"][number];

/** Describes TypeORM's global decorator metadata storage. */
type MetadataStorage = ReturnType<typeof getMetadataArgsStorage>;

/** Describes relation options after TypeORM has normalized them. */
type RelationOptions = NonNullable<EntityRelationMetadata["options"]>;

/** Describes the relation option subset used by the contract assertions. */
type RelationOptionSubset = Pick<
  RelationOptions,
  | "cascade"
  | "eager"
  | "nullable"
  | "onDelete"
  | "onUpdate"
  | "orphanedRowAction"
>;

const RELATION_OPTION_NAMES = [
  "cascade",
  "eager",
  "nullable",
  "onDelete",
  "onUpdate",
  "orphanedRowAction",
] as const satisfies readonly (keyof RelationOptionSubset)[];

/** Asserts that an entity exposes table metadata in TypeORM's storage. */
export function assertEntityHasTableMetadata(entityClass: EntityClass): void {
  void getEntityTableMetadata(entityClass);
}

/** Asserts that the expected entity registry contains the same classes without duplicates. */
export function assertEntityRegistryMatches(
  actualEntities: readonly EntityClass[],
  expectedEntities: readonly EntityClass[],
): void {
  assertExactSet(actualEntities, expectedEntities, {
    label: "entity registry class names",
    toComparableString: (entityClass) => entityClass.name,
  });

  const duplicateEntityNames = [
    ...new Set(
      actualEntities
        .map((entityClass) => entityClass.name)
        .filter(
          (entityName, entityIndex, entityNames) =>
            entityNames.indexOf(entityName) !== entityIndex,
        ),
    ),
  ].toSorted((firstEntityName, secondEntityName) =>
    firstEntityName.localeCompare(secondEntityName),
  );

  if (duplicateEntityNames.length > 0) {
    throw new Error(
      `Entity registry contains duplicate classes: ${duplicateEntityNames.join(", ")}`,
    );
  }
}

/** Asserts that two value sets resolve to the same comparable string members. */
export function assertExactSet<TValue>(
  actualValues: readonly TValue[],
  expectedValues: readonly TValue[],
  options: {
    readonly label: string;
    readonly toComparableString: (value: TValue) => string;
  },
): void {
  const actualComparableValues = toSortedUniqueStrings(
    actualValues.map((value) => options.toComparableString(value)),
  );
  const expectedComparableValues = toSortedUniqueStrings(
    expectedValues.map((value) => options.toComparableString(value)),
  );

  if (
    !areExactStringSetsEqual(actualComparableValues, expectedComparableValues)
  ) {
    throw new Error(
      [
        `Set assertion failed for ${options.label}.`,
        `Expected: ${expectedComparableValues.join(", ") || "<empty>"}`,
        `Received: ${actualComparableValues.join(", ") || "<empty>"}`,
      ].join("\n"),
    );
  }
}

/** Asserts that a relation exposes the expected normalized TypeORM options. */
export function assertRelationOptions(
  relationMetadata: EntityRelationMetadata,
  expectedOptions: Partial<RelationOptionSubset>,
): void {
  const actualOptions = relationMetadata.options;

  for (const optionName of RELATION_OPTION_NAMES) {
    if (!(optionName in expectedOptions)) {
      continue;
    }

    const expectedValue = expectedOptions[optionName];
    const actualValue = actualOptions[optionName];

    if (
      optionName === "cascade" &&
      (Array.isArray(expectedValue) || Array.isArray(actualValue))
    ) {
      const expectedCascadeValues = Array.isArray(expectedValue)
        ? expectedValue
        : expectedValue === true
          ? ["insert", "update", "remove", "soft-remove", "recover"]
          : [];
      const actualCascadeValues = Array.isArray(actualValue)
        ? actualValue
        : actualValue === true
          ? ["insert", "update", "remove", "soft-remove", "recover"]
          : [];

      if (
        !areExactStringSetsEqual(actualCascadeValues, expectedCascadeValues)
      ) {
        throw new Error(
          [
            `Relation option assertion failed for '${relationMetadata.propertyName}'.`,
            "Option: cascade",
            `Expected: ${expectedCascadeValues.join(", ") || "<empty>"}`,
            `Received: ${actualCascadeValues.join(", ") || "<empty>"}`,
          ].join("\n"),
        );
      }

      continue;
    }

    if (toStableString(actualValue) !== toStableString(expectedValue)) {
      throw new Error(
        [
          `Relation option assertion failed for '${relationMetadata.propertyName}'.`,
          `Option: ${optionName}`,
          `Expected: ${toStableString(expectedValue)}`,
          `Received: ${toStableString(actualValue)}`,
        ].join("\n"),
      );
    }
  }
}

/** Returns a single relation metadata entry by property name. */
export function getEntityRelationMetadata(
  entityClass: EntityClass,
  relationPropertyName: string,
): EntityRelationMetadata {
  const relationMetadata = getEntityRelations(entityClass).find(
    (relation) => relation.propertyName === relationPropertyName,
  );

  return assertRequiredMetadata(
    relationMetadata,
    `Missing relation '${relationPropertyName}' for entity ${getEntityName(entityClass)}.`,
  );
}

/** Returns the sorted relation metadata entries for the given entity. */
export function getEntityRelations(
  entityClass: EntityClass,
): readonly EntityRelationMetadata[] {
  return getStorage()
    .relations.filter((relation) =>
      isMatchingEntityTarget(relation.target, entityClass),
    )
    .toSorted((firstRelation, secondRelation) =>
      firstRelation.propertyName.localeCompare(secondRelation.propertyName),
    );
}

/** Returns the table metadata entry for the given entity class. */
export function getEntityTableMetadata(
  entityClass: EntityClass,
): EntityTableMetadata {
  const tableMetadata = getStorage().tables.find((table) =>
    isMatchingEntityTarget(table.target, entityClass),
  );

  return assertRequiredMetadata(
    tableMetadata,
    `Missing table metadata for entity ${getEntityName(entityClass)}.`,
  );
}

/** Returns true when both arrays contain the same strings after normalization. */
function areExactStringSetsEqual(
  actualValues: readonly string[],
  expectedValues: readonly string[],
): boolean {
  const actualSet = toSortedUniqueStrings(actualValues);
  const expectedSet = toSortedUniqueStrings(expectedValues);

  if (actualSet.length !== expectedSet.length) {
    return false;
  }

  return actualSet.every(
    (actualValue, index) => actualValue === expectedSet[index],
  );
}

/** Returns a required metadata value or throws with the provided failure message. */
function assertRequiredMetadata<T>(
  value: T | undefined,
  failureMessage: string,
): T {
  if (value === undefined) {
    throw new Error(failureMessage);
  }

  return value;
}

/** Returns an entity class name for use in assertion messages. */
function getEntityName(entityClass: EntityClass): string {
  return entityClass.name;
}

/** Returns the current TypeORM decorator metadata storage. */
function getStorage(): MetadataStorage {
  return getMetadataArgsStorage();
}

/** Returns true when a metadata target belongs to the requested entity class. */
function isMatchingEntityTarget(
  target: EntityTableMetadata["target"],
  entityClass: EntityClass,
): boolean {
  if (target === entityClass) {
    return true;
  }

  if (typeof target === "function") {
    return target.name === entityClass.name;
  }

  return false;
}

/** Returns true when the value is a plain record-like object. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Sorts and deduplicates a string array for stable metadata comparisons. */
function toSortedUniqueStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values)].toSorted((firstValue, secondValue) =>
    firstValue.localeCompare(secondValue),
  );
}

/** Converts supported assertion values into stable strings for readable diffs. */
function toStableString(value: unknown): string {
  if (Array.isArray(value)) {
    const arrayValue: readonly unknown[] = value;

    return `[${arrayValue.map((item) => toStableString(item)).join(",")}]`;
  }

  if (isRecord(value)) {
    const entries = Object.entries(value).toSorted(([firstKey], [secondKey]) =>
      firstKey.localeCompare(secondKey),
    );

    return `{${entries
      .map(
        ([entryKey, entryValue]) => `${entryKey}:${toStableString(entryValue)}`,
      )
      .join(",")}}`;
  }

  if (value === null) {
    return "null";
  }

  if (value === undefined) {
    return "undefined";
  }

  if (typeof value === "string") {
    return value;
  }

  if (
    typeof value === "bigint" ||
    typeof value === "boolean" ||
    typeof value === "number" ||
    typeof value === "symbol"
  ) {
    return String(value);
  }

  return "[unsupported]";
}
