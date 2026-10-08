import * as fs from "node:fs";

import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { IgnoreRulesService } from "./ignore-rules.service";

import type { IgnoreScope } from "./ignore-rules.types";

// Pattern matching is pure, so the only I/O this service does — reading an
// ignore file — is mocked rather than staged on disk. Real trees are walked in
// `discovery.service.integration.test.ts`.
vi.mock("node:fs");

describe(IgnoreRulesService, () => {
  let service: IgnoreRulesService;

  /** Builds a rule set anchored at the walk root. */
  function rootScope(patterns: string[]): IgnoreScope {
    return service.createScope({ directory: "", patterns });
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [IgnoreRulesService],
    }).compile();
    service = await module.resolve(IgnoreRulesService);
  });

  it("is defined", () => {
    expect.hasAssertions();
    expect(service).toBeDefined();
  });

  describe("gitignore pattern syntax", () => {
    it.each([
      [
        "a leading slash anchors to the scope root",
        ["/README.md"],
        "README.md",
        true,
      ],
      [
        "a leading slash spares a nested namesake",
        ["/README.md"],
        "docs/README.md",
        false,
      ],
      [
        "a bare name matches at any depth",
        ["README.md"],
        "docs/README.md",
        true,
      ],
      ["a trailing slash claims a directory", ["build/"], "build/", true],
      [
        "a trailing slash claims what is inside",
        ["build/"],
        "build/main.js",
        true,
      ],
      [
        "a trailing slash spares a file of that name",
        ["build/"],
        "build",
        false,
      ],
      [
        "a wildcard matches within a segment",
        ["*.log"],
        "logs/debug.log",
        true,
      ],
      [
        "a wildcard does not cross a slash",
        ["logs/*.log"],
        "logs/nested/debug.log",
        false,
      ],
      [
        "a double star crosses slashes",
        ["logs/**/*.log"],
        "logs/nested/debug.log",
        true,
      ],
      ["a comment is not a pattern", ["# build/"], "build/main.js", false],
      ["a blank line is not a pattern", ["", "  "], "build/main.js", false],
      [
        "an escaped hash is a pattern",
        [String.raw`\#notes.md`],
        "#notes.md",
        true,
      ],
      ["matching is case sensitive", ["README.md"], "readme.md", false],
    ])("%s", (_name, patterns, candidate, expected) => {
      expect.hasAssertions();
      expect(service.isIgnored([rootScope(patterns)], candidate)).toBe(
        expected,
      );
    });

    it("lets a later pattern re-include what an earlier one claimed", () => {
      expect.hasAssertions();

      const scopes = [rootScope(["output/*", "!output/.gitkeep"])];

      expect(service.isIgnored(scopes, "output/one.md")).toBe(true);
      expect(service.isIgnored(scopes, "output/.gitkeep")).toBe(false);
    });

    it("ignores nothing when no rule set is in force", () => {
      expect.hasAssertions();
      expect(service.isIgnored([], "anything.ts")).toBe(false);
    });
  });

  describe("nested rule sets", () => {
    it("matches a nested rule set against the path it sees", () => {
      expect.hasAssertions();

      const scopes = [
        service.createScope({
          directory: "applications/app",
          patterns: ["/output/"],
        }),
      ];

      // The pattern is anchored at the directory its file lives in, so it
      // claims that project's output and leaves the repository root's alone.
      expect(service.isIgnored(scopes, "applications/app/output/one.md")).toBe(
        true,
      );
      expect(service.isIgnored(scopes, "output/one.md")).toBe(false);
    });

    it("never lets a rule set claim its own directory", () => {
      expect.hasAssertions();

      const scopes = [
        service.createScope({ directory: "output", patterns: ["*"] }),
      ];

      expect(service.isIgnored(scopes, "output/")).toBe(false);
      expect(service.isIgnored(scopes, "output/one.md")).toBe(true);
    });

    it("lets the innermost rule set overrule the one above it", () => {
      expect.hasAssertions();

      const scopes = [
        rootScope(["*.md"]),
        service.createScope({ directory: "docs", patterns: ["!guide.md"] }),
      ];

      expect(service.isIgnored(scopes, "notes.md")).toBe(true);
      expect(service.isIgnored(scopes, "docs/guide.md")).toBe(false);
    });

    it("keeps the outer decision where no inner rule set applies", () => {
      expect.hasAssertions();

      const scopes = [
        rootScope(["*.md"]),
        service.createScope({ directory: "docs", patterns: ["!guide.md"] }),
      ];

      expect(service.isIgnored(scopes, "source/guide.md")).toBe(true);
    });
  });

  describe("reading a rule set from a file", () => {
    beforeEach(() => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        "# Generated\npnpm-lock.yaml\n\n/CHANGELOG.md\n",
      );
    });

    it("reads every pattern the file holds", () => {
      expect.hasAssertions();

      const scope = service.readScope({
        directory: "",
        filePath: "/repository/.codometerignore",
      });
      const scopes = scope === undefined ? [] : [scope];

      expect(fs.readFileSync).toHaveBeenCalledWith(
        "/repository/.codometerignore",
        "utf8",
      );
      expect(service.isIgnored(scopes, "pnpm-lock.yaml")).toBe(true);
      expect(service.isIgnored(scopes, "CHANGELOG.md")).toBe(true);
      // The comment line is a comment, not a pattern claiming a file.
      expect(service.isIgnored(scopes, "Generated")).toBe(false);
    });

    it("anchors the patterns at the directory it is given", () => {
      expect.hasAssertions();

      const scope = service.readScope({
        directory: "applications/app",
        filePath: "/repository/applications/app/.codometerignore",
      });
      const scopes = scope === undefined ? [] : [scope];

      expect(service.isIgnored(scopes, "applications/app/CHANGELOG.md")).toBe(
        true,
      );
      expect(service.isIgnored(scopes, "CHANGELOG.md")).toBe(false);
    });

    it("returns nothing when the file is absent", () => {
      expect.hasAssertions();

      vi.mocked(fs.existsSync).mockReturnValue(false);

      expect(
        service.readScope({
          directory: "",
          filePath: "/nowhere/.codometerignore",
        }),
      ).toBeUndefined();
      expect(fs.readFileSync).not.toHaveBeenCalled();
    });
  });
});
