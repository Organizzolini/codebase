import { ConfigurationModule } from "@conformetry/configuration";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { ScopeService } from "./scope.service";

import type { ProjectScope } from "../instances/instances.types";

const NESTJS: ProjectScope = {
  name: "widgets",
  root: "packages/widgets",
  tags: ["framework:nestjs", "type:package"],
};

const REACT: ProjectScope = {
  name: "storefront",
  root: "applications/storefront",
  tags: ["framework:react", "type:application"],
};

describe(ScopeService, () => {
  let service: ScopeService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [ConfigurationModule],
      providers: [ScopeService],
    }).compile();

    service = await module.resolve(ScopeService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("matchesProject", () => {
    it("matches a project carrying the group's tag", () => {
      expect(
        service.matchesProject({
          group: { patterns: ["src/modules/*"], tags: ["framework:nestjs"] },
          project: NESTJS,
        }),
      ).toBe(true);
    });

    it("requires a project to carry every one of the group's tags", () => {
      const group = {
        patterns: ["src/modules/*"],
        tags: ["framework:nestjs", "language:graphql"],
      };

      expect(service.matchesProject({ group, project: NESTJS })).toBe(false);
      expect(
        service.matchesProject({
          group,
          project: { ...NESTJS, tags: [...NESTJS.tags, "language:graphql"] },
        }),
      ).toBe(true);
    });

    it("does not match a project carrying none of them", () => {
      expect(
        service.matchesProject({
          group: { patterns: ["src/modules/*"], tags: ["framework:nestjs"] },
          project: REACT,
        }),
      ).toBe(false);
    });

    it.each([
      ["a group with no tags", { patterns: ["packages/*"] }],
      [
        "a group with an empty tag list",
        { patterns: ["packages/*"], tags: [] },
      ],
    ])("matches every project given %s", (_description, group) => {
      // Tags narrow a group; they do not opt it in.
      expect(service.matchesProject({ group, project: REACT })).toBe(true);
    });
  });

  describe("resolveGroup", () => {
    it("reads a tagged group's globs inside the project", () => {
      expect(
        service.resolveGroup({
          group: { patterns: ["src/modules/*"], tags: ["framework:nestjs"] },
          project: NESTJS,
        }),
      ).toStrictEqual([
        {
          patterns: ["packages/widgets/src/modules/*"],
          tags: ["framework:nestjs"],
        },
      ]);
    });

    it("reads the root pattern as the project itself", () => {
      expect(
        service.resolveGroup({
          group: { patterns: ["."], tags: ["framework:nestjs"] },
          project: NESTJS,
        })[0]?.patterns,
      ).toStrictEqual(["packages/widgets"]);
    });

    it("carries an authored substitution through untouched", () => {
      // Where a candidate sits is derived once, by the base package, for every
      // group; this only has to not lose what the author wrote.
      expect(
        service.resolveGroup({
          group: {
            patterns: ["."],
            substitutions: { type: "tools" },
            tags: ["framework:nestjs"],
          },
          project: NESTJS,
        })[0]?.substitutions,
      ).toStrictEqual({ type: "tools" });
    });

    it("returns an untagged group exactly as written", () => {
      // The workspace-glob form, which a host with no project graph resolves.
      const group = { patterns: ["packages/*/src/modules/*"] };

      expect(service.resolveGroup({ group, project: NESTJS })).toStrictEqual([
        group,
      ]);
    });

    it.each([
      [
        "a project the tags do not select",
        { patterns: ["src/modules/*"], tags: ["framework:nestjs"] },
        REACT,
      ],
      ["a group naming no pattern", { tags: ["framework:react"] }, REACT],
      ["a group with an empty pattern list", { patterns: [], tags: [] }, REACT],
    ])("resolves nothing for %s", (_description, group, project) => {
      expect(service.resolveGroup({ group, project })).toStrictEqual([]);
    });
  });

  describe("resolveScopedDirectory", () => {
    it.each([
      ["src/modules/*", "src/modules"],
      ["src/modules/*/*.service.ts", "src/modules"],
      ["src/components", "src/components"],
    ])("trims %s to %s", (pattern, expected) => {
      expect(
        service.resolveScopedDirectory([
          { patterns: [pattern], tags: ["framework:nestjs"] },
        ]),
      ).toBe(expected);
    });

    it.each([
      ["the root pattern", [{ patterns: ["."], tags: ["framework:nestjs"] }]],
      ["a pattern that is all glob", [{ patterns: ["*"], tags: ["x"] }]],
      ["a group naming no pattern", [{ tags: ["framework:nestjs"] }]],
      ["only untagged groups", [{ patterns: ["packages/*/src/modules/*"] }]],
      ["no groups at all", []],
    ])("names no directory for %s", (_description, groups) => {
      expect(service.resolveScopedDirectory(groups)).toBeUndefined();
    });
  });

  describe("resolveScopedProjectNames", () => {
    it("names the matching projects, sorted for a stable schema", () => {
      // The emitted schema is compared byte for byte by the drift check, so an
      // unstable order would report drift on every re-emit.
      expect(
        service.resolveScopedProjectNames({
          groups: [
            { patterns: ["src/modules/*"], tags: ["framework:nestjs"] },
            { patterns: ["src/components/*"], tags: ["framework:react"] },
          ],
          projects: [REACT, NESTJS],
        }),
      ).toStrictEqual(["storefront", "widgets"]);
    });

    it("names nothing when no group is tagged", () => {
      // Read by the caller as "say nothing about the prompt", rather than as
      // "offer no project at all".
      expect(
        service.resolveScopedProjectNames({
          groups: [{ patterns: ["packages/*/src/modules/*"] }],
          projects: [REACT, NESTJS],
        }),
      ).toStrictEqual([]);
    });

    it("names nothing when the tags match no project", () => {
      expect(
        service.resolveScopedProjectNames({
          groups: [{ tags: ["framework:nestjs"] }],
          projects: [REACT],
        }),
      ).toStrictEqual([]);
    });
  });
});
