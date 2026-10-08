import { createPlaceholderValue } from "@conformetry/configuration";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { ScoringService } from "../scoring/scoring.service";

import { MarkdownNodesService } from "./markdown-nodes.service";
import { MarkdownTreeService } from "./markdown-tree.service";
import { MarkdownService } from "./markdown.service";

import type {
  ConformetryDifference,
  PreparedValidationDocument,
} from "@conformetry/core";

function createDocument(args: {
  instance: string;
  renderedTemplate: string;
}): PreparedValidationDocument {
  return {
    filename: "README.md",
    instance: args.instance,
    instanceFilePath: "/project/README.md",
    renderedTemplate: args.renderedTemplate,
    templateFilePath: "/templates/README.md",
  };
}

describe(MarkdownService, () => {
  let service: MarkdownService;

  function validate(
    renderedTemplate: string,
    instance: string,
  ): ConformetryDifference[] {
    return service.validateDocument(
      createDocument({ instance, renderedTemplate }),
    ).differences;
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MarkdownNodesService,
        MarkdownService,
        MarkdownTreeService,
        ScoringService,
      ],
    }).compile();

    service = await module.resolve(MarkdownService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("claims markdown files", () => {
    expect(service.descriptor.fileExtensions).toStrictEqual([".md"]);
    expect(service.descriptor.name).toBe("markdown");
  });

  it("accepts a document containing every required heading", () => {
    expect(
      validate("# Title\n\n## Usage\n", "# Title\n\n## Usage\n"),
    ).toStrictEqual([]);
  });

  it("accepts extra sections the template does not declare", () => {
    expect(
      validate("# Title\n", "# Title\n\n## Extra\n\nSome prose.\n"),
    ).toStrictEqual([]);
  });

  it("accepts reflowed prose, since matching is structural", () => {
    expect(
      validate("# Title\n\nOne two three\n", "# Title\n\nOne two three\n"),
    ).toStrictEqual([]);
  });

  it("reports a missing heading", () => {
    const differences = validate("# Title\n\n## Usage\n", "# Title\n");

    expect(differences).toHaveLength(1);
    expect(differences[0]?.message).toBe('Missing markdown heading: "Usage"');
    expect(differences[0]?.language).toBe("markdown");
  });

  it("distinguishes heading depth", () => {
    const differences = validate("## Usage\n", "# Usage\n");

    expect(differences).toHaveLength(1);
  });

  it("reports a missing fenced code block", () => {
    const differences = validate(
      "```bash\nnx run build\n```\n",
      "```bash\nnx run test\n```\n",
    );

    expect(differences).toHaveLength(1);
    expect(differences[0]?.message).toContain("Missing markdown code");
  });

  it("anchors an error to the line after the last match", () => {
    const differences = validate("# Title\n\n## Usage\n", "# Title\n");

    expect(differences[0]?.instanceLine).toBe(2);
  });

  it("carries an actionable fix", () => {
    const differences = validate("# Title\n\n## Usage\n", "# Title\n");

    expect(differences[0]?.fix).toBe(
      'Add the heading "Usage" to the instance file.',
    );
  });

  it("requires a table to keep its column count", () => {
    const template = "| a | b |\n| - | - |\n| 1 | 2 |\n";
    const instance = "| a |\n| - |\n| 1 |\n";

    expect(validate(template, instance).length).toBeGreaterThan(0);
  });

  describe("node kinds", () => {
    /** Each kind, with markdown that matches and markdown that does not. */
    const KINDS: { differs?: string; kind: string; same: string }[] = [
      { differs: "## Title", kind: "heading", same: "# Title" },
      {
        differs: "<div>other</div>",
        kind: "html",
        same: "<div>same</div>",
      },
      {
        differs: "![other](same.png)",
        kind: "image",
        same: "![alt](same.png)",
      },
      { differs: "`other`", kind: "inlineCode", same: "`same`" },
      {
        differs: "[other](https://same.example)",
        kind: "link",
        same: "[text](https://same.example)",
      },
      { differs: "1. one", kind: "list", same: "- one" },
      {
        differs: "| a |\n| - |\n| 1 |",
        kind: "table",
        same: "| a | b |\n| - | - |\n| 1 | 2 |",
      },
      { differs: "other", kind: "text", same: "same" },
      // A thematic break carries no content, so there is nothing to drift.
      { kind: "thematicBreak", same: "---" },
    ];

    it.each(KINDS)("accepts a matching $kind", ({ same }) => {
      expect(validate(same, same)).toStrictEqual([]);
    });

    it.each(KINDS.filter((entry) => entry.differs !== undefined))(
      "reports a $kind that drifted",
      ({ differs, same }) => {
        expect(validate(same, differs ?? same).length).toBeGreaterThan(0);
      },
    );
  });

  describe("leaf template nodes", () => {
    it("stops descending once a leaf node has matched", () => {
      expect(validate("---\n\n---\n", "---\n\n---\n")).toStrictEqual([]);
    });
  });

  it("captures a heading a placeholder value stands in for", () => {
    const value = createPlaceholderValue();
    const result = service.validateDocument(
      createDocument({
        instance: "# Intro\n\n## Alpha Widget\n",
        renderedTemplate: `# Intro\n\n## ${value} Widget\n`,
      }),
    );

    expect(result.differences).toStrictEqual([]);
    expect(result.captures).toStrictEqual({ [value]: "Alpha" });
  });
});
