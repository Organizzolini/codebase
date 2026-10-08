import DataLoader from "dataloader";

import {
  createConnection,
  createEdge,
  toCursor,
} from "../../lexico-api.utilities";

import {
  EMPTY_PARTITION_COUNTS,
  LOAD_CHUNK_SIZE,
} from "./literature.constants";
import {
  createEmptyConnection,
  readCount,
  readCursorId,
} from "./literature.utilities";

import type { Connection } from "../../lexico-api.types";
import type { PaginationArguments } from "../search/pagination-arguments.entities";
import type {
  ConnectionRequest,
  IdentifiedEntity,
  PageLimits,
  PartitionBounds,
  PartitionCounts,
  PartitionedConnectionQuery,
  PartitionedCursorPosition,
  SqlCondition,
} from "./literature.types";

/**
 * Batches relation connections into one DataLoader: every request for the
 * same page arguments made in the same tick is answered by a single call
 * paging all of their parents together, and each answer is cached for the
 * rest of the request.
 */
export function createConnectionLoader<Node>(
  page: (
    parentIds: string[],
    pagination: PaginationArguments,
  ) => Promise<ReadonlyMap<string, Connection<Node>>>,
): DataLoader<ConnectionRequest, Connection<Node>, string> {
  return new DataLoader<ConnectionRequest, Connection<Node>, string>(
    async (requests) => {
      const groups = new Map<
        string,
        {
          members: { parentId: string; position: number }[];
          pagination: PaginationArguments;
        }
      >();
      for (const [position, request] of requests.entries()) {
        const key = toPaginationKey(request.pagination);
        const group = groups.get(key) ?? {
          members: [],
          pagination: request.pagination,
        };
        group.members.push({ parentId: request.parentId, position });
        groups.set(key, group);
      }

      const answers: Connection<Node>[] = [];
      await Promise.all(
        [...groups.values()].map(async ({ members, pagination }) => {
          const pages = await page(
            members.map((member) => member.parentId),
            pagination,
          );
          for (const { parentId, position } of members) {
            answers[position] =
              pages.get(parentId) ?? createEmptyConnection<Node>();
          }
        }),
      );
      return answers;
    },
    { cacheKeyFn: toRequestKey, maxBatchSize: LOAD_CHUNK_SIZE },
  );
}

/**
 * Pages the children of many parents at once, each parent's page exactly as
 * `paginateQuery` would page that parent alone. A cursor bounds only the
 * parent whose child it names and is ignored by every other. However many
 * parents and children there are, it costs one statement resolving the
 * cursors when there are any, one counting every parent's children, and one
 * loading every parent's page, which a window function cuts per parent.
 */
export async function paginateQueryByParent<Entity extends IdentifiedEntity>(
  query: PartitionedConnectionQuery<Entity>,
  parentIds: readonly string[],
  pagination: PaginationArguments = {},
): Promise<Map<string, Connection<Entity>>> {
  const parents = [...new Set(parentIds)];
  const connections = new Map<string, Connection<Entity>>();
  if (parents.length === 0) {
    return connections;
  }

  const limits: PageLimits = {
    first: readCount(pagination.first),
    last: readCount(pagination.last),
  };
  const bounds = await findCursorPositions(query, parents, pagination);
  const [counts, rows] = await Promise.all([
    countPartitions(query, parents, bounds),
    loadPartitionPages(query, parents, { bounds, limits }),
  ]);

  const rowsByParent = new Map<string, Entity[]>();
  for (const row of rows) {
    const parentId = query.parentOf(row);
    if (parentId !== undefined) {
      rowsByParent.set(parentId, [...(rowsByParent.get(parentId) ?? []), row]);
    }
  }
  for (const parentId of parents) {
    connections.set(
      parentId,
      assembleConnection(rowsByParent.get(parentId) ?? [], {
        after: bounds.after?.parentId === parentId ? bounds.after : null,
        before: bounds.before?.parentId === parentId ? bounds.before : null,
        counts: counts.get(parentId) ?? EMPTY_PARTITION_COUNTS,
        limits,
      }),
    );
  }
  return connections;
}

