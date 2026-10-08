import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { AnchorNotFoundError } from "./anchors.constants";
import { AnchorsService } from "./anchors.service";

const README_WITH_ANCHOR = [
  "# codependix-nx-projects",
  "",
  "## Dependencies",
  "",
  '<!-- codependix:start name="nx" -->',
  "old content",
  '<!-- codependix:end name="nx" -->',
  "",
  "## Other Section",
].join("\n");

describe(AnchorsService, () => {
  let service: AnchorsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [AnchorsService],
    }).compile();

    service = await module.resolve(AnchorsService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("extractAnchorContent", () => {
    it("reads the content between a named anchor's markers", () => {
      expect(
        service.extractAnchorContent({
          anchorName: "nx",
          fileContent: README_WITH_ANCHOR,
          filePath: "README.md",
        }),
      ).toBe("old content");
    });

    it("returns undefined for an anchor name that is not present", () => {
      expect(
        service.extractAnchorContent({
          anchorName: "nestjs",
          fileContent: README_WITH_ANCHOR,
          filePath: "README.md",
        }),
      ).toBeUndefined();
    });
  });

  describe("hasAnchor", () => {
    it("reports whether the named anchor is present", () => {
      expect(
        service.hasAnchor({
          anchorName: "nx",
          fileContent: README_WITH_ANCHOR,
          filePath: "README.md",
        }),
      ).toBe(true);
      expect(
        service.hasAnchor({
          anchorName: "nestjs",
          fileContent: README_WITH_ANCHOR,
          filePath: "README.md",
        }),
      ).toBe(false);
    });
  });

  describe("checkAnchor", () => {
    it("reports drift when the anchor content differs from a fresh run", () => {
      const result = service.checkAnchor({
        anchorName: "nx",
        fileContent: README_WITH_ANCHOR,
        filePath: "README.md",
        freshContent: "new content",
      });

      expect(result.isCurrent).toBe(false);
      expect(result.currentContent).toBe("old content");
      expect(result.freshContent).toBe("new content");
    });

    it("reports no drift when the anchor already holds the fresh content", () => {
      const result = service.checkAnchor({
        anchorName: "nx",
        fileContent: README_WITH_ANCHOR,
        filePath: "README.md",
        freshContent: "old content",
      });

      expect(result.isCurrent).toBe(true);
    });

    // A missing or malformed anchor is reported as a check failure rather than
    // silently skipped, per issue #242's testing decisions.
    it("throws AnchorNotFoundError for a missing anchor", () => {
      expect(() =>
        service.checkAnchor({
          anchorName: "nestjs",
          fileContent: README_WITH_ANCHOR,
          filePath: "README.md",
          freshContent: "content",
        }),
      ).toThrow(AnchorNotFoundError);
    });
  });

  describe("replaceAnchorContent", () => {
    it("replaces only the named anchor's content, leaving the rest untouched", () => {
      const result = service.replaceAnchorContent({
        anchorName: "nx",
        fileContent: README_WITH_ANCHOR,
        filePath: "README.md",
        newContent: "new content",
      });

      expect(result).toBe(
        [
          "# codependix-nx-projects",
          "",
          "## Dependencies",
          "",
          '<!-- codependix:start name="nx" -->',
          "new content",
          '<!-- codependix:end name="nx" -->',
          "",
          "## Other Section",
        ].join("\n"),
      );
    });

    // Writing twice produces byte-identical output: the second write has
    // nothing left to change.
    it("is idempotent across two writes of the same content", () => {
      const firstWrite = service.replaceAnchorContent({
        anchorName: "nx",
        fileContent: README_WITH_ANCHOR,
        filePath: "README.md",
        newContent: "stable content",
      });
      const secondWrite = service.replaceAnchorContent({
        anchorName: "nx",
        fileContent: firstWrite,
        filePath: "README.md",
        newContent: "stable content",
      });

      expect(secondWrite).toBe(firstWrite);
    });

    it("leaves an unrecognized anchor name's block untouched", () => {
      const multiAnchorFile = [
        '<!-- codependix:start name="nx" -->',
        "nx content",
        '<!-- codependix:end name="nx" -->',
        '<!-- codependix:start name="nestjs" -->',
        "nestjs content",
        '<!-- codependix:end name="nestjs" -->',
      ].join("\n");

      const result = service.replaceAnchorContent({
        anchorName: "nx",
        fileContent: multiAnchorFile,
        filePath: "README.md",
        newContent: "updated nx content",
      });

      expect(result).toContain("updated nx content");
      expect(result).toContain("nestjs content");
    });

    it("normalizes surrounding whitespace to a canonical single blank line", () => {
      const result = service.replaceAnchorContent({
        anchorName: "nx",
        fileContent: README_WITH_ANCHOR,
        filePath: "README.md",
        newContent: "\n\n  new content  \n\n",
      });

      expect(result).toContain(
        '<!-- codependix:start name="nx" -->\nnew content\n<!-- codependix:end name="nx" -->',
      );
    });

    it("throws AnchorNotFoundError rather than appending a missing anchor", () => {
      expect(() =>
        service.replaceAnchorContent({
          anchorName: "nestjs",
          fileContent: README_WITH_ANCHOR,
          filePath: "README.md",
          newContent: "content",
        }),
      ).toThrow(AnchorNotFoundError);
    });

    it("treats a literal regular expression character in an anchor name literally", () => {
      const fileContent = [
        '<!-- codependix:start name="a.b" -->',
        "old",
        '<!-- codependix:end name="a.b" -->',
      ].join("\n");

      const result = service.replaceAnchorContent({
        anchorName: "a.b",
        fileContent,
        filePath: "README.md",
        newContent: "new",
      });

      expect(result).toContain("new");
      expect(
        service.hasAnchor({
          anchorName: "aXb",
          fileContent,
          filePath: "README.md",
        }),
      ).toBe(false);
    });
  });

  describe("insertAnchorSection", () => {
    it("appends a brand-new Codependix section to a file with none", () => {
      const result = service.insertAnchorSection({
        anchorName: "codependix-nx-projects",
        content: "```mermaid\ngraph LR\n```",
        fileContent: "# my-project\n\nSome existing content.\n",
        introLine: "Dependency graphs exported by codependix.",
        subheading: "Nx Neighborhood",
      });

      expect(result).toBe(
        [
          "# my-project",
          "",
          "Some existing content.",
          "",
          "## 🕸️ Codependix",
          "",
          "Dependency graphs exported by codependix.",
          "",
          "### Nx Neighborhood",
          "",
          '<!-- codependix:start name="codependix-nx-projects" -->',
          "```mermaid",
          "graph LR",
          "```",
          '<!-- codependix:end name="codependix-nx-projects" -->',
          "",
        ].join("\n"),
      );
    });

    it("appends a Codependix section with no subheading, for the workspace case", () => {
      const result = service.insertAnchorSection({
        anchorName: "codependix-workspace",
        content: "```mermaid\ngraph LR\n```",
        fileContent: "# workspace\n",
        introLine: "The workspace's dependency graph.",
        subheading: undefined,
      });

      expect(result).toBe(
        [
          "# workspace",
          "",
          "## 🕸️ Codependix",
          "",
          "The workspace's dependency graph.",
          "",
          '<!-- codependix:start name="codependix-workspace" -->',
          "```mermaid",
          "graph LR",
          "```",
          '<!-- codependix:end name="codependix-workspace" -->',
          "",
        ].join("\n"),
      );
    });

    it("inserts a new subheading under an existing Codependix section", () => {
      const fileContent = [
        "# my-project",
        "",
        "## 🕸️ Codependix",
        "",
        "Dependency graphs exported by codependix.",
        "",
        "### Nx Neighborhood",
        "",
        '<!-- codependix:start name="codependix-nx-projects" -->',
        "graph",
        '<!-- codependix:end name="codependix-nx-projects" -->',
        "",
        "## Other Section",
        "",
        "unrelated content",
      ].join("\n");

      const result = service.insertAnchorSection({
        anchorName: "codependix-file-imports",
        content: "```mermaid\ngraph LR\n```",
        fileContent,
        introLine: "Dependency graphs exported by codependix.",
        subheading: "File Imports",
      });

      expect(result).toBe(
        [
          "# my-project",
          "",
          "## 🕸️ Codependix",
          "",
          "Dependency graphs exported by codependix.",
          "",
          "### Nx Neighborhood",
          "",
          '<!-- codependix:start name="codependix-nx-projects" -->',
          "graph",
          '<!-- codependix:end name="codependix-nx-projects" -->',
          "",
          "### File Imports",
          "",
          '<!-- codependix:start name="codependix-file-imports" -->',
          "```mermaid",
          "graph LR",
          "```",
          '<!-- codependix:end name="codependix-file-imports" -->',
          "",
          "## Other Section",
          "",
          "unrelated content",
        ].join("\n"),
      );
    });

    it("inserts a new subheading at the end of the file when the section is last", () => {
      const fileContent = [
        "# my-project",
        "",
        "## 🕸️ Codependix",
        "",
        "Dependency graphs exported by codependix.",
        "",
        "### Nx Neighborhood",
        "",
        '<!-- codependix:start name="codependix-nx-projects" -->',
        "graph",
        '<!-- codependix:end name="codependix-nx-projects" -->',
      ].join("\n");

      const result = service.insertAnchorSection({
        anchorName: "codependix-file-imports",
        content: "content",
        fileContent,
        introLine: "Dependency graphs exported by codependix.",
        subheading: "File Imports",
      });

      expect(result).toBe(
        [
          "# my-project",
          "",
          "## 🕸️ Codependix",
          "",
          "Dependency graphs exported by codependix.",
          "",
          "### Nx Neighborhood",
          "",
          '<!-- codependix:start name="codependix-nx-projects" -->',
          "graph",
          '<!-- codependix:end name="codependix-nx-projects" -->',
          "",
          "### File Imports",
          "",
          '<!-- codependix:start name="codependix-file-imports" -->',
          "content",
          '<!-- codependix:end name="codependix-file-imports" -->',
          "",
        ].join("\n"),
      );
    });

    it("appends a Codependix section to a completely empty file", () => {
      const result = service.insertAnchorSection({
        anchorName: "codependix-nx-projects",
        content: "content",
        fileContent: "",
        introLine: "intro",
        subheading: undefined,
      });

      expect(result).toBe(
        [
          "## 🕸️ Codependix",
          "",
          "intro",
          "",
          '<!-- codependix:start name="codependix-nx-projects" -->',
          "content",
          '<!-- codependix:end name="codependix-nx-projects" -->',
          "",
        ].join("\n"),
      );
    });

    it("never duplicates the Codependix heading itself", () => {
      const fileContent = [
        "## 🕸️ Codependix",
        "",
        "intro",
        "",
        '<!-- codependix:start name="codependix-nx-projects" -->',
        "graph",
        '<!-- codependix:end name="codependix-nx-projects" -->',
      ].join("\n");

      const result = service.insertAnchorSection({
        anchorName: "codependix-nestjs-modules",
        content: "content",
        fileContent,
        introLine: "intro",
        subheading: "NestJS Module Graph",
      });

      expect(result.match(/## 🕸️ Codependix/gu)).toHaveLength(1);
    });
  });

  describe("wrapInAnchors", () => {
    it("wraps content in a fresh pair of named markers", () => {
      expect(service.wrapInAnchors("nx", "content")).toBe(
        [
          '<!-- codependix:start name="nx" -->',
          "content",
          '<!-- codependix:end name="nx" -->',
        ].join("\n"),
      );
    });
  });
});
