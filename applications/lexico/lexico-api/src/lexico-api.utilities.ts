import { Field, Int, ObjectType } from "@nestjs/graphql";

import { PageInfo } from "./lexico-api.entities";

import type { DeletableType } from "./deletable.entities";
import type {
  ClassConstructor,
  Connection,
  Edge,
  GraphQLFields,
  PaginationBoundsParameters,
} from "./lexico-api.types";
import type { DeletableEntity } from "@codebase/database";

/**
 * Creates a Relay Connection containing edges, page info, and total count.
 */
export function createConnection<T>(parameters: {
  edges: Edge<T>[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  totalCount: number;
}): Connection<T> {
  const pageInfo = new PageInfo();
  pageInfo.hasNextPage = parameters.hasNextPage;
  pageInfo.hasPreviousPage = parameters.hasPreviousPage;
  pageInfo.startCursor =
    parameters.edges.length > 0 ? parameters.edges[0]?.cursor : undefined;
  pageInfo.endCursor =
    parameters.edges.length > 0 ? parameters.edges.at(-1)?.cursor : undefined;

  return {
    edges: parameters.edges,
    pageInfo,
    totalCount: parameters.totalCount,
  };
}

/**
 * Creates a Relay Edge from a node and an encoded cursor string.
 */
export function createEdge<T>(node: T, cursor: string): Edge<T> {
  return { cursor, node };
}

/**
 * Mixin type factory producing a Relay Edge ObjectType for GraphQL schema generation,
 * named after the node's GraphQL type name.
 */
export function createEdgeType<T>(
  classReference: ClassConstructor<T>,
  name: string = classReference.name,
): ClassConstructor<Edge<T>> {
  const EdgeType = class implements Edge<T> {
    public cursor!: string;
    public node!: T;
  };

  const prototype: Edge<T> = new EdgeType();

  Field(() => String, { description: "A cursor for use in pagination." })(
    prototype,
    "cursor",
  );
  Field(() => classReference, {
    description: "The item at the end of the edge.",
  })(prototype, "node");
  ObjectType(`${name}Edge`)(EdgeType);

  return EdgeType;
}

/**
 * Decodes an offset-based cursor, returning the specified default offset if missing or invalid.
 */
export function decodeOffsetCursor(
  cursor?: null | string,
  defaultOffset = 0,
): number {
  if (cursor === undefined || cursor === null || cursor.length === 0) {
    return defaultOffset;
  }
  const decoded = fromCursorSafe<{ offset?: number }>(cursor);
  if (
    decoded !== null &&
    typeof decoded.offset === "number" &&
    decoded.offset >= 0
  ) {
    return decoded.offset;
  }
  return defaultOffset;
}

/**
 * Encodes an offset-based integer cursor.
 */
export function encodeOffsetCursor(offset: number): string {
  return toCursor({ offset: Math.max(0, offset) });
}

/**
 * Decodes an opaque Base64 cursor string into structured data.
 */
export function fromCursor<T = unknown>(
  cursor: string,
  parse?: (value: unknown) => T,
): T {
  const jsonString = Buffer.from(cursor, "base64url").toString("utf8");
  if (parse !== undefined) {
    return parse(JSON.parse(jsonString));
  }
  return JSON.parse(jsonString) as T;
}

/**
 * Safely decodes a cursor string, returning null if invalid, null, or undefined.
 */
export function fromCursorSafe<T = unknown>(
  cursor?: null | string,
  parse?: (value: unknown) => T,
): null | T {
  if (cursor === undefined || cursor === null || cursor.length === 0) {
    return null;
  }
  try {
    return fromCursor<T>(cursor, parse);
  } catch {
    return null;
  }
}

/**
 * Maps each node of a connection, keeping its cursors and page information.
 */
export function mapConnection<Node, Mapped>(
  connection: Connection<Node>,
  map: (node: Node) => Mapped,
): Connection<Mapped> {
  return {
    edges: connection.edges.map((edge) =>
      createEdge(map(edge.node), edge.cursor),
    ),
    pageInfo: connection.pageInfo,
    totalCount: connection.totalCount,
  };
}

/**
 * Maps a nullable to-one relation to its GraphQL type, keeping `null`, and
 * leaving one its query did not join unset, as {@link mapRelation} does.
 */
export function mapNullableRelation<Entity extends object, Mapped>(
  relation: Entity | null | undefined,
  map: (relation: Entity) => Mapped,
): Mapped | null | undefined {
  return relation === null ? null : mapRelation(relation, map);
}

/**
 * Maps a nullable to-many relation to its GraphQL types, keeping `null`, and
 * leaving one its query did not join unset, as {@link mapRelations} does.
 */
export function mapNullableRelations<Entity extends object, Mapped>(
  relations: null | readonly Entity[] | undefined,
  map: (relation: Entity) => Mapped,
): Mapped[] | null | undefined {
  return relations === null ? null : mapRelations(relations, map);
}

/**
 * Maps a to-one relation to its GraphQL type. An entity declares a relation
 * as always present, but one its query did not join is left `undefined`; it
 * stays unset here rather than failing the mapping, so a response reports it
 * exactly as it did when resolvers returned entities.
 */
export function mapRelation<Entity extends object, Mapped>(
  relation: Entity | undefined,
  map: (relation: Entity) => Mapped,
): Mapped | undefined {
  return relation === undefined ? undefined : map(relation);
}

/**
 * Maps each row of a to-many relation to its GraphQL type, leaving one its
 * query did not join unset, as {@link mapRelation} does for a to-one relation.
 */
export function mapRelations<Entity extends object, Mapped>(
  relations: readonly Entity[] | undefined,
  map: (relation: Entity) => Mapped,
): Mapped[] | undefined {
  return relations?.map((relation) => map(relation));
}

/**
 * Slices an array of items according to forward (first, after) and backward (last, before) Relay pagination parameters.
 */
export function paginateArray<T>(
  items: T[],
  parameters: {
    after?: null | string | undefined;
    before?: null | string | undefined;
    first?: null | number | undefined;
    getCursor: (item: T) => string;
    last?: null | number | undefined;
  },
): {
  edges: Edge<T>[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
} {
  const { endIndex, startIndex } = getPaginationBounds(items, parameters);
  const sliced = items.slice(startIndex, endIndex);
  const { hasNext, hasPrevious, result } = sliceWithLimits(sliced, parameters);

  return {
    edges: result.map((item) => createEdge(item, parameters.getCursor(item))),
    hasNextPage: endIndex < items.length || hasNext,
    hasPreviousPage: startIndex > 0 || hasPrevious,
  };
}

/**
 * Mixin type factory producing a Relay Connection ObjectType for GraphQL schema generation,
 * named after the node's GraphQL type name, which defaults to its class name.
 */
export function Paginated<T>(
  classReference: ClassConstructor<T>,
  name: string = classReference.name,
): ClassConstructor<Connection<T>> {
  const EdgeType = createEdgeType(classReference, name);

  /**
   * Relay Connection GraphQL object type.
   */
  @ObjectType(`${name}Connection`)
  abstract class ConnectionType implements Connection<T> {
    @Field(() => [EdgeType], { description: "A list of edges." })
    public edges!: Edge<T>[];

    @Field(() => PageInfo, { description: "Information to aid in pagination." })
    public pageInfo!: PageInfo;

    @Field(() => Int, {
      description: "Identifies the total count of items in the connection.",
    })
    public totalCount!: number;
  }

  return ConnectionType;
}

/**
 * Encodes structured data into an opaque Base64 cursor string.
 */
export function toCursor(data: unknown): string {
  return Buffer.from(JSON.stringify(data), "utf8").toString("base64url");
}

/**
 * Copies the shared base columns every soft-deletable entity exposes.
 */
export function toDeletableFields(
  entity: DeletableEntity,
): GraphQLFields<DeletableType> {
  return {
    createdAt: entity.createdAt,
    createdBy: entity.createdBy,
    deletedAt: entity.deletedAt,
    deletedBy: entity.deletedBy,
    id: entity.id,
    updatedAt: entity.updatedAt,
    updatedBy: entity.updatedBy,
  };
}

/**
 * Computes start and end slice indices based on after and before cursors.
 */
function getPaginationBounds<T>(
  items: T[],
  parameters: PaginationBoundsParameters<T>,
): { endIndex: number; startIndex: number } {
  let startIndex = 0;
  let endIndex = items.length;

  if (parameters.after) {
    const afterIndex = items.findIndex(
      (item) => parameters.getCursor(item) === parameters.after,
    );
    if (afterIndex !== -1) {
      startIndex = afterIndex + 1;
    }
  }

  if (parameters.before) {
    const beforeIndex = items.findIndex(
      (item) => parameters.getCursor(item) === parameters.before,
    );
    if (beforeIndex !== -1) {
      endIndex = beforeIndex;
    }
  }

  return { endIndex, startIndex: Math.min(startIndex, endIndex) };
}

/**
 * Slices a sub-array based on first and last count limits.
 */
function sliceWithLimits<T>(
  items: T[],
  limits: {
    first?: null | number | undefined;
    last?: null | number | undefined;
  },
): { hasNext: boolean; hasPrevious: boolean; result: T[] } {
  let result = items;
  let hasNext = false;
  let hasPrevious = false;

  if (
    typeof limits.first === "number" &&
    limits.first >= 0 &&
    result.length > limits.first
  ) {
    result = result.slice(0, limits.first);
    hasNext = true;
  }

  if (
    typeof limits.last === "number" &&
    limits.last >= 0 &&
    result.length > limits.last
  ) {
    result = result.slice(result.length - limits.last);
    hasPrevious = true;
  }

  return { hasNext, hasPrevious, result };
}
