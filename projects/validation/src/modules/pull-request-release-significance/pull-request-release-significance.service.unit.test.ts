import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { PullRequestReleaseSignificanceService } from "./pull-request-release-significance.service";

import type {
  ConventionalSubject,
  PullRequestCommit,
  ReleaseRule,
} from "./pull-request-release-significance.types";

/** What the mocked `require` hands back, or throws when it is an error. */
let releaseConfig: unknown;

vi.mock("node:module", () => ({
  createRequire: () => (): unknown => {
    if (releaseConfig instanceof Error) {
      throw releaseConfig;
    }

    return releaseConfig;
  },
}));

/** The `releaseRules` this repository's own `release.config.cjs` declares. */
const RELEASE_RULES: ReleaseRule[] = [
  { breaking: true, release: "major" },
  { release: "patch", revert: true },
  { release: "minor", type: "feat" },
  { release: "patch", type: "fix" },
  { release: "patch", type: "perf" },
  { release: false, type: "docs" },
  { release: false, type: "style" },
  { release: "patch", type: "refactor" },
  { release: false, type: "test" },
  { release: "patch", type: "build" },
  { release: false, type: "ci" },
  { release: false, type: "chore" },
  { release: false, scope: "no-release" },
];

/** A `release.config.cjs` document naming these `releaseRules`. */
const releaseConfigDocument = (releaseRules: ReleaseRule[]): unknown => ({
  plugins: [["@semantic-release/commit-analyzer", { releaseRules }]],
});

/** One commit, parsed the way the service itself would parse it. */
const commit = (
  service: PullRequestReleaseSignificanceService,
  sha: string,
  subject: string,
  body = "",
): PullRequestCommit => ({
  convention: service.parseConventionalSubject(subject, body),
  sha,
  subject,
});

/** A title, parsed the way the service itself would parse it — never undefined. */
const title = (
  service: PullRequestReleaseSignificanceService,
  subject: string,
): ConventionalSubject => {
  const convention = service.parseConventionalSubject(subject);

  if (convention === undefined) {
    throw new Error(`Expected "${subject}" to parse as conventional`);
  }

  return convention;
};

