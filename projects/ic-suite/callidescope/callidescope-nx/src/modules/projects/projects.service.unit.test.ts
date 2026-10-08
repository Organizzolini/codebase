import { Test } from "@nestjs/testing";
import { createProjectGraphAsync } from "@nx/devkit";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { ProjectsService } from "./projects.service";

import type { ProjectGraph } from "@nx/devkit";

vi.mock("@nx/devkit", () => ({
  createProjectGraphAsync: vi.fn<() => Promise<unknown>>(async () => {
    await Promise.resolve();

    return { dependencies: {}, nodes: {} };
  }),
}));

/** Builds a project graph with dependency edges between named projects. */
function buildDependencyGraph(
  dependencies: Record<string, string[]>,
): ProjectGraph {
  const names = new Set([
    ...Object.keys(dependencies),
    ...Object.values(dependencies).flat(),
  ]);

  return {
    dependencies: Object.fromEntries(
      Object.entries(dependencies).map(([source, targets]) => [
        source,
        targets.map((target) => ({ source, target, type: "static" })),
      ]),
    ),
    nodes: Object.fromEntries(
      [...names]
        .filter((name) => !name.startsWith("npm:"))
        .map((name) => [
          name,
          { data: { root: `packages/${name}` }, name, type: "lib" },
        ]),
    ),
  };
}

/** Builds a project graph from a name-to-root map. */
function buildGraph(roots: Record<string, string>): ProjectGraph {
  return {
    dependencies: {},
    nodes: Object.fromEntries(
      Object.entries(roots).map(([name, root]) => [
        name,
        { data: { root }, name, type: "lib" },
      ]),
    ),
  };
}

/** Builds a project graph from a name-to-root-and-tags map. */
function buildTaggedGraph(
  projects: Record<string, { root: string; tags?: string[] }>,
): ProjectGraph {
  return {
    dependencies: {},
    nodes: Object.fromEntries(
      Object.entries(projects).map(([name, project]) => [
        name,
        {
          data: {
            root: project.root,
            ...(project.tags && { tags: project.tags }),
          },
          name,
          type: "lib",
        },
      ]),
    ),
  };
}

