import { describe, expect, it, vi } from "vitest";

import { Text } from "@codebase/lexico-entities";

import { createRepositoryMock } from "../../../testing/mocks";
import { createConnection, createEdge } from "../../lexico-api.utilities";

import {
  createConnectionLoader,
  paginateQueryByParent,
} from "./literature-relations.utilities";
import { createEmptyConnection } from "./literature.utilities";

import type { Connection } from "../../lexico-api.types";
import type { PaginationArguments } from "../search/pagination-arguments.entities";

/** A one-edge connection naming the parent and page it answered. */
function connectionFor(
  parentId: string,
  pagination: PaginationArguments,
): Connection<{ id: string }> {
  return createConnection({
    edges: [
      createEdge(
        { id: `${parentId}:${String(pagination.first ?? "all")}` },
        "cursor",
      ),
    ],
    hasNextPage: false,
    hasPreviousPage: false,
    totalCount: 1,
  });
}

/** The pages a batch answers: one per parent, each naming its request. */
function pagesFor(
  parentIds: string[],
  pagination: PaginationArguments,
): Map<string, Connection<{ id: string }>> {
  return new Map(
    parentIds.map((parentId) => [
      parentId,
      connectionFor(parentId, pagination),
    ]),
  );
}

describe("literature relations utilities", () => {
  describe(createConnectionLoader, () => {
    it("pages every parent asking the same page in one call, and each distinct page in its own", async () => {
      expect.hasAssertions();

      const page = vi
        .fn<
          (
            parentIds: string[],
            pagination: PaginationArguments,
          ) => Promise<Map<string, Connection<{ id: string }>>>
        >()
        .mockResolvedValueOnce(pagesFor(["a", "b"], { first: 2 }))
        .mockResolvedValueOnce(pagesFor(["a"], {}));
      const loader = createConnectionLoader(page);

      const answers = await Promise.all([
        loader.load({ pagination: { first: 2 }, parentId: "a" }),
        loader.load({ pagination: { first: 2 }, parentId: "b" }),
        loader.load({ pagination: {}, parentId: "a" }),
        loader.load({ pagination: { first: 2 }, parentId: "a" }),
      ]);

      expect(page.mock.calls).toStrictEqual([
        [["a", "b"], { first: 2 }],
        [["a"], {}],
      ]);
      expect(answers.map((answer) => answer.edges[0]?.node.id)).toStrictEqual([
        "a:2",
        "b:2",
        "a:all",
        "a:2",
      ]);
    });

    it("answers a parent the page left out with an empty connection", async () => {
      expect.hasAssertions();

      const loader = createConnectionLoader<{ id: string }>(
        vi
          .fn<() => Promise<Map<string, Connection<{ id: string }>>>>()
          .mockResolvedValue(new Map()),
      );

      await expect(
        loader.load({ pagination: { last: 1 }, parentId: "missing" }),
      ).resolves.toStrictEqual(createEmptyConnection());
    });
  });

  describe(paginateQueryByParent, () => {
    it("drops a loaded row that names none of the requested parents", async () => {
      expect.hasAssertions();

      const repository = createRepositoryMock<Text>();
      const builder = repository.createQueryBuilder();
      vi.mocked(builder.getQuery).mockReturnValue("SELECT 1");
      vi.mocked(builder.getParameters).mockReturnValue({});
      vi.mocked(builder.getRawMany).mockResolvedValue([
        {
          beforeCount: "0",
          parentId: "parent",
          totalCount: "1",
          windowCount: "1",
        },
      ]);
      const child = Object.assign(new Text(), {
        id: "child",
        parentText: Object.assign(new Text(), { id: "parent" }),
      });
      const orphan = Object.assign(new Text(), { id: "orphan" });
      vi.mocked(builder.getMany).mockResolvedValue([child, orphan]);

      const connections = await paginateQueryByParent(
        {
          alias: "text",
          load: () => builder,
          parentKey: "text.parent_text_id",
          parentOf: (text) => text.parentText?.id,
          repository,
          sortKey: "text.title",
        },
        ["parent", "parent"],
      );

      expect([...connections.keys()]).toStrictEqual(["parent"]);
      expect(
        connections.get("parent")?.edges.map((edge) => edge.node.id),
      ).toStrictEqual(["child"]);
    });
  });
});
