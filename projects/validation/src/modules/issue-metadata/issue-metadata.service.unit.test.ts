import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { IssueMetadataService } from "./issue-metadata.service";

import type {
  IssueFormAnswers,
  IssueMetadata,
  MetadataVerdict,
} from "./issue-metadata.types";

/** A rendered `issue.yml` body naming this Type and Scope. */
const formBody = (type: string, scope: string): string =>
  [
    "### Type",
    "",
    type,
    "",
    "### Scope",
    "",
    scope,
    "",
    "### Description",
    "",
    "Something broke.",
    "",
  ].join("\n");

/** An issue whose labels agree with a template submission of feat/lexico. */
const validMetadata: IssueMetadata = {
  body: formBody("feat", "lexico"),
  labelNames: ["scope:lexico", "source:human", "type:feat"],
};

describe(IssueMetadataService, () => {
  let service: IssueMetadataService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [IssueMetadataService],
    }).compile();

    service = await module.resolve(IssueMetadataService);
  });

  it("is defined", () => {
    expect.hasAssertions();
    expect(service).toBeDefined();
  });

  /** Runs the check for one issue's metadata. */
  const check = (metadata: IssueMetadata, issueNumber = "7"): MetadataVerdict =>
    service.checkMetadata({
      formAnswers: service.parseFormAnswers(metadata.body),
      issueNumber,
      metadata,
    });

  describe("parseFormAnswers", () => {
    it("reads both answers from a rendered submission", () => {
      expect.hasAssertions();
      expect(
        service.parseFormAnswers(formBody("feat", "lexico")),
      ).toStrictEqual({
        scope: "lexico",
        type: "feat",
      });
    });

    it("reads nothing from a body with no form markers", () => {
      expect.hasAssertions();
      expect(
        service.parseFormAnswers("Just a plain description, no template."),
      ).toStrictEqual({});
    });

    it.each([
      ["Type", { scope: "lexico" } satisfies IssueFormAnswers],
      ["Scope", { type: "feat" } satisfies IssueFormAnswers],
    ])("reads only the field present when %s is missing", (field, expected) => {
      expect.hasAssertions();

      const body =
        field === "Type"
          ? ["### Scope", "", "lexico", ""].join("\n")
          : ["### Type", "", "feat", ""].join("\n");

      expect(service.parseFormAnswers(body)).toStrictEqual(expected);
    });

    it("treats an unfilled optional field marker as no answer", () => {
      expect.hasAssertions();

      const body = ["### Type", "", "_No response_", ""].join("\n");

      expect(service.parseFormAnswers(body)).toStrictEqual({});
    });

    it("tolerates CRLF line endings", () => {
      expect.hasAssertions();

      const body = "### Type\r\n\r\nfix\r\n\r\n### Scope\r\n\r\ntools\r\n";

      expect(service.parseFormAnswers(body)).toStrictEqual({
        scope: "tools",
        type: "fix",
      });
    });
  });

  describe("checkMetadata", () => {
    it("passes an issue whose labels agree with its template submission", () => {
      expect.hasAssertions();
      expect(check(validMetadata)).toStrictEqual({
        failures: [],
        remediationCommands: [],
      });
    });

    it("reports a type label that disagrees with the form answer", () => {
      expect.hasAssertions();
      expect(
        check({
          ...validMetadata,
          labelNames: ["scope:lexico", "source:human", "type:fix"],
        }),
      ).toStrictEqual({
        failures: [
          "❌ Expected exactly one type label: type:feat (found: type:fix)",
        ],
        remediationCommands: [
          "gh issue edit 7 --remove-label type:fix",
          "gh issue edit 7 --add-label type:feat",
        ],
      });
    });

    it("reports an extra type label without an add command when the expected one is present", () => {
      expect.hasAssertions();
      expect(
        check({
          ...validMetadata,
          labelNames: [
            "scope:lexico",
            "source:human",
            "type:feat",
            "type:chore",
          ],
        }),
      ).toStrictEqual({
        failures: [
          "❌ Expected exactly one type label: type:feat (found: type:feat type:chore)",
        ],
        remediationCommands: ["gh issue edit 7 --remove-label type:chore"],
      });
    });

    it("reports a missing type label when the form named one", () => {
      expect.hasAssertions();
      expect(
        check({
          ...validMetadata,
          labelNames: ["scope:lexico", "source:human"],
        }),
      ).toStrictEqual({
        failures: [
          "❌ Expected exactly one type label: type:feat (found: none)",
        ],
        remediationCommands: ["gh issue edit 7 --add-label type:feat"],
      });
    });

    it("accepts any single type label when the body has no form markers", () => {
      expect.hasAssertions();
      expect(
        check({
          body: "Plain issue, no template.",
          labelNames: ["scope:lexico", "source:agent", "type:chore"],
        }),
      ).toStrictEqual({ failures: [], remediationCommands: [] });
    });

    it("reports no type label when the body has no form markers", () => {
      expect.hasAssertions();
      expect(
        check({
          body: "Plain issue, no template.",
          labelNames: ["scope:lexico", "source:agent"],
        }),
      ).toStrictEqual({
        failures: ["❌ Expected exactly one type label (found: none)"],
        remediationCommands: [],
      });
    });

    it("reports two type labels when the body has no form markers", () => {
      expect.hasAssertions();
      expect(
        check({
          body: "Plain issue, no template.",
          labelNames: [
            "scope:lexico",
            "source:agent",
            "type:chore",
            "type:fix",
          ],
        }).failures,
      ).toStrictEqual([
        "❌ Expected exactly one type label (found: type:chore type:fix)",
      ]);
    });

    it("reports a missing scope label when the form named one", () => {
      expect.hasAssertions();
      expect(
        check({ ...validMetadata, labelNames: ["source:human", "type:feat"] }),
      ).toStrictEqual({
        failures: ["❌ Missing scope label: scope:lexico"],
        remediationCommands: ["gh issue edit 7 --add-label scope:lexico"],
      });
    });

    it("accepts any scope label when the form named none but one is present", () => {
      expect.hasAssertions();
      expect(
        check({
          body: "Plain issue, no template.",
          labelNames: ["scope:lexico", "source:agent", "type:chore"],
        }).failures,
      ).toStrictEqual([]);
    });

    it("reports no scope label at all when the body has no form markers", () => {
      expect.hasAssertions();
      expect(
        check({
          body: "Plain issue, no template.",
          labelNames: ["source:agent", "type:chore"],
        }),
      ).toStrictEqual({
        failures: ["❌ No scope label"],
        remediationCommands: [],
      });
    });

    it("offers two alternatives for a missing source label", () => {
      expect.hasAssertions();
      expect(
        check({ ...validMetadata, labelNames: ["scope:lexico", "type:feat"] }),
      ).toStrictEqual({
        failures: [
          "❌ Expected exactly one source label: source:agent or source:human (found: none)",
        ],
        remediationCommands: [
          "add exactly one source label, either:",
          "gh issue edit 7 --add-label source:agent",
          "gh issue edit 7 --add-label source:human",
        ],
      });
    });

    it("reports two source labels", () => {
      expect.hasAssertions();
      expect(
        check({
          ...validMetadata,
          labelNames: [...validMetadata.labelNames, "source:agent"],
        }).failures,
      ).toStrictEqual([
        "❌ Expected exactly one source label: source:agent or source:human (found: source:human source:agent)",
      ]);
    });

    it("collects every failure at once", () => {
      expect.hasAssertions();
      expect(
        check({ body: "Plain issue, no template.", labelNames: [] }).failures,
      ).toStrictEqual([
        "❌ Expected exactly one type label (found: none)",
        "❌ No scope label",
        "❌ Expected exactly one source label: source:agent or source:human (found: none)",
      ]);
    });

    it("names the issue number it was given", () => {
      expect.hasAssertions();
      expect(
        check(
          { ...validMetadata, labelNames: ["scope:lexico", "type:feat"] },
          "<number>",
        ).remediationCommands,
      ).toStrictEqual([
        "add exactly one source label, either:",
        "gh issue edit <number> --add-label source:agent",
        "gh issue edit <number> --add-label source:human",
      ]);
    });
  });

  describe("groupLabels", () => {
    it("sorts labels into their families", () => {
      expect.hasAssertions();
      expect(
        service.groupLabels([
          "scope:lexico",
          "source:human",
          "type:feat",
          "status:needs-triage",
        ]),
      ).toStrictEqual({
        scopeLabels: ["scope:lexico"],
        sourceLabels: ["source:human"],
        typeLabels: ["type:feat"],
      });
    });
  });

  describe("resolveFromDocument", () => {
    it("reads the body and labels", () => {
      expect.hasAssertions();
      expect(
        service.resolveFromDocument(
          JSON.stringify({
            body: formBody("feat", "lexico"),
            labels: [{ name: "type:feat" }],
          }),
        ),
      ).toStrictEqual({
        metadata: {
          body: formBody("feat", "lexico"),
          labelNames: ["type:feat"],
        },
        resolved: true,
      });
    });

    it("reports a document that is not JSON", () => {
      expect.hasAssertions();
      expect(service.resolveFromDocument("{").resolved).toBe(false);
    });

    it("names the gh issue view output in the failure", () => {
      expect.hasAssertions();

      const resolution = service.resolveFromDocument("not json");

      expect(resolution.resolved ? "" : resolution.failure).toContain(
        "❌ Unable to parse the gh issue view output: ",
      );
    });

    it("treats a document that is not an object as empty metadata", () => {
      expect.hasAssertions();
      expect(service.resolveFromDocument("null")).toStrictEqual({
        metadata: { body: "", labelNames: [] },
        resolved: true,
      });
    });

    it("reads plain string labels too, dropping entries with no readable name", () => {
      expect.hasAssertions();
      expect(
        service.resolveFromDocument(
          JSON.stringify({
            body: "",
            labels: [" type:feat ", 42, { tint: "red" }],
          }),
        ),
      ).toStrictEqual({
        metadata: { body: "", labelNames: ["type:feat"] },
        resolved: true,
      });
    });
  });

  describe("resolveFromEnvironment", () => {
    it("reads the body and label objects", () => {
      expect.hasAssertions();
      expect(
        service.resolveFromEnvironment({
          body: formBody("feat", "lexico"),
          labelsDocument: '[{"name":"type:feat"}]',
        }),
      ).toStrictEqual({
        metadata: {
          body: formBody("feat", "lexico"),
          labelNames: ["type:feat"],
        },
        resolved: true,
      });
    });

    it("reports a labels document that is not JSON", () => {
      expect.hasAssertions();

      const resolution = service.resolveFromEnvironment({
        body: "",
        labelsDocument: "not json",
      });

      expect(resolution.resolved ? "" : resolution.failure).toContain(
        "❌ Unable to parse ISSUE_LABELS as JSON: ",
      );
    });

    it("stops parent depth calculation when parent issue is not in issueMap", () => {
      expect.hasAssertions();

      const verdict = service.checkBulkIssues([
        {
          body: "Part of #999\n### Scope\nlexico\n### Type\nfeat\n### Source\nagent",
          labels: [
            { name: "type:feat" },
            { name: "scope:lexico" },
            { name: "source:agent" },
          ],
          number: 1,
          title: "feat(lexico): child issue",
        },
      ]);

      expect(verdict.failureCount).toBe(0);
      expect(verdict.failures).toHaveLength(0);
      expect(verdict.hierarchyViolations).toHaveLength(0);
    });

    it("requires the labels document to be an array", () => {
      expect.hasAssertions();
      expect(
        service.resolveFromEnvironment({ body: "", labelsDocument: "{}" }),
      ).toStrictEqual({
        failure: "❌ Expected ISSUE_LABELS to be a JSON array",
        resolved: false,
      });
    });
  });

  describe("describeError", () => {
    it("reads an Error's message", () => {
      expect.hasAssertions();
      expect(service.describeError(new Error("broken"))).toBe("broken");
    });

    it("stringifies anything else", () => {
      expect.hasAssertions();
      expect(service.describeError("broken")).toBe("broken");
    });
  });

  describe("extractParentIssueNumber", () => {
    it.each([
      ["Part of #123", 123],
      ["Parent: #456", 456],
      ["Parent issue: #789", 789],
      ["### Parent\n#999", 999],
    ])("extracts parent from '%s'", (body, expected) => {
      expect.hasAssertions();
      expect(service.extractParentIssueNumber(body)).toBe(expected);
    });

    it("returns undefined when no parent pattern exists", () => {
      expect.hasAssertions();
      expect(
        service.extractParentIssueNumber("Just a regular issue body"),
      ).toBeUndefined();
    });
  });

  describe("resolveIssueReleaseLevel", () => {
    it("identifies breaking changes as major release level", () => {
      expect.hasAssertions();
      expect(
        service.resolveIssueReleaseLevel({
          body: "BREAKING CHANGE: changes everything",
          labelNames: ["type:feat"],
          title: "feat(auth)!: break API",
        }),
      ).toStrictEqual({ level: "major", rank: 3, type: "feat" });
    });

    it("identifies feat as minor release level", () => {
      expect.hasAssertions();
      expect(
        service.resolveIssueReleaseLevel({
          body: "description",
          labelNames: ["type:feat"],
          title: "feat(auth): add login",
        }),
      ).toStrictEqual({ level: "minor", rank: 2, type: "feat" });
    });

    it("identifies fix as patch release level", () => {
      expect.hasAssertions();
      expect(
        service.resolveIssueReleaseLevel({
          body: "description",
          labelNames: ["type:fix"],
          title: "fix(auth): resolve bug",
        }),
      ).toStrictEqual({ level: "patch", rank: 1, type: "fix" });
    });

    it("identifies chore/docs as none release level", () => {
      expect.hasAssertions();
      expect(
        service.resolveIssueReleaseLevel({
          body: "description",
          labelNames: ["type:docs"],
          title: "docs(readme): update docs",
        }),
      ).toStrictEqual({ level: "none", rank: 0, type: "docs" });
    });

    it("falls back to label when title is non-conventional", () => {
      expect.hasAssertions();
      expect(
        service.resolveIssueReleaseLevel({
          body: "description",
          labelNames: ["type:feat"],
          title: "Non conventional title",
        }),
      ).toStrictEqual({ level: "minor", rank: 2, type: "feat" });
    });

    it("falls back to chore when title is non-conventional and has no type label", () => {
      expect.hasAssertions();
      expect(
        service.resolveIssueReleaseLevel({
          body: "description",
          labelNames: [],
          title: "Non conventional title",
        }),
      ).toStrictEqual({ level: "none", rank: 0, type: "chore" });
    });

    it("handles unknown type by falling back to none level and zero rank", () => {
      expect.hasAssertions();
      expect(
        service.resolveIssueReleaseLevel({
          body: "description",
          labelNames: ["type:unknown-custom"],
          title: "unknown-custom(readme): update docs",
        }),
      ).toStrictEqual({ level: "none", rank: 0, type: "unknown-custom" });
    });

    it("falls back to feat when breaking change has non-conventional title", () => {
      expect.hasAssertions();
      expect(
        service.resolveIssueReleaseLevel({
          body: "BREAKING CHANGE: something changed",
          labelNames: [],
          title: "Non conventional title",
        }),
      ).toStrictEqual({ level: "major", rank: 3, type: "feat" });
    });
  });

  describe("checkHierarchy", () => {
    it("passes valid child under parent with same or higher release significance", () => {
      expect.hasAssertions();

      const issues = [
        {
          body: "Spec definition",
          labels: [
            { name: "type:feat" },
            { name: "scope:auth" },
            { name: "source:agent" },
          ],
          number: 1,
          title: "feat(auth): add oauth",
        },
        {
          body: "Part of #1",
          labels: [
            { name: "type:fix" },
            { name: "scope:auth" },
            { name: "source:agent" },
          ],
          number: 2,
          title: "fix(auth): fix route",
        },
      ];

      expect(service.checkHierarchy(issues)).toStrictEqual([]);
    });

    it("reports violation when child release significance exceeds parent", () => {
      expect.hasAssertions();

      const issues = [
        {
          body: "Fix bug",
          labels: [
            { name: "type:fix" },
            { name: "scope:auth" },
            { name: "source:agent" },
          ],
          number: 1,
          title: "fix(auth): fix token bug",
        },
        {
          body: "Part of #1",
          labels: [
            { name: "type:feat" },
            { name: "scope:auth" },
            { name: "source:agent" },
          ],
          number: 2,
          title: "feat(auth): add whole new subsystem",
        },
      ];

      const violations = service.checkHierarchy(issues);

      expect(violations).toHaveLength(1);
      expect(violations[0]?.message).toContain("exceeds parent #1");
    });

    it("reports violation when hierarchy depth exceeds MAX_HIERARCHY_DEPTH (3)", () => {
      expect.hasAssertions();

      const issues = [
        {
          body: "Root Spec",
          labels: [
            { name: "type:feat" },
            { name: "scope:auth" },
            { name: "source:agent" },
          ],
          number: 1,
          title: "feat(auth): spec",
        },
        {
          body: "Part of #1",
          labels: [
            { name: "type:feat" },
            { name: "scope:auth" },
            { name: "source:agent" },
          ],
          number: 2,
          title: "feat(auth): pr parent",
        },
        {
          body: "Part of #2",
          labels: [
            { name: "type:feat" },
            { name: "scope:auth" },
            { name: "source:agent" },
          ],
          number: 3,
          title: "feat(auth): commit child",
        },
        {
          body: "Part of #3",
          labels: [
            { name: "type:feat" },
            { name: "scope:auth" },
            { name: "source:agent" },
          ],
          number: 4,
          title: "feat(auth): deep child 4",
        },
      ];

      const violations = service.checkHierarchy(issues);

      expect(violations).toHaveLength(1);
      expect(violations[0]?.message).toContain(
        "Hierarchy depth of issue #4 is 4, exceeding maximum depth of 3",
      );
    });

    it("handles circular parent links gracefully without infinite loop", () => {
      expect.hasAssertions();

      const issues = [
        {
          body: "Part of #2",
          labels: [
            { name: "type:feat" },
            { name: "scope:auth" },
            { name: "source:agent" },
          ],
          number: 1,
          title: "feat(auth): issue 1",
        },
        {
          body: "Part of #1",
          labels: [
            { name: "type:feat" },
            { name: "scope:auth" },
            { name: "source:agent" },
          ],
          number: 2,
          title: "feat(auth): issue 2",
        },
      ];

      expect(service.checkHierarchy(issues)).toBeDefined();
    });

    it("ignores parent references to issues not present in the issue set", () => {
      expect.hasAssertions();

      const issues = [
        {
          body: "Part of #999",
          labels: [
            { name: "type:feat" },
            { name: "scope:auth" },
            { name: "source:agent" },
          ],
          number: 1,
          title: "feat(auth): child of external",
        },
      ];

      expect(service.checkHierarchy(issues)).toStrictEqual([]);
    });
  });

  describe("checkBulkIssues", () => {
    it("reports compliant verdict when all issues and relationships are valid", () => {
      expect.hasAssertions();

      const issues = [
        {
          body: formBody("feat", "lexico"),
          labels: [
            { name: "type:feat" },
            { name: "scope:lexico" },
            { name: "source:agent" },
          ],
          number: 10,
          title: "feat(lexico): ✨ feature",
        },
      ];

      expect(service.checkBulkIssues(issues)).toStrictEqual({
        failureCount: 0,
        failures: [],
        hierarchyViolations: [],
        totalIssues: 1,
      });
    });

    it("aggregates metadata and hierarchy violations across multiple issues", () => {
      expect.hasAssertions();

      const issues = [
        {
          body: "Plain body with no scope label",
          labels: [{ name: "type:chore" }, { name: "source:agent" }],
          number: 10,
          title: "chore(ci): update",
        },
        {
          body: "Part of #10",
          labels: [
            { name: "type:feat" },
            { name: "scope:ci" },
            { name: "source:agent" },
          ],
          number: 11,
          title: "feat(ci): new feature",
        },
      ];

      const verdict = service.checkBulkIssues(issues);

      expect(verdict.totalIssues).toBe(2);
      expect(verdict.failureCount).toBeGreaterThan(0);
      expect(
        verdict.failures.some((f) =>
          f.includes("Issue #10: ❌ No scope label"),
        ),
      ).toBe(true);
      expect(
        verdict.failures.some((f) => f.includes("Hierarchy violation:")),
      ).toBe(true);
    });
  });
});
