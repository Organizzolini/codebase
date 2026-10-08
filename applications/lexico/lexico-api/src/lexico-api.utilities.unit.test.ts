import {
  Field,
  GraphQLSchemaBuilderModule,
  GraphQLSchemaFactory,
  ObjectType,
  Query,
  Resolver,
} from "@nestjs/graphql";
import { Test } from "@nestjs/testing";
import { describe, expect, it } from "vitest";

import { paginateArray } from "../testing/pagination";

import { PageInfo } from "./lexico-api.entities";
import {
  createConnection,
  createEdge,
  decodeOffsetCursor,
  encodeOffsetCursor,
  fromCursor,
  fromCursorSafe,
  mapConnection,
  mapNullableRelation,
  mapNullableRelations,
  mapRelation,
  mapRelations,
  Paginated,
  toCursor,
  toDeletableFields,
} from "./lexico-api.utilities";

import type { Connection } from "./lexico-api.types";

@ObjectType()
class TestItem {
  @Field()
  public id!: string;

  @Field()
  public name!: string;
}

const TestItemConnection = Paginated(TestItem);

const RenamedItemConnection = Paginated(TestItem, "RenamedItem");

@Resolver()
class RenamedItemResolver {
  @Query(() => RenamedItemConnection)
  public renamedItems(): InstanceType<typeof RenamedItemConnection> {
    return createConnection<TestItem>({
      edges: [],
      hasNextPage: false,
      hasPreviousPage: false,
      totalCount: 0,
    });
  }
}

@Resolver()
class TestRelayResolver {
  @Query(() => TestItemConnection)
  public testItems(): InstanceType<typeof TestItemConnection> {
    const pageInfo = new PageInfo();
    pageInfo.hasNextPage = false;
    pageInfo.hasPreviousPage = false;
    pageInfo.startCursor = "start";
    pageInfo.endCursor = "end";

    return {
      edges: [{ cursor: "cursor-1", node: { id: "1", name: "item" } }],
      pageInfo,
      totalCount: 1,
    };
  }
}

