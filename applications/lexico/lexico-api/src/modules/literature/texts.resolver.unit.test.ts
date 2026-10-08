import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { Line, Text } from "@codebase/lexico-entities";

import { mapNullableRelation } from "../../lexico-api.utilities";

import { LiteratureService } from "./literature.service";
import { toLineType, toTextType } from "./literature.utilities";
import { TextsResolver } from "./texts.resolver";

/** Builds a line with the given index under a text. */
function createLine(index: number): Line {
  return Object.assign(new Line(), { id: `line-${String(index)}`, index });
}

describe(TextsResolver, () => {
  let resolver: TextsResolver;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TextsResolver,
        {
          provide: LiteratureService,
          useValue: createMock<LiteratureService>(),
        },
      ],
    }).compile();

    resolver = await module.resolve(TextsResolver);
  });

  it("is defined", () => {
    expect(resolver).toBeDefined();
  });

  it("resolves a single text by lookup", async () => {
    expect.hasAssertions();

    const text = new Text();
    text.id = "text-1";
    text.title = "Aeneid";

    const mockService = createMock<LiteratureService>({
      findTextByLookup: vi
        .fn<LiteratureService["findTextByLookup"]>()
        .mockResolvedValue(text),
    });

    const textsResolver = new TextsResolver(mockService);

    await expect(textsResolver.text({ id: "text-1" })).resolves.toStrictEqual(
      toTextType(text),
    );
    await expect(textsResolver.text({ slug: "aeneid" })).resolves.toStrictEqual(
      toTextType(text),
    );
    await expect(
      textsResolver.text({ lookup: { id: "text-1" } }),
    ).resolves.toStrictEqual(toTextType(text));
    await expect(
      textsResolver.text({ lookup: { slug: "aeneid" } }),
    ).resolves.toStrictEqual(toTextType(text));
  });

  it("returns a paginated connection for texts", async () => {
    expect.hasAssertions();

    const text = new Text();
    text.id = "text-1";

    const mockService = createMock<LiteratureService>({
      listTextsConnection: vi
        .fn<LiteratureService["listTextsConnection"]>()
        .mockResolvedValue({
          edges: [{ cursor: "t", node: text }],
          pageInfo: {
            endCursor: "t",
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: "t",
          },
          totalCount: 1,
        }),
    });

    const textsResolver = new TextsResolver(mockService);

    await expect(
      textsResolver.texts({
        after: "cursor-1",
        authorId: "author-1",
        before: "cursor-0",
        first: 10,
        last: 5,
      }),
    ).resolves.toMatchObject({
      edges: [{ node: toTextType(text) }],
      totalCount: 1,
    });
    await expect(
      textsResolver.texts({ first: 10, parentTextId: "parent-1" }),
    ).resolves.toMatchObject({
      edges: [{ node: toTextType(text) }],
      totalCount: 1,
    });
    await expect(textsResolver.texts({ first: 10 })).resolves.toMatchObject({
      edges: [{ node: toTextType(text) }],
      totalCount: 1,
    });
  });

  it("resolves text search results and nested text/line relations", async () => {
    expect.hasAssertions();

    const text = new Text();
    text.id = "text-1";
    text.parentText = new Text();

    const mockService = createMock<LiteratureService>({
      searchTexts: vi.fn<LiteratureService["searchTexts"]>().mockResolvedValue({
        edges: [{ cursor: "t", node: text }],
        pageInfo: {
          endCursor: "t",
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: "t",
        },
        totalCount: 1,
      }),
    });

    const textsResolver = new TextsResolver(mockService);

    await expect(
      textsResolver.searchTexts({
        after: "c-1",
        authorId: "author-1",
        before: "c-0",
        first: 5,
        last: 2,
        query: "ene",
      }),
    ).resolves.toMatchObject({
      edges: [{ node: toTextType(text) }],
      totalCount: 1,
    });
    await expect(
      textsResolver.searchTexts({ first: 5, query: "ene" }),
    ).resolves.toMatchObject({
      edges: [{ node: toTextType(text) }],
      totalCount: 1,
    });

    await expect(
      textsResolver.parentText(toTextType(text)),
    ).resolves.toStrictEqual(mapNullableRelation(text.parentText, toTextType));
    await expect(
      textsResolver.parentText(
        toTextType(Object.assign(new Text(), { parentText: null })),
      ),
    ).resolves.toBeNull();
  });

  it("looks up the parent of a text whose parent was not joined", async () => {
    expect.hasAssertions();

    const grandparent = Object.assign(new Text(), { id: "text-0" });
    const findTextByLookup = vi
      .fn<LiteratureService["findTextByLookup"]>()
      .mockResolvedValueOnce(
        Object.assign(new Text(), { id: "text-1", parentText: grandparent }),
      )
      .mockResolvedValueOnce(null);
    const textsResolver = new TextsResolver(
      createMock<LiteratureService>({ findTextByLookup }),
    );

    await expect(
      textsResolver.parentText(
        toTextType(Object.assign(new Text(), { id: "text-1" })),
      ),
    ).resolves.toStrictEqual(toTextType(grandparent));
    await expect(
      textsResolver.parentText(
        toTextType(Object.assign(new Text(), { id: "text-9" })),
      ),
    ).resolves.toBeNull();
    expect(findTextByLookup).toHaveBeenNthCalledWith(1, "text-1");
  });

  it("resolves nullable text lookups", async () => {
    expect.hasAssertions();

    const textsResolver = new TextsResolver(createMock<LiteratureService>());

    await expect(textsResolver.text({})).resolves.toBeNull();

    await expect(textsResolver.text({ lookup: {} })).resolves.toBeNull();
  });

  it("resolves a text's lines in index order even when the relation was joined out of order", async () => {
    expect.hasAssertions();

    const text = Object.assign(new Text(), {
      id: "text-1",
      lines: [createLine(34), createLine(49), createLine(10), createLine(0)],
    });
    const orderedLines = [0, 10, 34, 49].map((index) => createLine(index));
    const listLines = vi
      .fn<LiteratureService["listLines"]>()
      .mockResolvedValue(orderedLines);
    const textsResolver = new TextsResolver(
      createMock<LiteratureService>({ listLines }),
    );

    const lines = await textsResolver.linesForText(toTextType(text));

    expect(lines.map((line) => line.index)).toStrictEqual([0, 10, 34, 49]);
    expect(listLines).toHaveBeenCalledWith("text-1");
  });

  it("resolves lines and child texts for a text loaded without those relations", async () => {
    expect.hasAssertions();

    const text = Object.assign(new Text(), { id: "text-1" });
    const child = Object.assign(new Text(), { id: "text-2", title: "Liber I" });
    const listLines = vi
      .fn<LiteratureService["listLines"]>()
      .mockResolvedValue([createLine(0)]);
    const listTexts = vi
      .fn<LiteratureService["listTexts"]>()
      .mockResolvedValue([child]);
    const textsResolver = new TextsResolver(
      createMock<LiteratureService>({ listLines, listTexts }),
    );

    await expect(
      textsResolver.linesForText(toTextType(text)),
    ).resolves.toStrictEqual([toLineType(createLine(0))]);
    await expect(
      textsResolver.childTexts(toTextType(text)),
    ).resolves.toStrictEqual([toTextType(child)]);
    expect(listTexts).toHaveBeenCalledWith(undefined, "text-1");
  });
});