/**
 * Builds one parent's connection from its page and counts, flagging the
 * neighboring pages the way `paginateQuery` does: a `before` cursor always
 * leaves a next page, and an `after` cursor leaves a previous one unless a
 * `before` cursor sits on the first child.
 */
function assembleConnection<Entity extends IdentifiedEntity>(
  nodes: readonly Entity[],
  page: PartitionBounds & {
    readonly counts: PartitionCounts;
    readonly limits: PageLimits;
  },
): Connection<Entity> {
  const { counts, limits } = page;
  const firstCut =
    limits.first === null
      ? counts.windowCount
      : Math.min(counts.windowCount, limits.first);
  const startsAfterFirstRow =
    page.after !== null && (page.before === null || counts.beforeCount > 0);

  return createConnection<Entity>({
    edges: nodes.map((node) => createEdge(node, toCursor({ id: node.id }))),
    hasNextPage:
      page.before !== null ||
      (limits.first !== null && counts.windowCount > limits.first),
    hasPreviousPage:
      (limits.last !== null && firstCut > limits.last) || startsAfterFirstRow,
    totalCount: counts.totalCount,
  });
}

/**
 * Counts each parent's children in one grouped statement: all of them, those
 * between the cursors, and those before the `before` cursor.
 */
async function countPartitions<Entity extends IdentifiedEntity>(
  query: PartitionedConnectionQuery<Entity>,
  parentIds: readonly string[],
  bounds: PartitionBounds,
): Promise<Map<string, PartitionCounts>> {
  const window = windowCondition(query, bounds);
  const beforeSql =
    bounds.before === null
      ? "FALSE"
      : `${query.parentKey} = :partitionBeforeParent AND ${toRowKey(query)} < (:partitionBeforeKey, :partitionBeforeId)`;
  const rows = await query.repository
    .createQueryBuilder(query.alias)
    .select(query.parentKey, "parentId")
    .addSelect("COUNT(*)", "totalCount")
    .addSelect(`COUNT(*) FILTER (WHERE ${window.sql})`, "windowCount")
    .addSelect(`COUNT(*) FILTER (WHERE ${beforeSql})`, "beforeCount")
    .where(`${query.parentKey} IN (:...partitionParentIds)`, {
      partitionParentIds: parentIds,
    })
    .setParameters(window.parameters)
    .groupBy(query.parentKey)
    .getRawMany<Record<"parentId" | keyof PartitionCounts, string>>();

  return new Map(
    rows.map((row) => [
      row.parentId,
      {
        beforeCount: Number(row.beforeCount),
        totalCount: Number(row.totalCount),
        windowCount: Number(row.windowCount),
      },
    ]),
  );
}

/**
 * Resolves the `after` and `before` cursors to the rows they name among the
 * parents' children, in one statement, or to null when a cursor is absent,
 * malformed, or names no such row.
 */
async function findCursorPositions<Entity extends IdentifiedEntity>(
  query: PartitionedConnectionQuery<Entity>,
  parentIds: readonly string[],
  pagination: PaginationArguments,
): Promise<PartitionBounds> {
  const afterId = readCursorId(pagination.after);
  const beforeId = readCursorId(pagination.before);
  const cursorIds = [afterId, beforeId].filter((id) => id !== null);
  if (cursorIds.length === 0) {
    return { after: null, before: null };
  }

  const rows = await query.repository
    .createQueryBuilder(query.alias)
    .select(`${query.alias}.id`, "id")
    .addSelect(query.sortKey, "key")
    .addSelect(query.parentKey, "parentId")
    .where(`${query.parentKey} IN (:...partitionParentIds)`, {
      partitionParentIds: parentIds,
    })
    .andWhere(`${query.alias}.id IN (:...partitionCursorIds)`, {
      partitionCursorIds: cursorIds,
    })
    .getRawMany<PartitionedCursorPosition>();
  const byId = new Map(rows.map((row) => [row.id, row]));

  return {
    after: afterId === null ? null : (byId.get(afterId) ?? null),
    before: beforeId === null ? null : (byId.get(beforeId) ?? null),
  };
}

/**
 * Loads every parent's page in one statement: a window function numbers each
 * parent's children between the cursors, and the page keeps the rows `first`
 * and then `last` leave, as `slicePage` cuts a single parent's window.
 */