describe(ProjectsService, () => {
  let service: ProjectsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [ProjectsService],
    }).compile();

    service = await module.resolve(ProjectsService);
  });

  it("is defined", () => {
    expect.hasAssertions();
    expect(service).toBeDefined();
  });

  describe("readProjectGraph", () => {
    it("reads the workspace project graph without exiting on error", async () => {
      expect.hasAssertions();

      await expect(service.readProjectGraph()).resolves.toStrictEqual({
        dependencies: {},
        nodes: {},
      });
      expect(createProjectGraphAsync).toHaveBeenCalledWith({
        exitOnError: false,
      });
    });
  });

  describe("readProjects", () => {
    it("lists every project the graph knows, sorted by name", () => {
      expect.hasAssertions();

      const graph = buildGraph({
        "callidescope-cli": "packages/ic-suite/callidescope/callidescope-cli",
        "callidescope-graph":
          "packages/ic-suite/callidescope/callidescope-graph",
      });

      expect(service.readProjects(graph)).toStrictEqual([
        {
          name: "callidescope-cli",
          root: "packages/ic-suite/callidescope/callidescope-cli",
          tags: [],
        },
        {
          name: "callidescope-graph",
          root: "packages/ic-suite/callidescope/callidescope-graph",
          tags: [],
        },
      ]);
    });

    it("keeps a project rooted at the workspace root", () => {
      expect.hasAssertions();

      expect(service.readProjects(buildGraph({ codebase: "." }))).toStrictEqual(
        [{ name: "codebase", root: ".", tags: [] }],
      );
    });

    it("reports the tags a project declares, and none for one that declares no tags", () => {
      expect.hasAssertions();

      const graph = buildTaggedGraph({
        tagged: { root: "packages/tagged", tags: ["type:package"] },
        untagged: { root: "packages/untagged" },
      });

      expect(service.readProjects(graph)).toStrictEqual([
        { name: "tagged", root: "packages/tagged", tags: ["type:package"] },
        { name: "untagged", root: "packages/untagged", tags: [] },
      ]);
    });

    it("lists nothing for an empty graph", () => {
      expect.hasAssertions();
      expect(service.readProjects(buildGraph({}))).toStrictEqual([]);
    });
  });

  describe("resolveDirectories", () => {
    const graph = buildGraph({
      "callidescope-cli": "packages/ic-suite/callidescope/callidescope-cli",
      "callidescope-graph": "packages/ic-suite/callidescope/callidescope-graph",
      validation: "tools/validation",
    });

    it("resolves each name to its workspace-relative root", () => {
      expect.hasAssertions();

      expect(
        service.resolveDirectories({
          graph,
          projectNames: ["validation", "callidescope-cli"],
        }),
      ).toStrictEqual({
        directories: [
          "packages/ic-suite/callidescope/callidescope-cli",
          "tools/validation",
        ],
        knownNames: ["callidescope-cli", "callidescope-graph", "validation"],
        knownTags: [],
        projectNames: ["callidescope-cli", "validation"],
        unknownNames: [],
        unmatchedTags: [],
      });
    });

    it("sorts and deduplicates the directories it resolved", () => {
      expect.hasAssertions();

      expect(
        service.resolveDirectories({
          graph,
          projectNames: [
            "callidescope-graph",
            "callidescope-cli",
            "callidescope-graph",
          ],
        }).directories,
      ).toStrictEqual([
        "packages/ic-suite/callidescope/callidescope-cli",
        "packages/ic-suite/callidescope/callidescope-graph",
      ]);
    });

    it("collects the names the graph does not know", () => {
      expect.hasAssertions();

      expect(
        service.resolveDirectories({
          graph,
          projectNames: ["callidescope-cli", "callidescope-nix", "typo"],
        }),
      ).toStrictEqual({
        directories: ["packages/ic-suite/callidescope/callidescope-cli"],
        knownNames: ["callidescope-cli", "callidescope-graph", "validation"],
        knownTags: [],
        projectNames: ["callidescope-cli"],
        unknownNames: ["callidescope-nix", "typo"],
        unmatchedTags: [],
      });
    });

    it("resolves nothing when it was given nothing", () => {
      expect.hasAssertions();

      expect(
        service.resolveDirectories({ graph, projectNames: [] }),
      ).toStrictEqual({
        directories: [],
        knownNames: ["callidescope-cli", "callidescope-graph", "validation"],
        knownTags: [],
        projectNames: [],
        unknownNames: [],
        unmatchedTags: [],
      });
    });
  });

  describe("resolveDirectories by tag", () => {
    const graph = buildTaggedGraph({
      affirmancy: {
        root: "applications/affirmancy",
        tags: ["language:python", "type:application"],
      },
      "callidescope-cli": {
        root: "packages/ic-suite/callidescope/callidescope-cli",
        tags: ["language:typescript", "type:package"],
      },
      "callidescope-graph": {
        root: "packages/ic-suite/callidescope/callidescope-graph",
        tags: ["language:typescript", "type:package"],
      },
      lexico: {
        root: "applications/lexico",
        tags: ["language:typescript", "type:application"],
      },
      untagged: { root: "packages/untagged" },
    });

    it("resolves every project carrying the tag", () => {
      expect.hasAssertions();

      expect(
        service.resolveDirectories({ graph, tags: ["type:application"] })
          .directories,
      ).toStrictEqual(["applications/affirmancy", "applications/lexico"]);
    });

    it("matches a project carrying ANY of the tags rather than all of them", () => {
      expect.hasAssertions();

      // No project is both an application and a package, so requiring every
      // tag would resolve nothing at all.
      expect(
        service.resolveDirectories({
          graph,
          tags: ["type:application", "type:package"],
        }).directories,
      ).toStrictEqual([
        "applications/affirmancy",
        "applications/lexico",
        "packages/ic-suite/callidescope/callidescope-cli",
        "packages/ic-suite/callidescope/callidescope-graph",
      ]);
    });

    it("resolves a project matched by two tags once", () => {
      expect.hasAssertions();

      expect(
        service.resolveDirectories({
          graph,
          tags: ["language:typescript", "type:application"],
        }).directories,
      ).toStrictEqual([
        "applications/affirmancy",
        "applications/lexico",
        "packages/ic-suite/callidescope/callidescope-cli",
        "packages/ic-suite/callidescope/callidescope-graph",
      ]);
    });

    it("unions the tagged projects with the named ones", () => {
      expect.hasAssertions();

      expect(
        service.resolveDirectories({
          graph,
          projectNames: ["untagged"],
          tags: ["language:python"],
        }).directories,
      ).toStrictEqual(["applications/affirmancy", "packages/untagged"]);
    });

    it("resolves a project named and tagged at once only once", () => {
      expect.hasAssertions();

      expect(
        service.resolveDirectories({
          graph,
          projectNames: ["lexico"],
          tags: ["type:application"],
        }).directories,
      ).toStrictEqual(["applications/affirmancy", "applications/lexico"]);
    });

    it("collects the tags no project carries", () => {
      expect.hasAssertions();

      expect(
        service.resolveDirectories({
          graph,
          tags: ["type:package", "language:rust", "scope:absent"],
        }),
      ).toStrictEqual({
        directories: [
          "packages/ic-suite/callidescope/callidescope-cli",
          "packages/ic-suite/callidescope/callidescope-graph",
        ],
        knownNames: [
          "affirmancy",
          "callidescope-cli",
          "callidescope-graph",
          "lexico",
          "untagged",
        ],
        knownTags: [
          "language:python",
          "language:typescript",
          "type:application",
          "type:package",
        ],
        projectNames: ["callidescope-cli", "callidescope-graph"],
        unknownNames: [],
        unmatchedTags: ["language:rust", "scope:absent"],
      });
    });

    it("reports every tag the workspace carries, sorted and deduplicated", () => {
      expect.hasAssertions();

      expect(
        service.resolveDirectories({ graph, tags: ["type:package"] }).knownTags,
      ).toStrictEqual([
        "language:python",
        "language:typescript",
        "type:application",
        "type:package",
      ]);
    });
  });

  describe("toDirectories", () => {
    it("maps names to roots, dropping one the graph does not know", () => {
      expect.hasAssertions();

      expect(
        service.toDirectories({
          graph: buildGraph({ alpha: "packages/alpha" }),
          projectNames: ["alpha", "absent"],
        }),
      ).toStrictEqual(["packages/alpha"]);
    });
  });

  describe("resolveDependencyClosure", () => {
    it("includes the project itself", () => {
      expect.hasAssertions();

      expect(
        service.resolveDependencyClosure({
          graph: buildDependencyGraph({ alpha: [] }),
          projectNames: ["alpha"],
        }),
      ).toStrictEqual(["alpha"]);
    });

    it("follows dependencies transitively", () => {
      expect.hasAssertions();

      // alpha -> beta -> gamma, so tracing alpha must reach gamma: depth
      // flows downward, and a stack truncated at beta is not the stack.
      expect(
        service.resolveDependencyClosure({
          graph: buildDependencyGraph({
            alpha: ["beta"],
            beta: ["gamma"],
            gamma: [],
          }),
          projectNames: ["alpha"],
        }),
      ).toStrictEqual(["alpha", "beta", "gamma"]);
    });

    it("never follows dependents, only dependencies", () => {
      expect.hasAssertions();

      expect(
        service.resolveDependencyClosure({
          graph: buildDependencyGraph({ alpha: ["beta"], beta: [] }),
          projectNames: ["beta"],
        }),
      ).toStrictEqual(["beta"]);
    });

    it("drops external npm dependencies", () => {
      expect.hasAssertions();

      expect(
        service.resolveDependencyClosure({
          graph: buildDependencyGraph({ alpha: ["npm:typescript", "beta"] }),
          projectNames: ["alpha"],
        }),
      ).toStrictEqual(["alpha", "beta"]);
    });

    it("terminates on a dependency cycle", () => {
      expect.hasAssertions();

      expect(
        service.resolveDependencyClosure({
          graph: buildDependencyGraph({ alpha: ["beta"], beta: ["alpha"] }),
          projectNames: ["alpha"],
        }),
      ).toStrictEqual(["alpha", "beta"]);
    });

    it("merges the closures of several projects, without repeating one", () => {
      expect.hasAssertions();

      expect(
        service.resolveDependencyClosure({
          graph: buildDependencyGraph({
            alpha: ["shared"],
            beta: ["shared"],
            shared: [],
          }),
          projectNames: ["beta", "alpha"],
        }),
      ).toStrictEqual(["alpha", "beta", "shared"]);
    });

    it("ignores a name the graph does not know", () => {
      expect.hasAssertions();

      expect(
        service.resolveDependencyClosure({
          graph: buildDependencyGraph({ alpha: [] }),
          projectNames: ["alpha", "absent"],
        }),
      ).toStrictEqual(["alpha"]);
    });
  });
});
