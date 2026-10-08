import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { MarkdownNodesService } from "./markdown-nodes.service";

import type { MarkdownNode } from "./markdown.types";

describe(MarkdownNodesService, () => {
  let service: MarkdownNodesService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [MarkdownNodesService],
    }).compile();

    service = await module.resolve(MarkdownNodesService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("filterNodes", () => {
    it("keeps children that look like mdast nodes", () => {
      expect(
        service.filterNodes([{ type: "paragraph" }, null, "text", 42]),
      ).toStrictEqual([{ type: "paragraph" }]);
    });

    it("returns nothing for an empty child list", () => {
      expect(service.filterNodes([])).toStrictEqual([]);
    });
  });

  describe("readChildren", () => {
    it("reads a node's children", () => {
      expect(
        service.readChildren({
          children: [{ type: "text", value: "hello" }],
          type: "paragraph",
        }),
      ).toStrictEqual([{ type: "text", value: "hello" }]);
    });

    it("returns nothing for a leaf", () => {
      expect(service.readChildren({ type: "thematicBreak" })).toStrictEqual([]);
    });
  });

  describe("readText", () => {
    it("renders a node's plain text", () => {
      expect(
        service.readText({
          children: [{ type: "text", value: "hello" }],
          type: "paragraph",
        }),
      ).toBe("hello");
    });
  });

  describe("matches", () => {
    it("rejects nodes of different types", () => {
      expect(
        service.matches({
          instanceNode: { type: "code" },
          templateNode: { type: "paragraph" },
        }),
      ).toBe(false);
    });

    it("accepts nodes with the same rendered text", () => {
      expect(
        service.matches({
          instanceNode: {
            children: [{ type: "text", value: "hello" }],
            type: "paragraph",
          },
          templateNode: {
            children: [{ type: "text", value: "hello" }],
            type: "paragraph",
          },
        }),
      ).toBe(true);
    });
  });

  describe("matches, by node type", () => {
    const CELL: MarkdownNode = { type: "tableCell" };

    /**
     * Node pairs the tree walk rarely reaches on its own: inline content is
     * usually settled by the paragraph's text before its children are
     * compared, so each comparator is driven directly here.
     */
    const PAIRS: {
      differing: MarkdownNode;
      matching: MarkdownNode;
      template: MarkdownNode;
    }[] = [
      {
        differing: { type: "html", value: "<hr>" },
        matching: { type: "html", value: "<br>" },
        template: { type: "html", value: "<br>" },
      },
      {
        differing: { alt: "a", type: "image", url: "other.png" },
        matching: { alt: "a", type: "image", url: "same.png" },
        template: { alt: "a", type: "image", url: "same.png" },
      },
      {
        differing: { type: "inlineCode", value: "other" },
        matching: { type: "inlineCode", value: "same" },
        template: { type: "inlineCode", value: "same" },
      },
      {
        differing: {
          children: [{ type: "text", value: "text" }],
          type: "link",
          url: "https://other.example",
        },
        matching: {
          children: [{ type: "text", value: "text" }],
          type: "link",
          url: "https://same.example",
        },
        template: {
          children: [{ type: "text", value: "text" }],
          type: "link",
          url: "https://same.example",
        },
      },
      {
        differing: { ordered: true, type: "list" },
        matching: { ordered: false, type: "list" },
        template: { ordered: false, type: "list" },
      },
      {
        differing: {
          children: [{ children: [CELL], type: "tableRow" }],
          type: "table",
        },
        matching: {
          children: [{ children: [CELL, CELL], type: "tableRow" }],
          type: "table",
        },
        template: {
          children: [{ children: [CELL, CELL], type: "tableRow" }],
          type: "table",
        },
      },
      {
        differing: { children: [CELL], type: "tableRow" },
        matching: { children: [CELL, CELL], type: "tableRow" },
        template: { children: [CELL, CELL], type: "tableRow" },
      },
    ];

    it.each(PAIRS)("pairs an identical $template.type", (pair) => {
      expect(
        service.matches({
          instanceNode: pair.matching,
          templateNode: pair.template,
        }),
      ).toBe(true);
    });

    it.each(PAIRS)("rejects a $template.type that drifted", (pair) => {
      expect(
        service.matches({
          instanceNode: pair.differing,
          templateNode: pair.template,
        }),
      ).toBe(false);
    });

    it("counts an empty table as having no columns", () => {
      expect(
        service.matches({
          instanceNode: { children: [], type: "table" },
          templateNode: { children: [], type: "table" },
        }),
      ).toBe(true);
    });

    it("treats a missing field as empty on both sides", () => {
      expect(
        service.matches({
          instanceNode: { type: "text" },
          templateNode: { type: "text" },
        }),
      ).toBe(true);
    });

    it("rejects two nodes of different types outright", () => {
      expect(
        service.matches({
          instanceNode: { type: "text", value: "a" },
          templateNode: { type: "html", value: "a" },
        }),
      ).toBe(false);
    });
  });
});