async function loadPartitionPages<Entity extends IdentifiedEntity>(
  query: PartitionedConnectionQuery<Entity>,
  parentIds: readonly string[],
  page: { readonly bounds: PartitionBounds; readonly limits: PageLimits },
): Promise<Entity[]> {
  const window = windowCondition(query, page.bounds);
  const numbered = query.repository
    .createQueryBuilder(query.alias)
    .select(`${query.alias}.id`, "id")
    .addSelect(
      `ROW_NUMBER() OVER (PARTITION BY ${query.parentKey} ORDER BY ${query.sortKey}, ${query.alias}.id)`,
      "position",
    )
    .addSelect(`COUNT(*) OVER (PARTITION BY ${query.parentKey})`, "size")
    .where(`${query.parentKey} IN (:...partitionParentIds)`, {
      partitionParentIds: parentIds,
    })
    .andWhere(window.sql, window.parameters);
  const cut = pageCondition(page.limits);

  return query
    .load()
    .andWhere(
      `${query.alias}.id IN (SELECT "page"."id" FROM (${numbered.getQuery()}) "page" WHERE ${cut.sql})`,
    )
    .setParameters({ ...numbered.getParameters(), ...cut.parameters })
    .orderBy(query.sortKey, "ASC")
    .addOrderBy(`${query.alias}.id`, "ASC")
    .getMany();
}

/**
 * Keeps the numbered rows `first` leaves and then the last `last` of those,
 * reading an absent limit as no cut at all.
 */
function pageCondition(limits: PageLimits): SqlCondition {
  const conditions: string[] = [];
  if (limits.first !== null) {
    conditions.push(`"page"."position" <= :partitionFirst`);
  }
  if (limits.last !== null) {
    const kept =
      limits.first === null
        ? `"page"."size"`
        : `LEAST("page"."size", :partitionFirst)`;
    conditions.push(`"page"."position" > ${kept} - :partitionLast`);
  }

  return {
    parameters: { partitionFirst: limits.first, partitionLast: limits.last },
    sql: conditions.length === 0 ? "TRUE" : conditions.join(" AND "),
  };
}

/** Keys one page's arguments, so requests asking the same page share a batch. */
function toPaginationKey(pagination: PaginationArguments): string {
  return JSON.stringify([
    pagination.first ?? null,
    pagination.after ?? null,
    pagination.last ?? null,
    pagination.before ?? null,
  ]);
}

/** Keys one parent's page request, which the loader caches its answer under. */
function toRequestKey(request: ConnectionRequest): string {
  return `${request.parentId}:${toPaginationKey(request.pagination)}`;
}

/** The sort key and id tuple every partitioned page orders and bounds by. */
function toRowKey<Entity extends IdentifiedEntity>(
  query: PartitionedConnectionQuery<Entity>,
): string {
  return `(${query.sortKey}, ${query.alias}.id)`;
}

/**
 * Narrows each parent's children to those between the cursors. A cursor
 * bounds only its own parent's children, so every other parent passes it.
 */
function windowCondition<Entity extends IdentifiedEntity>(
  query: PartitionedConnectionQuery<Entity>,
  bounds: PartitionBounds,
): SqlCondition {
  const row = toRowKey(query);
  const conditions: string[] = [];
  const parameters: Record<string, unknown> = {};
  if (bounds.after !== null) {
    conditions.push(
      `(${query.parentKey} <> :partitionAfterParent OR ${row} > (:partitionAfterKey, :partitionAfterId))`,
    );
    Object.assign(parameters, {
      partitionAfterId: bounds.after.id,
      partitionAfterKey: bounds.after.key,
      partitionAfterParent: bounds.after.parentId,
    });
  }
  if (bounds.before !== null) {
    conditions.push(
      `(${query.parentKey} <> :partitionBeforeParent OR ${row} < (:partitionBeforeKey, :partitionBeforeId))`,
    );
    Object.assign(parameters, {
      partitionBeforeId: bounds.before.id,
      partitionBeforeKey: bounds.before.key,
      partitionBeforeParent: bounds.before.parentId,
    });
  }

  return {
    parameters,
    sql: conditions.length === 0 ? "TRUE" : conditions.join(" AND "),
  };
}