describe("relay pagination helpers suite", () => {
  describe("cursor encoding and decoding", () => {
    it("encodes and decodes an object payload", () => {
      expect.hasAssertions();

      const payload = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        score: 0.95,
      };
      const cursor = toCursor(payload);

      expect(typeof cursor).toBe("string");
      expect(fromCursor<{ id: string; score: number }>(cursor)).toStrictEqual(
        payload,
      );
    });

    it("encodes and decodes primitive values", () => {
      expect.hasAssertions();

      const numberValue = 42;
      const cursor = toCursor(numberValue);

      expect(fromCursor<number>(cursor)).toBe(numberValue);
    });

    it("encodes and decodes strings", () => {
      expect.hasAssertions();

      const text = "sample:cursor:123";
      const cursor = toCursor(text);

      expect(fromCursor<string>(cursor)).toBe(text);
    });

    it("transforms decoded payload when parser function is provided", () => {
      expect.hasAssertions();

      const cursor = toCursor({ count: 5 });
      const result = fromCursor(cursor, (value) => {
        const object_ = value as { count: number };
        return object_.count * 2;
      });

      expect(result).toBe(10);
    });
  });

  describe("paginated mixin factory", () => {
    it("generates a connection class for a given object type", () => {
      expect.hasAssertions();
      expect(TestItemConnection).toBeDefined();
      expect(typeof TestItemConnection).toBe("function");

      const ConnectionClass =
        TestItemConnection as unknown as new () => Connection<TestItem>;
      const connection: Connection<TestItem> = new ConnectionClass();
      const pageInfo = new PageInfo();
      pageInfo.hasNextPage = false;
      pageInfo.hasPreviousPage = false;
      connection.edges = [];
      connection.pageInfo = pageInfo;
      connection.totalCount = 0;

      expect(connection.totalCount).toBe(0);
      expect(connection.edges).toHaveLength(0);
    });

    it("generates GraphQL schema with relay connection and page info types", async () => {
      expect.hasAssertions();

      const module = await Test.createTestingModule({
        imports: [GraphQLSchemaBuilderModule],
        providers: [TestRelayResolver],
      }).compile();

      const schemaFactory = module.get(GraphQLSchemaFactory);
      const schema = await schemaFactory.create([TestRelayResolver]);

      expect(schema).toBeDefined();
      expect(schema.getType("TestItemConnection")).toBeDefined();
      expect(schema.getType("TestItemEdge")).toBeDefined();
      expect(schema.getType("PageInfo")).toBeDefined();
      expect(schema.getQueryType()?.getFields()["testItems"]).toBeDefined();
    });
  });

  describe("page info model", () => {
    it("can be instantiated and holds pagination fields", () => {
      expect.hasAssertions();

      const pageInfo = new PageInfo();
      pageInfo.hasNextPage = true;
      pageInfo.hasPreviousPage = false;
      pageInfo.startCursor = "start-123";
      pageInfo.endCursor = "end-456";

      expect(pageInfo.hasNextPage).toBe(true);
      expect(pageInfo.hasPreviousPage).toBe(false);
      expect(pageInfo.startCursor).toBe("start-123");
      expect(pageInfo.endCursor).toBe("end-456");
    });
  });

  describe("safe cursor decoding", () => {
    it("returns null for undefined, null, or empty string", () => {
      expect.hasAssertions();
      expect(fromCursorSafe(undefined)).toBeNull();
      expect(fromCursorSafe(null)).toBeNull();
      expect(fromCursorSafe("")).toBeNull();
    });

    it("returns null for invalid cursor format or malformed json", () => {
      expect.hasAssertions();

      const invalidJsonCursor = Buffer.from("plain text", "utf8").toString(
        "base64url",
      );

      expect(fromCursorSafe("invalid-base64-%%%")).toBeNull();
      expect(fromCursorSafe(invalidJsonCursor)).toBeNull();
    });

    it("decodes valid cursor", () => {
      expect.hasAssertions();

      const payload = { test: true };
      const cursor = toCursor(payload);

      expect(fromCursorSafe<{ test: boolean }>(cursor)).toStrictEqual(payload);

      const parsedResult = fromCursorSafe(cursor, (value) => {
        const object_ = value as { test: boolean };
        return object_.test ? "ok" : "fail";
      });

      expect(parsedResult).toBe("ok");
    });
  });

  describe("relay factory helpers", () => {
    it("creates an edge with node and cursor and creates edge instances directly", () => {
      expect.hasAssertions();

      const edge = createEdge({ id: "1" }, "cursor-1");

      expect(edge).toStrictEqual({ cursor: "cursor-1", node: { id: "1" } });

      const EdgeClass = TestItemConnection as unknown as {
        prototype: { edges: unknown[] };
      };

      expect(EdgeClass).toBeDefined();
    });

    it("creates a connection with populated edges and cursor range", () => {
      expect.hasAssertions();

      const edge1 = createEdge({ id: "1" }, "cursor-1");
      const edge2 = createEdge({ id: "2" }, "cursor-2");
      const connection = createConnection({
        edges: [edge1, edge2],
        hasNextPage: true,
        hasPreviousPage: false,
        totalCount: 2,
      });

      expect(connection.edges).toHaveLength(2);
      expect(connection.pageInfo.hasNextPage).toBe(true);
      expect(connection.pageInfo.hasPreviousPage).toBe(false);
      expect(connection.pageInfo.startCursor).toBe("cursor-1");
      expect(connection.pageInfo.endCursor).toBe("cursor-2");
      expect(connection.totalCount).toBe(2);
    });

    it("creates a connection with empty edges and undefined cursors", () => {
      expect.hasAssertions();

      const connection = createConnection({
        edges: [],
        hasNextPage: false,
        hasPreviousPage: false,
        totalCount: 0,
      });

      expect(connection.edges).toHaveLength(0);
      expect(connection.pageInfo.startCursor).toBeUndefined();
      expect(connection.pageInfo.endCursor).toBeUndefined();
      expect(connection.totalCount).toBe(0);
    });
  });

  describe("offset cursor helpers", () => {
    it("encodes and decodes offset cursors", () => {
      expect.hasAssertions();

      const cursor = encodeOffsetCursor(25);

      expect(decodeOffsetCursor(cursor)).toBe(25);
    });

    it("clamps negative offsets to zero on encode", () => {
      expect.hasAssertions();

      const cursor = encodeOffsetCursor(-10);

      expect(decodeOffsetCursor(cursor)).toBe(0);
    });

    it("returns default offset when cursor is missing or empty", () => {
      expect.hasAssertions();
      expect(decodeOffsetCursor(undefined, 10)).toBe(10);
      expect(decodeOffsetCursor(null, 15)).toBe(15);
      expect(decodeOffsetCursor("", 20)).toBe(20);
      expect(decodeOffsetCursor()).toBe(0);
    });

    it("returns default offset when cursor does not contain valid offset number", () => {
      expect.hasAssertions();

      const invalidPayloadCursor = toCursor({ wrong: "field" });
      const negativeOffsetCursor = toCursor({ offset: -5 });
      const invalidJsonCursor = Buffer.from("plain text", "utf8").toString(
        "base64url",
      );

      expect(decodeOffsetCursor(invalidPayloadCursor, 5)).toBe(5);
      expect(decodeOffsetCursor(negativeOffsetCursor, 5)).toBe(5);
      expect(decodeOffsetCursor(invalidJsonCursor, 5)).toBe(5);
    });
  });

  describe("array pagination, the oracle SQL paging agrees with", () => {
    const items = [
      { id: "1", name: "one" },
      { id: "2", name: "two" },
      { id: "3", name: "three" },
      { id: "4", name: "four" },
    ];
    const getCursor = (item: { id: string }): string => `cursor-${item.id}`;

    it("paginates from the beginning with first limit", () => {
      expect.hasAssertions();

      const result = paginateArray(items, {
        first: 2,
        getCursor,
      });

      expect(result.edges).toHaveLength(2);
      expect(result.edges[0]?.node).toStrictEqual({ id: "1", name: "one" });
      expect(result.edges[1]?.node).toStrictEqual({ id: "2", name: "two" });
      expect(result.hasNextPage).toBe(true);
      expect(result.hasPreviousPage).toBe(false);
    });

    it("paginates after a cursor", () => {
      expect.hasAssertions();

      const result = paginateArray(items, {
        after: "cursor-2",
        first: 2,
        getCursor,
      });

      expect(result.edges).toHaveLength(2);
      expect(result.edges[0]?.node).toStrictEqual({ id: "3", name: "three" });
      expect(result.edges[1]?.node).toStrictEqual({ id: "4", name: "four" });
      expect(result.hasNextPage).toBe(false);
      expect(result.hasPreviousPage).toBe(true);
    });

    it("handles after cursor not found in list", () => {
      expect.hasAssertions();

      const result = paginateArray(items, {
        after: "cursor-missing",
        first: 2,
        getCursor,
      });

      expect(result.edges).toHaveLength(2);
      expect(result.edges[0]?.node).toStrictEqual({ id: "1", name: "one" });
      expect(result.hasNextPage).toBe(true);
      expect(result.hasPreviousPage).toBe(false);
    });

    it("returns all items when first is not specified", () => {
      expect.hasAssertions();

      const result = paginateArray(items, {
        getCursor,
      });

      expect(result.edges).toHaveLength(4);
      expect(result.hasNextPage).toBe(false);
      expect(result.hasPreviousPage).toBe(false);
    });

    it("paginates backwards with last and before parameters", () => {
      expect.hasAssertions();

      const result = paginateArray(items, {
        before: "cursor-4",
        getCursor,
        last: 2,
      });

      expect(result.edges).toHaveLength(2);
      expect(result.edges[0]?.node).toStrictEqual({ id: "2", name: "two" });
      expect(result.edges[1]?.node).toStrictEqual({ id: "3", name: "three" });
      expect(result.hasNextPage).toBe(true);
      expect(result.hasPreviousPage).toBe(true);
    });

    it("handles before cursor not found in list", () => {
      expect.hasAssertions();

      const result = paginateArray(items, {
        before: "cursor-missing",
        getCursor,
        last: 2,
      });

      expect(result.edges).toHaveLength(2);
      expect(result.edges[0]?.node).toStrictEqual({ id: "3", name: "three" });
      expect(result.edges[1]?.node).toStrictEqual({ id: "4", name: "four" });
    });

    it("paginates within both after and before bounds", () => {
      expect.hasAssertions();

      const result = paginateArray(items, {
        after: "cursor-1",
        before: "cursor-4",
        first: 1,
        getCursor,
      });

      expect(result.edges).toHaveLength(1);
      expect(result.edges[0]?.node).toStrictEqual({ id: "2", name: "two" });
      expect(result.hasNextPage).toBe(true);
      expect(result.hasPreviousPage).toBe(true);
    });

    it("handles first and last larger than array length or negative values", () => {
      expect.hasAssertions();

      const largeFirstResult = paginateArray(items, {
        first: 100,
        getCursor,
      });

      expect(largeFirstResult.edges).toHaveLength(4);
      expect(largeFirstResult.hasNextPage).toBe(false);

      const largeLastResult = paginateArray(items, {
        getCursor,
        last: 100,
      });

      expect(largeLastResult.edges).toHaveLength(4);
      expect(largeLastResult.hasPreviousPage).toBe(false);

      const negativeResult = paginateArray(items, {
        first: -5,
        getCursor,
        last: -5,
      });

      expect(negativeResult.edges).toHaveLength(4);

      const crossedCursorsResult = paginateArray(items, {
        after: "cursor-3",
        before: "cursor-2",
        getCursor,
      });

      expect(crossedCursorsResult.edges).toHaveLength(0);
    });
  });

  describe("paginated mixin naming", () => {
    it("names the connection and edge after the GraphQL type name it is given", async () => {
      expect.hasAssertions();

      const module = await Test.createTestingModule({
        imports: [GraphQLSchemaBuilderModule],
        providers: [RenamedItemResolver],
      }).compile();
      const schema = await module
        .get(GraphQLSchemaFactory)
        .create([RenamedItemResolver]);

      expect(schema.getType("RenamedItemConnection")).toBeDefined();
      expect(schema.getType("RenamedItemEdge")).toBeDefined();
      expect(schema.getType("TestItemConnection")).toBeUndefined();
    });
  });

  describe("graphql mapping helpers", () => {
    /** Labels an item, standing in for an entity-to-GraphQL mapper. */
    function toLabel(item: { readonly value: number }): string {
      return `item ${item.value}`;
    }

    it("maps each connection node, keeping its cursors and page information", () => {
      expect.hasAssertions();

      const connection = createConnection({
        edges: [
          createEdge({ value: 1 }, "first"),
          createEdge({ value: 2 }, "second"),
        ],
        hasNextPage: true,
        hasPreviousPage: false,
        totalCount: 5,
      });

      expect(mapConnection(connection, toLabel)).toStrictEqual({
        edges: [
          { cursor: "first", node: "item 1" },
          { cursor: "second", node: "item 2" },
        ],
        pageInfo: connection.pageInfo,
        totalCount: 5,
      });
    });

    it("maps a loaded to-one relation and keeps a null or unloaded one", () => {
      expect.hasAssertions();

      const unloaded: undefined | { readonly value: number } = undefined;

      expect(mapRelation({ value: 3 }, toLabel)).toBe("item 3");
      expect(mapRelation(unloaded, toLabel)).toBeUndefined();
      expect(mapNullableRelation({ value: 4 }, toLabel)).toBe("item 4");
      expect(mapNullableRelation(null, toLabel)).toBeNull();
      expect(mapNullableRelation(unloaded, toLabel)).toBeUndefined();
    });

    it("maps a loaded to-many relation and keeps a null or unloaded one", () => {
      expect.hasAssertions();

      const unloaded: undefined | { readonly value: number }[] = undefined;

      expect(mapRelations([{ value: 1 }, { value: 2 }], toLabel)).toStrictEqual(
        ["item 1", "item 2"],
      );
      expect(mapRelations(unloaded, toLabel)).toBeUndefined();
      expect(mapNullableRelations([{ value: 5 }], toLabel)).toStrictEqual([
        "item 5",
      ]);
      expect(mapNullableRelations(null, toLabel)).toBeNull();
      expect(mapNullableRelations(unloaded, toLabel)).toBeUndefined();
    });

    it("copies exactly the shared base columns of a soft-deletable entity", () => {
      expect.hasAssertions();

      const createdAt = new Date("2025-01-01T00:00:00Z");
      const updatedAt = new Date("2025-01-02T00:00:00Z");
      const entity = {
        createdAt,
        createdBy: "creator",
        deletedAt: null,
        deletedBy: null,
        id: "row-1",
        internal: "database only",
        updatedAt,
        updatedBy: null,
      };

      expect(toDeletableFields(entity)).toStrictEqual({
        createdAt,
        createdBy: "creator",
        deletedAt: null,
        deletedBy: null,
        id: "row-1",
        updatedAt,
        updatedBy: null,
      });
    });
  });
});
