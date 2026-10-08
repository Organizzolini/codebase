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

/** The valid description with one section's content swapped out. */
const withSection = (options: {
  readonly content: string;
  readonly heading: string;
}): string => {
  const sections = validBody.split(/(?=^## )/mu);

  return sections
    .map((section) =>
      section.startsWith(`${options.heading}\n`)
        ? `${options.heading}\n\n${options.content}\n\n`
        : section,
    )
    .join("");
};

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

  describe("findOversizedSections", () => {
    it("finds none in a description within its limits", () => {
      expect.hasAssertions();
      expect(service.findOversizedSections(validBody)).toStrictEqual([]);
    });

    it("accepts a Summary of exactly 48 words", () => {
      expect.hasAssertions();
      expect(
        service.findOversizedSections(
          withSection({
            content: "word ".repeat(48),
            heading: "## 🌰 Summary",
          }),
        ),
      ).toStrictEqual([]);
    });

    it("names a Summary of 49 words with its count", () => {
      expect.hasAssertions();
      expect(
        service.findOversizedSections(
          withSection({
            content: "word ".repeat(49),
            heading: "## 🌰 Summary",
          }),
        ),
      ).toStrictEqual(["🌰 Summary has 49 words, over its limit of 48"]);
    });

    it("names a Details list past 512 words", () => {
      expect.hasAssertions();
      expect(
        service.findOversizedSections(
          withSection({
            content: "- word\n".repeat(257),
            heading: "## 📝 Details",
          }),
        ),
      ).toStrictEqual(["📝 Details has 514 words, over its limit of 512"]);
    });

    it("does not count template comments as words", () => {
      expect.hasAssertions();
      expect(
        service.findOversizedSections(
          withSection({
            content: `${"word ".repeat(40)}<!-- ${"padding ".repeat(20)}-->`,
            heading: "## 🌰 Summary",
          }),
        ),
      ).toStrictEqual([]);
    });

    it("puts no limit on Testing or Related", () => {
      expect.hasAssertions();
      expect(
        service.findOversizedSections(
          withSection({
            content: `1. ${"word ".repeat(2000)}`,
            heading: "## 🧪 Testing",
          }),
        ),
      ).toStrictEqual([]);
    });

    it("does not report a missing section", () => {
      expect.hasAssertions();
      expect(service.findOversizedSections("nothing at all")).toStrictEqual([]);
    });
  });

  describe("findMalformedSections", () => {
    /** The shape failures for the valid description with one section swapped. */
    const malformed = (heading: string, content: string): string[] =>
      service.findMalformedSections(withSection({ content, heading }));

    it("finds none in a well-formed description", () => {
      expect.hasAssertions();
      expect(service.findMalformedSections(validBody)).toStrictEqual([]);
    });

    it("accepts a Summary paragraph wrapped over lines, with inline markup", () => {
      expect.hasAssertions();
      expect(
        malformed(
          "## 🌰 Summary",
          "Moves `four` checks\ninto a [validation](https://example.com) application.",
        ),
      ).toStrictEqual([]);
    });

    it.each([
      ["two paragraphs", "One paragraph.\n\nAnother paragraph."],
      ["a list", "- A bullet"],
      ["a heading", "### A heading"],
      ["a code block", "```bash\nnx run validation:vitest\n```"],
    ])("refuses a Summary holding %s", (_description, content) => {
      expect.hasAssertions();
      expect(malformed("## 🌰 Summary", content)).toStrictEqual([
        "🌰 Summary must hold only one plain paragraph",
      ]);
    });

    it.each([
      ["`-`", "- One\n  - Nested\n\n- Two\n  continued"],
      ["`*`", "* One\n  * Nested\n\n* Two"],
      ["`+`", "+ One\n+ Two"],
      ["one marker around a nested ordered list", "* One\n  1. Step\n* Two"],
    ])(
      "accepts Details bulleted with %s throughout",
      (_description, content) => {
        expect.hasAssertions();
        expect(malformed("## 📝 Details", content)).toStrictEqual([]);
      },
    );

    it.each([
      ["a trailing paragraph", "- One change\n\nA closing remark."],
      ["an ordered list", "1. One change"],
      ["a subheading", "### Part\n\n- One change"],
      ["two markers across lists", "- One change\n\n* Another change"],
      ["a nested list with another marker", "- One change\n  * A detail"],
    ])("refuses Details holding %s", (_description, content) => {
      expect.hasAssertions();
      expect(malformed("## 📝 Details", content)).toStrictEqual([
        "📝 Details must hold only a bulleted list, one marker throughout",
      ]);
    });

    it("accepts Testing steps holding code blocks", () => {
      expect.hasAssertions();
      expect(
        malformed(
          "## 🧪 Testing",
          "1. Run the suite:\n\n   ```bash\n   nx run validation:vitest\n   ```\n\n2) Read the output",
        ),
      ).toStrictEqual([]);
    });

    it.each([
      ["a code block outside the list", "```bash\nnx run x\n```\n\n1. Run it"],
      ["a bulleted list", "- Run the suite"],
      ["a paragraph", "Ran the suite."],
    ])("refuses Testing holding %s", (_description, content) => {
      expect.hasAssertions();
      expect(malformed("## 🧪 Testing", content)).toStrictEqual([
        "🧪 Testing must hold only an ordered list",
      ]);
    });

    it.each([
      ["a `*` list", "* Issue 120"],
      ["a `+` list", "+ Issue 120"],
      ["a `*` item before its `-` items", "* Issue 120\n- Issue 121"],
      ["an ordered list", "1. Issue 120"],
      ["a paragraph", "Issue 120"],
      ["a paragraph before its list", "See below.\n\n- Issue 120"],
      [
        "a comment-led paragraph",
        "<!-- note -->\n\nCo-authored.\n\n- Issue 120",
      ],
    ])("refuses Related opening with %s", (_description, content) => {
      expect.hasAssertions();
      expect(malformed("## 🔗 Related", content)).toStrictEqual([
        "🔗 Related must hold a list whose items start with `-`, then anything",
      ]);
    });

    it.each([
      [
        "an agent's attribution line",
        "- Issue 120\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)",
      ],
      [
        "a different attribution line and a comment",
        "- Issue 120\n\nCo-authored with GitHub Copilot.\n\n<!-- codometer-changes:start -->",
      ],
      [
        "a paragraph, a table, and a code block",
        "- Issue 120\n\nNotes.\n\n| a |\n| - |\n| b |\n\n```text\nx\n```",
      ],
    ])("accepts a Related list followed by %s", (_description, content) => {
      expect.hasAssertions();
      expect(malformed("## 🔗 Related", content)).toStrictEqual([]);
    });

    it("leaves empty and missing sections to the checks that name them", () => {
      expect.hasAssertions();
      expect(
        service.findMalformedSections(
          "## 🌰 Summary\n\n<!-- A prompt -->\n\n## 📝 Details\n\n- ",
        ),
      ).toStrictEqual([]);
    });

    it("names every malformed section in the order they are required", () => {
      expect.hasAssertions();
      expect(
        service.findMalformedSections(
          [
            "## 🌰 Summary",
            "",
            "- A bullet",
            "",
            "## 📝 Details",
            "",
            "- Adds the project",
            "",
            "## 🧪 Testing",
            "",
            "Ran it.",
            "",
            "## 🔗 Related",
            "",
            "- Issue 120",
          ].join("\n"),
        ),
      ).toStrictEqual([
        "🌰 Summary must hold only one plain paragraph",
        "🧪 Testing must hold only an ordered list",
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
        malformedSections: [],
        missingHeadings: [],
        oversizedSections: [],
        unfilledComments: [],
      });
    });

    it("reports a missing heading alone", () => {
      expect.hasAssertions();
      expect(
        check(validBody.replace("## 🔗 Related", "## Related")),
      ).toStrictEqual({
        emptySections: [],
        malformedSections: [],
        missingHeadings: ["## 🔗 Related"],
        oversizedSections: [],
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
        malformedSections: [],
        missingHeadings: [],
        oversizedSections: [],
        unfilledComments: [],
      });
    });

    it("reports a surviving prompt alone", () => {
      expect.hasAssertions();
      expect(
        check(`${validBody}\n<!-- List of specific changes made -->`),
      ).toStrictEqual({
        emptySections: [],
        malformedSections: [],
        missingHeadings: [],
        oversizedSections: [],
        unfilledComments: ["<!-- List of specific changes made -->"],
      });
    });

    it("reports a malformed and an oversized section alone", () => {
      expect.hasAssertions();
      expect(
        check(
          withSection({
            content: `${"word ".repeat(49)}\n\n- and a list`,
            heading: "## 🌰 Summary",
          }),
        ),
      ).toStrictEqual({
        emptySections: [],
        malformedSections: ["🌰 Summary must hold only one plain paragraph"],
        missingHeadings: [],
        oversizedSections: ["🌰 Summary has 53 words, over its limit of 48"],
        unfilledComments: [],
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
