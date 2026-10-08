import type { PageInfo } from "./lexico-api.entities";

/**
 * Constructor type for class references.
 */
export type ClassConstructor<T> = abstract new (...arguments_: never[]) => T;

/**
 * Generic Relay Connection interface.
 */
export interface Connection<T> {
  edges: Edge<T>[];
  pageInfo: PageInfo;
  totalCount: number;
}

/**
 * Generic Relay Edge interface.
 */
export interface Edge<T> {
  cursor: string;
  node: T;
}

/**
 * A type's data properties, without its methods — the active-record methods
 * an entity inherits from TypeORM's `BaseEntity` are not fields.
 */
export type GraphQLFields<Type> = {
  [
    Key in keyof Type as Type[Key] extends (...arguments_: never[]) => unknown
      ? never
      : Key
  ]: Type[Key];
};

/**
 * The shape a GraphQL object type implements for its TypeORM entity: every
 * entity field, typed as the entity types it, except those excluded by name —
 * `DatabaseOnlyField`, the columns only the database needs, and
 * `ResolvedField`, the relations a resolver exposes instead of the object.
 * Each relation in `RelationField` is retyped as the GraphQL type the class
 * declares for it, which must keep the entity relation's cardinality and
 * nullability; the check compares that shape, not the target class. An
 * optional entity field may also be `undefined`, as an unset row reads it.
 *
 * `Self` is the implementing class, which is how the shape also requires the
 * class to declare every exposed field and nothing else; see
 * {@link GraphQLObjectViolations}.
 */
export type GraphQLObjectOf<
  Entity,
  Self,
  DatabaseOnlyField extends EntityField<Entity>,
  RelationField extends RelationKey<Entity, DatabaseOnlyField | ResolvedField> =
    never,
  ResolvedField extends RelationKey<Entity, DatabaseOnlyField> = never,
> = ([
  GraphQLObjectViolations<
    Entity,
    Self,
    DatabaseOnlyField | ResolvedField,
    RelationField
  >,
] extends [never]
  ? unknown
  : GraphQLObjectViolations<
      Entity,
      Self,
      DatabaseOnlyField | ResolvedField,
      RelationField
    >) &
  Omit<
    LoadedFields<Entity>,
    DatabaseOnlyField | RelationField | ResolvedField
  > &
  Relations<Self, RelationField>;

/**
 * Why a GraphQL object type does not match its entity, or `never` when it
 * does. An entity field neither declared nor excluded is a `missingFields`
 * entry, so a new column or a dropped exclusion is a decision to make rather
 * than a field silently left out. A declared field the entity lacks is an
 * `extraFields` entry. A field narrower than its column, such as non-null
 * over a nullable one, is a `retypedFields` entry; one wider fails the
 * `implements` itself. A relation whose cardinality or nullability differs
 * from the entity's is a `mismatchedRelations` entry.
 */
export type GraphQLObjectViolations<
  Entity,
  Self,
  ExcludedField extends EntityField<Entity>,
  RelationField extends RelationKey<Entity, ExcludedField> = never,
> =
  | Violation<
      "extraFields",
      Exclude<keyof GraphQLFields<Self>, ExposedField<Entity, ExcludedField>>
    >
  | Violation<
      "mismatchedRelations",
      MismatchedRelation<LoadedFields<Entity>, Relations<Self, RelationField>>
    >
  | Violation<
      "missingFields",
      Exclude<ExposedField<Entity, ExcludedField>, keyof GraphQLFields<Self>>
    >
  | Violation<
      "retypedFields",
      NarrowedField<
        Omit<LoadedFields<Entity>, ExcludedField | RelationField>,
        GraphQLFields<Self>
      >
    >;

/**
 * What a mapper builds for a GraphQL class: every field it declares, with
 * each relation in `RelationField` also left `undefined` when the entity's
 * query did not join it.
 */
export type MappedFields<Type, RelationField extends keyof Type = never> = {
  [Key in keyof GraphQLFields<Type>]: Key extends RelationField
    ? GraphQLFields<Type>[Key] | undefined
    : GraphQLFields<Type>[Key];
};

/**
 * A relation's type in place of an entity in a GraphQL class property. It
 * keeps decorator metadata from naming the related class, which the
 * circular imports between related types would otherwise reach before it is
 * defined, the way TypeORM's `Relation` does for entities.
 */
export type Related<Type> = Type;

/**
 * The exposed fields of an entity that hold related rows — another entity, or
 * a list of them — rather than a column's value, which a `Date` is.
 */
export type RelationKey<Entity, ExcludedField> = {
  [Key in ExposedField<Entity, ExcludedField>]-?: IsRelation<
    NonNullable<GraphQLFields<Entity>[Key]>
  > extends true
    ? Key
    : never;
}[ExposedField<Entity, ExcludedField>];

/** The data property names of an entity. */
type EntityField<Entity> = keyof GraphQLFields<Entity>;

/** The entity fields a GraphQL type exposes. */
type ExposedField<Entity, DatabaseOnlyField> = Exclude<
  EntityField<Entity>,
  DatabaseOnlyField
>;

/** Whether a field's value is related rows rather than a column's value. */
type IsRelation<Value> = [Value] extends [Date]
  ? false
  : [Value] extends [readonly (infer Row)[]]
    ? [Row] extends [object]
      ? true
      : false
    : [Value] extends [object]
      ? true
      : false;

/**
 * An entity's fields, each optional one also accepting `undefined`, since a
 * row that leaves it unset reads it as `undefined` and a mapper copies that.
 */
type LoadedFields<Entity> = {
  [Key in keyof GraphQLFields<Entity>]: object extends Pick<
    GraphQLFields<Entity>,
    Key
  >
    ? GraphQLFields<Entity>[Key] | undefined
    : GraphQLFields<Entity>[Key];
};

/** Each relation whose shape differs from the entity's own, by name. */
type MismatchedRelation<Fields, Declared> = {
  [Key in keyof Declared]-?: Key extends keyof Fields
    ? [RelationShape<Fields[Key]>] extends [RelationShape<Declared[Key]>]
      ? [RelationShape<Declared[Key]>] extends [RelationShape<Fields[Key]>]
        ? never
        : Key
      : Key
    : Key;
}[keyof Declared];

/** Each field whose column holds a value its GraphQL type does not, by name. */
type NarrowedField<Fields, SelfFields> = {
  [Key in keyof Fields & keyof SelfFields]-?: [Fields[Key]] extends [
    SelfFields[Key],
  ]
    ? never
    : Key;
}[keyof Fields & keyof SelfFields];

/** The relations a GraphQL class declares, as it types them. */
type Relations<Self, RelationField> = Pick<
  GraphQLFields<Self>,
  keyof GraphQLFields<Self> & RelationField
>;

/** Whether a relation holds many rows, may be null, and may be unset. */
type RelationShape<Relation> = [
  [NonNullable<Relation>] extends [readonly unknown[]] ? "many" : "one",
  null extends Relation ? "nullable" : "non-null",
  undefined extends Relation ? "optional" : "required",
];

/** A violation named `Kind`, listing `Fields`, or nothing when it is empty. */
type Violation<Kind extends string, Fields> = [Fields] extends [never]
  ? never
  : Record<Kind, Fields>;
