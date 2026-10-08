import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { PullRequestBodyService } from "./pull-request-body.service";

/** What the mocked workspace hands back for the template read. */
let templateDocument = "";

vi.mock("node:fs", () => ({
  readFileSync: vi.fn<(target: string) => string>(() => templateDocument),
}));

/** The four headings, each with real content under it. */
const validBody = [
  "## 🌰 Summary",
  "",
  "Moves four checks into a validation application.",
  "",
  "## 📝 Details",
  "",
  "- Adds the project",
  "",
  "## 🧪 Testing",
  "",
  "1. Run the suite",
  "",
  "## 🔗 Related",
  "",
  "- Issue 120",
  "",
].join("\n");

/** The template as it stands, prompts and all. */
const templateBody = [
  "## 🌰 Summary",
  "",
  "<!-- Brief description of what this PR does (1-2 sentences) -->",
  "",
  "## 📝 Details",
  "",
  "- <!-- List of specific changes made -->",
  "",
  "## 🧪 Testing",
  "",
  "1. <!-- How to manually verify these changes work correctly -->",
  "",
  "## 🔗 Related",
  "",
  "- <!-- Link any relevant documentation or related resources -->",
  "",
].join("\n");

describe(PullRequestBodyService, () => {
  let service: PullRequestBodyService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [PullRequestBodyService],
    }).compile();

    service = await module.resolve(PullRequestBodyService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    templateDocument = templateBody;
  });

  it("is defined", () => {
    expect.hasAssertions();
    expect(service).toBeDefined();
  });

  describe("extractTemplateComments", () => {
    it("reads every prompt the template holds", () => {
      expect.hasAssertions();
      expect(service.extractTemplateComments("template.md")).toStrictEqual([
        "<!-- Brief description of what this PR does (1-2 sentences) -->",
        "<!-- List of specific changes made -->",
        "<!-- How to manually verify these changes work correctly -->",
        "<!-- Link any relevant documentation or related resources -->",
      ]);
    });

    it("reads a prompt added to the template with no code change", () => {
      expect.hasAssertions();

      templateDocument = `${templateBody}\n## 🧭 Rollout\n\n<!-- How this reaches production, and what to watch -->\n`;

      expect(service.extractTemplateComments("template.md")).toContain(
        "<!-- How this reaches production, and what to watch -->",
      );
    });

    it("reads a prompt wrapped across lines", () => {
      expect.hasAssertions();

      templateDocument = "<!-- One prompt\nspread over two lines -->";

      expect(service.extractTemplateComments("template.md")).toStrictEqual([
        "<!-- One prompt\nspread over two lines -->",
      ]);
    });

    it("reads no prompt out of a template that has none", () => {
      expect.hasAssertions();

      templateDocument = "## 🌰 Summary\n";

      expect(service.extractTemplateComments("template.md")).toStrictEqual([]);
    });
  });

  describe("findMissingHeadings", () => {
    it("finds none in a complete description", () => {
      expect.hasAssertions();
      expect(service.findMissingHeadings(validBody)).toStrictEqual([]);
    });

    it("names the one heading that is missing", () => {
      expect.hasAssertions();
      expect(
        service.findMissingHeadings(
          validBody.replace("## 🔗 Related", "## Related"),
        ),
      ).toStrictEqual(["## 🔗 Related"]);
    });

    it("names every missing heading in the order they are required", () => {
      expect.hasAssertions();
      expect(service.findMissingHeadings("nothing at all")).toStrictEqual([
        "## 🌰 Summary",
        "## 📝 Details",
        "## 🧪 Testing",
        "## 🔗 Related",
      ]);
    });

    it("refuses a heading that is not at the start of its line", () => {
      expect.hasAssertions();
      expect(
        service.findMissingHeadings("see the ## 🌰 Summary above"),
      ).toContain("## 🌰 Summary");
    });

    it("accepts a heading with trailing whitespace", () => {
      expect.hasAssertions();
      expect(
        service.findMissingHeadings(
          validBody.replace("## 🔗 Related", "## 🔗 Related  "),
        ),
      ).toStrictEqual([]);
    });
  });

  describe("findEmptySections", () => {
    it("finds no empty sections in a complete description", () => {
      expect.hasAssertions();
      expect(service.findEmptySections(validBody)).toStrictEqual([]);
    });

    it("names an empty section that contains only whitespace", () => {
      expect.hasAssertions();

      const bodyWithEmptySection = [
        "## 🌰 Summary",
        "",
        "Moves four checks into a validation application.",
        "",
        "## 📝 Details",
        "",
        "   ",
        "",
        "## 🧪 Testing",
        "",
        "1. Run the suite",
        "",
        "## 🔗 Related",
        "",
        "- Issue 120",
      ].join("\n");

      expect(service.findEmptySections(bodyWithEmptySection)).toStrictEqual([
        "## 📝 Details",
      ]);
    });

    it("names a section containing only HTML comments", () => {
      expect.hasAssertions();

      const bodyWithCommentOnly = [
        "## 🌰 Summary",
        "",
        "<!-- Some comment -->",
        "",
        "## 📝 Details",
        "",
        "- Added feature",
        "",
        "## 🧪 Testing",
        "",
        "1. Run the suite",
        "",
        "## 🔗 Related",
        "",
        "- Issue 120",
      ].join("\n");

      expect(service.findEmptySections(bodyWithCommentOnly)).toStrictEqual([
        "## 🌰 Summary",
      ]);
    });

    it("names a section containing only empty markdown list items", () => {
      expect.hasAssertions();

      const bodyWithEmptyBullets = [
        "## 🌰 Summary",
        "",
        "Moves four checks into a validation application.",
        "",
        "## 📝 Details",
        "",
        "- ",
        "* ",
        "+ ",
        "1. ",
        "2) ",
        "",
        "## 🧪 Testing",
        "",
        "1. Run the suite",
        "",
        "## 🔗 Related",
        "",
        "- Issue 120",
      ].join("\n");

      expect(service.findEmptySections(bodyWithEmptyBullets)).toStrictEqual([
        "## 📝 Details",
      ]);
    });

    it("names multiple empty sections in the order they are required", () => {
      expect.hasAssertions();

      const bodyWithMultipleEmpty = [
        "## 🌰 Summary",
        "",
        "## 📝 Details",
        "",
        "Added feature",
        "",
        "## 🧪 Testing",
        "",
        "## 🔗 Related",
        "",
        "- ",
      ].join("\n");

      expect(service.findEmptySections(bodyWithMultipleEmpty)).toStrictEqual([
        "## 🌰 Summary",
        "## 🧪 Testing",
        "## 🔗 Related",
      ]);
    });

    it("does not report missing headings as empty sections", () => {
      expect.hasAssertions();

      const bodyWithMissingHeading = [
        "## 🌰 Summary",
        "",
        "Moves four checks.",
        "",
        "## 📝 Details",
        "",
        "- Adds the project",
        "",
        "## 🧪 Testing",
        "",
        "1. Run the suite",
      ].join("\n");

      expect(service.findEmptySections(bodyWithMissingHeading)).toStrictEqual(
        [],
      );
    });

    it("names an empty section at the end of the document", () => {
      expect.hasAssertions();

      const bodyWithEmptyTail = [
        "## 🌰 Summary",
        "",
        "Moves four checks.",
        "",
        "## 📝 Details",
        "",
        "- Adds the project",
        "",
        "## 🧪 Testing",
        "",
        "1. Run the suite",
        "",
        "## 🔗 Related",
        "",
      ].join("\n");

      expect(service.findEmptySections(bodyWithEmptyTail)).toStrictEqual([
        "## 🔗 Related",
      ]);
    });
  });

  describe("findUnfilledComments", () => {
    /** The prompts the template currently holds. */
    const templateComments = (): string[] =>
      service.extractTemplateComments("template.md");

    it("finds none in a fully written description", () => {
      expect.hasAssertions();
      expect(
        service.findUnfilledComments({
          body: validBody,
          templateComments: templateComments(),
        }),
      ).toStrictEqual([]);
    });

    it("names every prompt the raw template still carries", () => {
      expect.hasAssertions();
      expect(
        service.findUnfilledComments({
          body: templateBody,
          templateComments: templateComments(),
        }),
      ).toHaveLength(4);
    });

    it("names the one prompt that survived", () => {
      expect.hasAssertions();
      expect(
        service.findUnfilledComments({
          body: `${validBody}\n- <!-- List of specific changes made -->`,
          templateComments: templateComments(),
        }),
      ).toStrictEqual(["<!-- List of specific changes made -->"]);
    });

    it("catches a prompt whose tail was edited but whose opening survived", () => {
      expect.hasAssertions();
      expect(
        service.findUnfilledComments({
          body: `${validBody}\n<!-- Brief description of what this PR does, honestly -->`,
          templateComments: templateComments(),
        }),
      ).toStrictEqual([
        "<!-- Brief description of what this PR does (1-2 sentences) -->",
      ]);
    });

    it("catches a prompt the description wrapped differently", () => {
      expect.hasAssertions();

      templateDocument = "<!-- One prompt\nspread over two lines -->";

      expect(
        service.findUnfilledComments({
          body: "<!-- One prompt spread over two lines -->",
          templateComments: templateComments(),
        }),
      ).toHaveLength(1);
    });
  });

  describe("checkBody", () => {
    /** Both failure lists for one description, against the template. */
    const check = (body: string): ReturnType<typeof service.checkBody> =>
      service.checkBody({
        body,
        templateComments: service.extractTemplateComments("template.md"),
      });

    it("passes a fully valid description", () => {
      expect.hasAssertions();
      expect(check(validBody)).toStrictEqual({
        emptySections: [],
        missingHeadings: [],
        unfilledComments: [],
      });
    });

    it("reports a missing heading alone", () => {
      expect.hasAssertions();
      expect(
        check(validBody.replace("## 🔗 Related", "## Related")),
      ).toStrictEqual({
        emptySections: [],
        missingHeadings: ["## 🔗 Related"],
        unfilledComments: [],
      });
    });

    it("reports an empty section alone", () => {
      expect.hasAssertions();

      const bodyWithEmptySection = [
        "## 🌰 Summary",
        "",
        "Moves four checks.",
        "",
        "## 📝 Details",
        "",
        "## 🧪 Testing",
        "",
        "1. Run the suite",
        "",
        "## 🔗 Related",
        "",
        "- Issue 120",
      ].join("\n");

      expect(check(bodyWithEmptySection)).toStrictEqual({
        emptySections: ["## 📝 Details"],
        missingHeadings: [],
        unfilledComments: [],
      });
    });

    it("reports a surviving prompt alone", () => {
      expect.hasAssertions();
      expect(
        check(`${validBody}\n<!-- List of specific changes made -->`),
      ).toStrictEqual({
        emptySections: [],
        missingHeadings: [],
        unfilledComments: ["<!-- List of specific changes made -->"],
      });
    });

    it("reports missing headings, empty sections, and surviving prompts when a description hits all three", () => {
      expect.hasAssertions();

      const verdict = check(
        [
          "## 🌰 Summary",
          "",
          "## 📝 Details",
          "",
          "- Adds the project",
          "",
          "## 🧪 Testing",
          "",
          "1. Run the suite",
          "<!-- List of specific changes made -->",
        ].join("\n"),
      );

      expect(verdict.missingHeadings).toStrictEqual(["## 🔗 Related"]);
      expect(verdict.emptySections).toStrictEqual(["## 🌰 Summary"]);
      expect(verdict.unfilledComments).toStrictEqual([
        "<!-- List of specific changes made -->",
      ]);
    });
  });
});