describe(PullRequestReleaseSignificanceService, () => {
  let service: PullRequestReleaseSignificanceService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [PullRequestReleaseSignificanceService],
    }).compile();

    service = await module.resolve(PullRequestReleaseSignificanceService);
  });

  beforeEach(() => {
    releaseConfig = releaseConfigDocument(RELEASE_RULES);
  });

  it("is defined", () => {
    expect.hasAssertions();
    expect(service).toBeDefined();
  });

  describe("parseConventionalSubject", () => {
    it.each([
      [
        "a plain conventional subject",
        "feat(lexico): add moon phases",
        { breaking: false, scopes: ["lexico"], type: "feat" },
      ],
      [
        "several scopes",
        "fix(lexico,caelundas): resolve timeout",
        { breaking: false, scopes: ["lexico", "caelundas"], type: "fix" },
      ],
      [
        "no scope",
        "chore: tidy up",
        { breaking: false, scopes: [], type: "chore" },
      ],
      [
        "a breaking marker",
        "feat(api)!: redesign auth",
        { breaking: true, scopes: ["api"], type: "feat" },
      ],
    ])("reads %s", (_description, subject, expected) => {
      expect.hasAssertions();
      expect(service.parseConventionalSubject(subject)).toStrictEqual(expected);
    });

    it("returns undefined for a subject that does not parse", () => {
      expect.hasAssertions();
      expect(
        service.parseConventionalSubject("Merge branch 'main' into feature"),
      ).toBeUndefined();
    });

    it("reads a BREAKING CHANGE footer as breaking even without a marker", () => {
      expect.hasAssertions();

      const convention = service.parseConventionalSubject(
        "feat(api): redesign auth",
        "BREAKING CHANGE: auth endpoints now require OAuth2",
      );

      expect(convention?.breaking).toBe(true);
    });
  });

  describe("describeError", () => {
    it.each([
      ["an Error", new Error("boom"), "boom"],
      ["a non-Error value", "boom", "boom"],
    ])("reads %s", (_description, error, expected) => {
      expect.hasAssertions();
      expect(service.describeError(error)).toBe(expected);
    });
  });

  describe("readReleaseRules", () => {
    it("reads the releaseRules the commit-analyzer plugin declares", () => {
      expect.hasAssertions();
      expect(service.readReleaseRules()).toStrictEqual(RELEASE_RULES);
    });

    it("throws when the commit-analyzer plugin is missing", () => {
      expect.hasAssertions();

      releaseConfig = { plugins: [] };

      expect(() => service.readReleaseRules()).toThrow(
        /commit-analyzer plugin/u,
      );
    });
  });

  describe("significanceRank", () => {
    it.each([
      ["a breaking subject", { breaking: true, scopes: [], type: "fix" }, 3],
      ["a feat", { breaking: false, scopes: [], type: "feat" }, 2],
      ["a fix", { breaking: false, scopes: [], type: "fix" }, 1],
      ["a revert", { breaking: false, scopes: [], type: "revert" }, 1],
      ["a chore", { breaking: false, scopes: [], type: "chore" }, 0],
      ["an unrecognized type", { breaking: false, scopes: [], type: "wip" }, 0],
      [
        "an unknown release rule level",
        { breaking: false, scopes: [], type: "custom" },
        0,
      ],
    ])("ranks %s", (_description, subject, expected) => {
      expect.hasAssertions();

      const rules: ReleaseRule[] = [
        ...RELEASE_RULES,
        { release: false, type: "custom" },
      ];

      expect(service.significanceRank(subject, rules)).toBe(expected);
    });
  });

  describe("resolveFromDocument", () => {
    it("reads the title and commits out of a gh pr view document", () => {
      expect.hasAssertions();

      const document = JSON.stringify({
        commits: [
          {
            messageBody: "",
            messageHeadline: "feat(lexico): add moon phases",
            oid: "abcdef1234567890",
          },
        ],
        title: "feat(lexico): ✨ add moon phases",
      });

      expect(service.resolveFromDocument(document)).toStrictEqual({
        commits: [
          {
            convention: {
              breaking: false,
              scopes: ["lexico"],
              type: "feat",
            },
            sha: "abcdef1",
            subject: "feat(lexico): add moon phases",
          },
        ],
        resolved: true,
        title: "feat(lexico): ✨ add moon phases",
      });
    });

    it("falls back to default attributes when commit fields are not strings", () => {
      expect.hasAssertions();

      const document = JSON.stringify({
        commits: [
          {
            messageBody: 123,
            messageHeadline: null,
            oid: false,
          },
        ],
        title: "feat(lexico): ✨ add moon phases",
      });

      expect(service.resolveFromDocument(document)).toStrictEqual({
        commits: [
          {
            convention: undefined,
            sha: "",
            subject: "",
          },
        ],
        resolved: true,
        title: "feat(lexico): ✨ add moon phases",
      });
    });

    it("skips a commit whose subject does not parse", () => {
      expect.hasAssertions();

      const document = JSON.stringify({
        commits: [{ messageHeadline: "Merge branch 'main'", oid: "0000000" }],
        title: "chore(codebase): 🔧 merge",
      });

      const resolution = service.resolveFromDocument(document);

      expect(resolution.resolved).toBe(true);
      expect(resolution.resolved && resolution.commits[0]).toStrictEqual({
        convention: undefined,
        sha: "0000000",
        subject: "Merge branch 'main'",
      });
    });

    it("reports a document that is not valid JSON", () => {
      expect.hasAssertions();

      const resolution = service.resolveFromDocument("not json");

      expect(resolution).toStrictEqual({
        failure: expect.stringContaining("Unable to parse") as unknown,
        resolved: false,
      });
    });

    it("reads an empty title and no commits from a document missing both", () => {
      expect.hasAssertions();
      expect(service.resolveFromDocument("{}")).toStrictEqual({
        commits: [],
        resolved: true,
        title: "",
      });
    });

    it("handles a non-object JSON document gracefully", () => {
      expect.hasAssertions();
      expect(service.resolveFromDocument('"not-an-object"')).toStrictEqual({
        commits: [],
        resolved: true,
        title: "",
      });
    });

    it("reads a blank subject and sha from a commit entry missing its fields", () => {
      expect.hasAssertions();

      const document = JSON.stringify({ commits: ["not a record", {}] });
      const resolution = service.resolveFromDocument(document);

      expect(resolution.resolved).toBe(true);
      expect(resolution.resolved && resolution.commits).toStrictEqual([
        { convention: undefined, sha: "", subject: "" },
        { convention: undefined, sha: "", subject: "" },
      ]);
    });
  });

  describe("checkSignificance", () => {
    it("passes when the title is at least as significant as every commit", () => {
      expect.hasAssertions();

      expect(
        service.checkSignificance({
          commits: [
            commit(service, "abc1234", "feat(lexico): add moon phases"),
            commit(service, "def5678", "test(lexico): cover moon phases"),
          ],
          releaseRules: RELEASE_RULES,
          titleConvention: title(service, "feat(lexico): add moon phases"),
        }).failures,
      ).toStrictEqual([]);
    });

    it("fails when a commit outranks the title, naming the commit and the minimum level", () => {
      expect.hasAssertions();

      const verdict = service.checkSignificance({
        commits: [
          commit(
            service,
            "44dd0cc",
            "feat(validation): check the pull request metadata",
          ),
        ],
        releaseRules: RELEASE_RULES,
        titleConvention: title(
          service,
          "ci(validation): validate pull request metadata",
        ),
      });

      expect(verdict.failures).toHaveLength(1);
      expect(verdict.failures[0]).toContain("44dd0cc");
      expect(verdict.failures[0]).toContain("minor");
      expect(verdict.failures[0]).toContain("feat");
    });

    it("fails on a breaking commit under a non-breaking title", () => {
      expect.hasAssertions();

      const verdict = service.checkSignificance({
        commits: [commit(service, "b0dc4a1", "feat(api)!: redesign auth")],
        releaseRules: RELEASE_RULES,
        titleConvention: title(service, "feat(api): redesign auth"),
      });

      expect(verdict.failures).toHaveLength(1);
      expect(verdict.failures[0]).toContain("major");
    });

    it("fails when no commit scope overlaps the title", () => {
      expect.hasAssertions();

      const verdict = service.checkSignificance({
        commits: [
          commit(
            service,
            "aaa1111",
            "feat(validation): add the release-significance check",
          ),
          commit(
            service,
            "bbb2222",
            "feat(synchronization): reconcile pull request labels",
          ),
          commit(
            service,
            "ccc3333",
            "fix(synchronization): patch pull request labels",
          ),
        ],
        releaseRules: RELEASE_RULES,
        titleConvention: title(
          service,
          "feat(validation): add the release-significance check",
        ),
      });

      expect(verdict.failures).toHaveLength(1);
      expect(verdict.failures[0]).toContain(
        'Scope "synchronization" is used in commits bbb2222, ccc3333',
      );
    });

    it("passes when at least one commit scope overlaps the title", () => {
      expect.hasAssertions();

      const verdict = service.checkSignificance({
        commits: [
          commit(
            service,
            "aaa1111",
            "feat(validation): add the release-significance check",
          ),
          commit(
            service,
            "bbb2222",
            "feat(synchronization): reconcile pull request labels",
          ),
          commit(
            service,
            "ccc3333",
            "fix(synchronization): patch pull request labels",
          ),
        ],
        releaseRules: RELEASE_RULES,
        titleConvention: title(
          service,
          "feat(validation,synchronization): add the release-significance check",
        ),
      });

      expect(verdict.failures).toStrictEqual([]);
    });

    it("ignores a commit whose subject does not parse as conventional", () => {
      expect.hasAssertions();

      const verdict = service.checkSignificance({
        commits: [commit(service, "ccc3333", "Merge branch 'main'")],
        releaseRules: RELEASE_RULES,
        titleConvention: title(service, "chore(codebase): tidy up"),
      });

      expect(verdict.failures).toStrictEqual([]);
    });
  });
});
