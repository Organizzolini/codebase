import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { PullRequestMetadataService } from "./pull-request-metadata.service";

import type {
  MetadataVerdict,
  PullRequestMetadata,
} from "./pull-request-metadata.types";

/** A pull request whose metadata agrees with a `feat(lexico)` title. */
const validMetadata: PullRequestMetadata = {
  assigneeLogins: ["JimmyPaolini"],
  labelNames: ["scope:lexico", "source:agent", "type:feat"],
  title: "feat(lexico): ✨ add a user profile page",
};

describe(PullRequestMetadataService, () => {
  let service: PullRequestMetadataService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [PullRequestMetadataService],
    }).compile();

    service = await module.resolve(PullRequestMetadataService);
  });

  it("is defined", () => {
    expect.hasAssertions();
    expect(service).toBeDefined();
  });

  /** Runs every check against one pull request's metadata. */
  const check = (
    metadata: PullRequestMetadata,
    pullRequestNumber = "7",
  ): MetadataVerdict => {
    const titleConvention = service.parseTitle(metadata.title);

    if (titleConvention === undefined) {
      throw new Error(`the title did not parse: ${metadata.title}`);
    }

    return service.checkMetadata({
      metadata,
      pullRequestNumber,
      titleConvention,
    });
  };

  describe("parseTitle", () => {
    it("reads the type and the single scope", () => {
      expect.hasAssertions();
      expect(service.parseTitle("feat(lexico): ✨ add a page")).toStrictEqual({
        scopes: ["lexico"],
        type: "feat",
      });
    });

    it.each([
      ["comma", "chore(deps,tools): 🔧 tidy"],
      ["slash", "chore(deps/tools): 🔧 tidy"],
    ])("splits several scopes on a %s", (_separator, title) => {
      expect.hasAssertions();
      expect(service.parseTitle(title)?.scopes).toStrictEqual([
        "deps",
        "tools",
      ]);
    });

    it("trims, lowercases, and de-duplicates the scopes", () => {
      expect.hasAssertions();
      expect(
        service.parseTitle("fix( Lexico , lexico ): 🐛 correct it")?.scopes,
      ).toStrictEqual(["lexico"]);
    });

    it("reads a title whose subject contains parentheses", () => {
      expect.hasAssertions();
      expect(
        service.parseTitle("fix(caelundas): 🐛 correct the angle (again)"),
      ).toStrictEqual({ scopes: ["caelundas"], type: "fix" });
    });

    it.each([
      ["a title with no scope", "chore: 🔧 tidy the workspace"],
      ["a breaking title with no scope", "feat!: ✨ change everything"],
    ])("reports no scope for %s", (_description, title) => {
      expect.hasAssertions();
      expect(service.parseTitle(title)?.scopes).toStrictEqual([]);
    });

    it.each([
      ["no colon", "feat lexico add a page"],
      ["no subject", "feat(lexico):"],
      ["an uppercase type", "Feat(lexico): ✨ add a page"],
    ])("refuses a title with %s", (_description, title) => {
      expect.hasAssertions();
      expect(service.parseTitle(title)).toBeUndefined();
    });
  });

  describe("resolveFromDocument", () => {
    it("reads the title, labels, and assignees", () => {
      expect.hasAssertions();
      expect(
        service.resolveFromDocument(
          JSON.stringify({
            assignees: [{ login: "JimmyPaolini" }],
            labels: [{ name: "type:feat" }],
            title: "feat(lexico): ✨ add a page",
          }),
        ),
      ).toStrictEqual({
        metadata: validMetadataFromDocument(),
        resolved: true,
      });
    });

    it("reports a document that is not JSON", () => {
      expect.hasAssertions();
      expect(service.resolveFromDocument("not json")).toMatchObject({
        resolved: false,
      });
    });

    it("names the gh pr view output in the failure", () => {
      expect.hasAssertions();

      const resolution = service.resolveFromDocument("{");

      expect(resolution.resolved ? "" : resolution.failure).toContain(
        "❌ Unable to parse the gh pr view output: ",
      );
    });

    it("treats a document that is not an object as empty metadata", () => {
      expect.hasAssertions();
      expect(service.resolveFromDocument("null")).toStrictEqual({
        metadata: { assigneeLogins: [], labelNames: [], title: "" },
        resolved: true,
      });
    });
  });

  describe("resolveFromEnvironment", () => {
    it("reads label and assignee objects", () => {
      expect.hasAssertions();
      expect(
        service.resolveFromEnvironment({
          assigneesDocument: '[{"login":"JimmyPaolini"}]',
          labelsDocument: '[{"name":"type:feat"}]',
          title: "feat(lexico): ✨ add a page",
        }),
      ).toStrictEqual({
        metadata: validMetadataFromDocument(),
        resolved: true,
      });
    });

    it("reads plain strings as names too", () => {
      expect.hasAssertions();
      expect(
        service.resolveFromEnvironment({
          assigneesDocument: '[" JimmyPaolini "]',
          labelsDocument: '[" type:feat "]',
          title: "feat(lexico): ✨ add a page",
        }),
      ).toStrictEqual({
        metadata: validMetadataFromDocument(),
        resolved: true,
      });
    });

    it("drops entries with no readable name", () => {
      expect.hasAssertions();
      expect(
        service.resolveFromEnvironment({
          assigneesDocument: "[null, 42]",
          labelsDocument: '[{"tint":"red"}]',
          title: "feat(lexico): ✨ add a page",
        }),
      ).toStrictEqual({
        metadata: {
          assigneeLogins: [],
          labelNames: [],
          title: "feat(lexico): ✨ add a page",
        },
        resolved: true,
      });
    });

    it.each([
      ["PULL_REQUEST_LABELS", "not json", "[]"],
      ["PULL_REQUEST_ASSIGNEES", "[]", "not json"],
    ])(
      "names %s when its document is not JSON",
      (variableName, labelsDocument, assigneesDocument) => {
        expect.hasAssertions();

        const resolution = service.resolveFromEnvironment({
          assigneesDocument,
          labelsDocument,
          title: "feat(lexico): ✨ add a page",
        });

        expect(resolution.resolved ? "" : resolution.failure).toBe(
          `❌ Unable to parse ${variableName} as JSON: ${jsonErrorMessage("not json")}`,
        );
      },
    );

    it.each([
      ["PULL_REQUEST_LABELS", "{}", "[]"],
      ["PULL_REQUEST_ASSIGNEES", "[]", "{}"],
    ])(
      "requires %s to be an array",
      (variableName, labelsDocument, assigneesDocument) => {
        expect.hasAssertions();

        const resolution = service.resolveFromEnvironment({
          assigneesDocument,
          labelsDocument,
          title: "feat(lexico): ✨ add a page",
        });

        expect(resolution.resolved ? "" : resolution.failure).toBe(
          `❌ Expected ${variableName} to be a JSON array`,
        );
      },
    );
  });

  describe("checkMetadata", () => {
    it("passes a pull request whose metadata agrees with its title", () => {
      expect.hasAssertions();
      expect(check(validMetadata)).toStrictEqual({
        failures: [],
        remediationCommands: [],
      });
    });

    it("reports a missing type label", () => {
      expect.hasAssertions();
      expect(
        check({
          ...validMetadata,
          labelNames: ["scope:lexico", "source:agent"],
        }),
      ).toStrictEqual({
        failures: [
          "❌ Expected exactly one type label: type:feat (found: none)",
        ],
        remediationCommands: ["gh pr edit 7 --add-label type:feat"],
      });
    });

    it("reports an extra type label and removes only the wrong one", () => {
      expect.hasAssertions();
      expect(
        check({
          ...validMetadata,
          labelNames: ["scope:lexico", "source:agent", "type:feat", "type:fix"],
        }),
      ).toStrictEqual({
        failures: [
          "❌ Expected exactly one type label: type:feat (found: type:feat type:fix)",
        ],
        remediationCommands: ["gh pr edit 7 --remove-label type:fix"],
      });
    });

    it("reports a missing scope label", () => {
      expect.hasAssertions();
      expect(
        check({ ...validMetadata, labelNames: ["source:agent", "type:feat"] }),
      ).toStrictEqual({
        failures: ["❌ Missing scope label: scope:lexico"],
        remediationCommands: ["gh pr edit 7 --add-label scope:lexico"],
      });
    });

    it("reports an unexpected scope label", () => {
      expect.hasAssertions();
      expect(
        check({
          ...validMetadata,
          labelNames: [
            "scope:lexico",
            "scope:tools",
            "source:agent",
            "type:feat",
          ],
        }),
      ).toStrictEqual({
        failures: ["❌ Unexpected scope label: scope:tools"],
        remediationCommands: ["gh pr edit 7 --remove-label scope:tools"],
      });
    });

    it("reports a title with no scope exactly once, and compares nothing", () => {
      expect.hasAssertions();
      expect(
        check({
          assigneeLogins: ["JimmyPaolini"],
          labelNames: ["scope:lexico", "source:agent", "type:chore"],
          title: "chore: 🔧 tidy the workspace",
        }),
      ).toStrictEqual({
        failures: ["❌ No scope in title: retitle as chore(<scope>): …"],
        remediationCommands: [],
      });
    });

    it("reports the do-not-merge label", () => {
      expect.hasAssertions();
      expect(
        check({
          ...validMetadata,
          labelNames: [...validMetadata.labelNames, "do-not-merge"],
        }),
      ).toStrictEqual({
        failures: ["❌ Blocked by the do-not-merge label"],
        remediationCommands: ["gh pr edit 7 --remove-label do-not-merge"],
      });
    });

    it("reports no assignee", () => {
      expect.hasAssertions();
      expect(check({ ...validMetadata, assigneeLogins: [] })).toStrictEqual({
        failures: ["❌ No assignee"],
        remediationCommands: ["gh pr edit 7 --add-assignee @me"],
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
          "gh pr edit 7 --add-label source:agent",
          "gh pr edit 7 --add-label source:human",
        ],
      });
    });

    it("reports two source labels", () => {
      expect.hasAssertions();
      expect(
        check({
          ...validMetadata,
          labelNames: [...validMetadata.labelNames, "source:human"],
        }),
      ).toStrictEqual({
        failures: [
          "❌ Expected exactly one source label: source:agent or source:human (found: source:agent source:human)",
        ],
        remediationCommands: [
          "gh pr edit 7 --remove-label source:agent",
          "gh pr edit 7 --remove-label source:human",
          "add exactly one source label, either:",
          "gh pr edit 7 --add-label source:agent",
          "gh pr edit 7 --add-label source:human",
        ],
      });
    });

    it("reports a single source label that is neither of the two", () => {
      expect.hasAssertions();
      expect(
        check({
          ...validMetadata,
          labelNames: ["scope:lexico", "source:robot", "type:feat"],
        }).failures,
      ).toStrictEqual([
        "❌ Expected exactly one source label: source:agent or source:human (found: source:robot)",
      ]);
    });

    it("collects every failure at once", () => {
      expect.hasAssertions();
      expect(
        check({
          assigneeLogins: [],
          labelNames: ["do-not-merge", "scope:tools"],
          title: "feat(lexico): ✨ add a page",
        }).failures,
      ).toStrictEqual([
        "❌ Expected exactly one type label: type:feat (found: none)",
        "❌ Missing scope label: scope:lexico",
        "❌ Unexpected scope label: scope:tools",
        "❌ Blocked by the do-not-merge label",
        "❌ No assignee",
        "❌ Expected exactly one source label: source:agent or source:human (found: none)",
      ]);
    });

    it("names the pull request number it was given", () => {
      expect.hasAssertions();
      expect(
        check({ ...validMetadata, assigneeLogins: [] }, "<number>")
          .remediationCommands,
      ).toStrictEqual(["gh pr edit <number> --add-assignee @me"]);
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
});

/** Whatever this runtime's JSON parser says about a document that is not JSON. */
function jsonErrorMessage(documentText: string): string {
  try {
    JSON.parse(documentText);
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }

  throw new Error("the document parsed after all");
}

/** The metadata every document fixture above resolves to. */
function validMetadataFromDocument(): PullRequestMetadata {
  return {
    assigneeLogins: ["JimmyPaolini"],
    labelNames: ["type:feat"],
    title: "feat(lexico): ✨ add a page",
  };
}
