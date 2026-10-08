import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { ScoringService } from "../scoring/scoring.service";

import { MarkdownNodesService } from "./markdown-nodes.service";
import { MarkdownTreeService } from "./markdown-tree.service";

import type { MarkdownNode } from "./markdown.types";

/** A paragraph rendering to the given text. */
function paragraph(value: string): MarkdownNode {
  return { children: [{ type: "text", value }], type: "paragraph" };
}

describe(MarkdownTreeService, () => {
  let service: MarkdownTreeService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [MarkdownNodesService, MarkdownTreeService, ScoringService],
    }).compile();

    service = await module.resolve(MarkdownTreeService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("compareChildren", () => {
    it("reports nothing when the instance has every template node", () => {
      expect(
        service.compareChildren({
          instanceChildren: [paragraph("alpha"), paragraph("beta")],
          templateChildren: [paragraph("alpha"), paragraph("beta")],
        }).differences,
      ).toStrictEqual([]);
    });

    it("reports a template node the instance lacks", () => {
      const { differences } = service.compareChildren({
        instanceChildren: [paragraph("alpha")],
        templateChildren: [paragraph("alpha"), paragraph("beta")],
      });

      expect(differences).toHaveLength(1);
      expect(differences[0]?.text).toBe("beta");
      expect(differences[0]?.nodeType).toBe("paragraph");
    });

    it("ignores extra instance nodes the template does not mention", () => {
      expect(
        service.compareChildren({
          instanceChildren: [paragraph("alpha"), paragraph("extra")],
          templateChildren: [paragraph("alpha")],
        }).differences,
      ).toStrictEqual([]);
    });

    it("reports nothing for an empty template", () => {
      expect(
        service.compareChildren({
          instanceChildren: [paragraph("alpha")],
          templateChildren: [],
        }).differences,
      ).toStrictEqual([]);
    });

    it("requires only the shape of a childless template container", () => {
      // A template list with no items asks for *a list*, not for any
      // particular item, so an instance list of any content satisfies it.
      expect(
        service.compareChildren({
          instanceChildren: [
            {
              children: [{ children: [paragraph("alpha")], type: "listItem" }],
              ordered: false,
              type: "list",
            },
          ],
          templateChildren: [{ children: [], ordered: false, type: "list" }],
        }).differences,
      ).toStrictEqual([]);
    });
  });
});
