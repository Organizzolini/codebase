import { describe, expect, it, vi } from "vitest";

import { Line } from "@codebase/lexico-entities";

import { createRepositoryMock } from "../../../testing/mocks";
import { toCursor } from "../../lexico-api.utilities";

import { LOAD_CHUNK_SIZE } from "./literature.constants";
import {
  createEmptyConnection,
  paginateQuery,
  slicePage,
} from "./literature.utilities";

import type { ConnectionQuery } from "./literature.types";

const FIRST_ID = "01a10ee5-dd0a-77b5-97b1-2c6e9baec33e";
const SECOND_ID = "01a10ee5-dd0a-77b5-97b1-2c6e9baec33f";
const THIRD_ID = "01a10ee5-dd0a-77b5-97b1-2c6e9baec340";

/** Builds a line query whose one shared builder reads these window ids. */
function createLineQuery(windowIds: string[]): {
  builder: ReturnType<
    ReturnType<typeof createRepositoryMock<Line>>["createQueryBuilder"]
  >;
  query: ConnectionQuery<Line>;
} {
  const repository = createRepositoryMock<Line>();
  const builder = repository.createQueryBuilder();
  const lines = windowIds.map((id) => Object.assign(new Line(), { id }));
  Object.defineProperty(builder, "alias", { value: "line" });
  vi.mocked(builder.getCount).mockResolvedValue(windowIds.length);
  vi.mocked(builder.getRawMany).mockResolvedValue(lines);

  return {
    builder,
    query: {
      filter: () => builder,
      load: vi
        .fn<ConnectionQuery<Line>["load"]>()
        .mockResolvedValue(lines.toReversed()),
      sortKey: "line.index",
    },
  };
}

describe("literature utilities", () => {
  describe(slicePage, () => {
    it("cuts to first before last and flags each cut", () => {
      expect(
        slicePage(["a", "b", "c", "d"], { first: 3, last: 2 }),
      ).toStrictEqual({
        hasNext: true,
        hasPrevious: true,
        ids: ["b", "c"],
      });
      expect(slicePage(["a", "b"], { first: 0, last: null })).toStrictEqual({
        hasNext: true,
        hasPrevious: false,
        ids: [],
      });
      expect(slicePage(["a", "b"], { first: null, last: null })).toStrictEqual({
        hasNext: false,
        hasPrevious: false,
        ids: ["a", "b"],
      });
    });
  });

  describe(createEmptyConnection, () => {
    it("holds no edges, no cursors, and no count", () => {
      expect(createEmptyConnection()).toMatchObject({
        edges: [],
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
        totalCount: 0,
      });
    });
  });

  describe(paginateQuery, () => {
    it("loads an unlimited page in chunks and drops rows that vanished before loading", async () => {
      expect.hasAssertions();

      const ids = Array.from(
        { length: LOAD_CHUNK_SIZE + 1 },
        (_, index) =>
          `01a10ee5-dd0a-77b5-97b1-${index.toString(16).padStart(12, "0")}`,
      );
      const { builder, query } = createLineQuery(ids);
      vi.mocked(query.load).mockResolvedValue(
        ids.slice(1).map((id) => Object.assign(new Line(), { id })),
      );
      const connection = await paginateQuery(query);

      expect(query.load).toHaveBeenCalledTimes(2);
      expect(
        vi.mocked(query.load).mock.calls.map(([chunk]) => chunk.length),
      ).toStrictEqual([LOAD_CHUNK_SIZE, 1]);
      expect(connection.edges.map((edge) => edge.node.id)).toStrictEqual(
        ids.slice(1),
      );
      expect(connection.totalCount).toBe(LOAD_CHUNK_SIZE + 1);
      expect(builder.limit).not.toHaveBeenCalled();
    });

    it("reads one row past the first page in ascending order and keeps the page order", async () => {
      expect.hasAssertions();

      const { builder, query } = createLineQuery([
        FIRST_ID,
        SECOND_ID,
        THIRD_ID,
      ]);
      const connection = await paginateQuery(query, { first: 2 });

      expect(connection.edges.map((edge) => edge.node.id)).toStrictEqual([
        FIRST_ID,
        SECOND_ID,
      ]);
      expect(connection.edges[0]?.cursor).toBe(toCursor({ id: FIRST_ID }));
      expect(connection.pageInfo).toMatchObject({
        hasNextPage: true,
        hasPreviousPage: false,
      });
      expect(connection.totalCount).toBe(3);
      expect(builder.orderBy).toHaveBeenCalledWith("line.index", "ASC");
      expect(builder.addOrderBy).toHaveBeenCalledWith("line.id", "ASC");
      expect(builder.limit).toHaveBeenCalledWith(3);
    });

    it("reads the last page from the back and reverses it into order", async () => {
      expect.hasAssertions();

      const { builder, query } = createLineQuery([
        THIRD_ID,
        SECOND_ID,
        FIRST_ID,
      ]);
      const connection = await paginateQuery(query, { last: 2 });

      expect(connection.edges.map((edge) => edge.node.id)).toStrictEqual([
        SECOND_ID,
        THIRD_ID,
      ]);
      expect(connection.pageInfo.hasPreviousPage).toBe(true);
      expect(builder.orderBy).toHaveBeenCalledWith("line.index", "DESC");
      expect(builder.limit).toHaveBeenCalledWith(3);
    });

    it("ignores malformed, foreign, and negative arguments without querying a cursor", async () => {
      expect.hasAssertions();

      const { builder, query } = createLineQuery([FIRST_ID]);
      const connection = await paginateQuery(query, {
        after: "not-a-cursor",
        before: toCursor({ id: "not-a-uuid" }),
        first: -1,
        last: -1,
      });

      expect(connection.edges).toHaveLength(1);
      expect(connection.pageInfo).toMatchObject({
        hasNextPage: false,
        hasPreviousPage: false,
      });
      expect(builder.getRawOne).not.toHaveBeenCalled();
      expect(builder.limit).not.toHaveBeenCalled();
    });

    it("bounds the window by both cursors and checks for rows before the earlier one", async () => {
      expect.hasAssertions();

      const { builder, query } = createLineQuery([]);
      vi.mocked(builder.getRawOne)
        .mockResolvedValueOnce(Object.assign(new Line(), { key: "4" }))
        .mockResolvedValueOnce(Object.assign(new Line(), { key: "2" }))
        .mockResolvedValueOnce(undefined);
      const connection = await paginateQuery(query, {
        after: toCursor({ id: THIRD_ID }),
        before: toCursor({ id: FIRST_ID }),
      });

      expect(connection.edges).toStrictEqual([]);
      expect(connection.pageInfo).toMatchObject({
        hasNextPage: true,
        hasPreviousPage: false,
      });
      expect(builder.andWhere).toHaveBeenCalledWith(
        "(line.index, line.id) > (:paginationAfterKey, :paginationAfterId)",
        { paginationAfterId: THIRD_ID, paginationAfterKey: "4" },
      );
      expect(builder.andWhere).toHaveBeenCalledWith(
        "(line.index, line.id) < (:paginationBeforeKey, :paginationBeforeId)",
        { paginationBeforeId: FIRST_ID, paginationBeforeKey: "2" },
      );
    });
  });
});
