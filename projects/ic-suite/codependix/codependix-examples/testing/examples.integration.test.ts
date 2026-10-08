import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { codependixConfigurationSchema } from "@codependix/configuration";
import { describe, expect, it } from "vitest";

import * as anchorPlacement from "./render/anchor-placement";
import {
  closeConfigurationService,
  getConfigurationService,
} from "./render/builders";
import { collectDocuments, orderDocuments } from "./render/catalog";
import * as configuration from "./render/configuration";
import { deliverDocuments, renderDocument } from "./render/document";
import * as exportDelivery from "./render/export-delivery";
import * as pathQueries from "./render/path-queries";
import { EXAMPLES_DIRECTORY } from "./render/paths";
import { EXAMPLE_ORDER } from "./render/reading-order";
import { run, selectMode, USAGE_MESSAGE } from "./render/run";

describe("codependix examples", () => {
  describe("configuration resolution", () => {
    it("prefers the TypeScript configuration file over the JSON one beside it", async () => {
      expect.hasAssertions();

      const loaded = await configuration.loadConfiguration("precedence");

      expect(loaded.workspace.nxProjects?.markdown?.anchor).toBe("example-nx");
    });

    it("resolves every graph to none when no configuration file exists", async () => {
      expect.hasAssertions();

      const loaded = await configuration.loadConfiguration("absent");

      expect(loaded.workspace).toStrictEqual({});
    });

    it("strips a field codependix has no opinion about", async () => {
      expect.hasAssertions();

      const loaded = await configuration.loadConfiguration("unknown-fields");

      expect(loaded).not.toHaveProperty("graphqlSchemas");
      expect(loaded.workspace.nxProjects?.target).toBe("markdown");
    });

    it("refuses an explicitly named configuration file that does not exist", async () => {
      expect.hasAssertions();
      await expect(
        configuration.describeLoadRefusal(
          "absent/codependix.config.missing.ts",
        ),
      ).resolves.toContain("ConfigurationFileNotFoundError");
    });

    it("refuses a configuration file the loader cannot read", async () => {
      expect.hasAssertions();
      await expect(
        configuration.describeLoadRefusal(
          "unsupported-type/codependix.config.yaml",
        ),
      ).resolves.toContain("UnknownConfigurationFileTypeError");
    });

    it("keeps an absolute path out of the committed message", async () => {
      expect.hasAssertions();
      await expect(
        configuration.describeLoadRefusal(
          "absent/codependix.config.missing.ts",
        ),
      ).resolves.toContain("<examples>/refusals");
    });

    it("refuses every configuration the schema rejects", () => {
      expect.hasAssertions();

      const sections = configuration.buildParseRefusalSections();

      expect(sections).toHaveLength(5);

      for (const section of sections) {
        expect(section.body).not.toContain("accepted");
      }
    });

    it("lists every validation message a refused configuration produced", () => {
      expect.hasAssertions();
      expect(
        configuration.describeIssues(
          codependixConfigurationSchema.safeParse({
            workspace: { nxProjects: { target: "both" } },
          }).error,
        ),
      ).toContain("needs a json destination");
    });

    it("falls back to describing anything that was not a validation error", () => {
      expect.hasAssertions();
      expect(configuration.describeIssues(new TypeError("unreadable"))).toBe(
        "TypeError: unreadable",
      );
      expect(configuration.describeIssues("unreadable")).toBe("unreadable");
    });

    it("names a standalone Markdown destination, which carries no anchor", () => {
      expect.hasAssertions();
      expect(
        configuration.describeDestination({
          json: undefined,
          markdown: { anchor: undefined, path: "docs/graph.md" },
        }),
      ).toBe("markdown `docs/graph.md`");
    });

    it("names both destinations when a target writes both", () => {
      expect.hasAssertions();
      expect(
        configuration.describeDestination({
          json: { path: "graph.json" },
          markdown: { anchor: "example-nx", path: "README.md" },
        }),
      ).toBe("json `graph.json`, markdown `README.md` anchor `example-nx`");
    });

    it("shares one configuration service across concurrent callers", async () => {
      expect.hasAssertions();

      await closeConfigurationService();

      const services = await Promise.all(
        Array.from({ length: 8 }, async () => getConfigurationService()),
      );

      for (const service of services) {
        expect(service).toBe(services[0]);
      }

      await closeConfigurationService();
    });

    it("handles closing the configuration service when none is open", async () => {
      expect.hasAssertions();

      await closeConfigurationService();

      await expect(closeConfigurationService()).resolves.toBeUndefined();
    });
  });

  describe("export delivery", () => {
    it("writes nothing at all for a none target", () => {
      expect.hasAssertions();

      const sections = exportDelivery.buildTargetSections();

      expect(sections[0]?.heading).toBe('`target: "none"`');
      expect(sections[0]?.body).toContain("(nothing written)");
    });

    it("writes the JSON destination for a both target", () => {
      expect.hasAssertions();
      expect(exportDelivery.buildTargetSections().at(-1)?.body).toContain(
        "codependix-nx-graph.json",
      );
    });

    it("leaves a configured JSON destination unwritten under a markdown target", () => {
      expect.hasAssertions();
      expect(exportDelivery.deliverUnwrittenJson()).toStrictEqual([
        "README.md",
      ]);
    });

    it("reports a current export as current and a drifted one as stale", () => {
      expect.hasAssertions();

      const project = exportDelivery.createScratchProject();

      exportDelivery.deliver({
        content: exportDelivery.SAMPLE_DIAGRAM,
        mode: "write",
        project,
      });

      expect(
        exportDelivery.deliver({
          content: exportDelivery.SAMPLE_DIAGRAM,
          mode: "check",
          project,
        }).isCurrent,
      ).toBe(true);
      expect(
        exportDelivery.deliver({ content: "_moved_", mode: "check", project })
          .stalePaths,
      ).toStrictEqual(["README.md"]);
    });
  });

  describe("anchor placement", () => {
    /** Counts how many times the section heading appears in a file. */
    function countHeadings(content: string): number {
      return content.split("## 🕸️ Codependix").length - 1;
    }

    it("appends a whole section to a file that carries none", () => {
      expect.hasAssertions();

      const updated = anchorPlacement.insert({
        anchorName: "example-nx",
        fileContent: "# Atlas Service\n\nAn example project.\n",
        subheading: "Nx Neighborhood",
      });

      expect(countHeadings(updated)).toBe(1);
      expect(updated).toContain("### Nx Neighborhood");
      expect(updated.indexOf("An example project.")).toBeLessThan(
        updated.indexOf("## 🕸️ Codependix"),
      );
    });

    it("places a subheading-less anchor directly under the heading", () => {
      expect.hasAssertions();
      expect(
        anchorPlacement.insert({
          anchorName: "example-workspace",
          fileContent: "# Atlas Service\n",
          subheading: undefined,
        }),
      ).not.toContain("###");
    });

    it("fails outright when the file a destination names does not exist", () => {
      expect.hasAssertions();
      expect(anchorPlacement.describeMissingReadme("write")).toContain(
        "AnchorNotFoundError",
      );
    });

    it("keeps a throwaway directory out of the committed message", () => {
      expect.hasAssertions();
      expect(anchorPlacement.describeMissingReadme("write")).toContain(
        "<project>",
      );
    });

    it("reports a README with no anchor as stale rather than raising", () => {
      expect.hasAssertions();
      expect(anchorPlacement.describeMissingAnchor()).toContain(
        "isCurrent: false",
      );
    });

    it("describes a raised value whether or not it was an Error", () => {
      expect.hasAssertions();
      expect(anchorPlacement.describeError(new TypeError("no README"))).toBe(
        "TypeError: no README",
      );
      expect(anchorPlacement.describeError("no README")).toBe("no README");
    });
  });

  describe("path queries", () => {
    it("builds the path queries example document with four sections", async () => {
      expect.hasAssertions();

      const documents = await pathQueries.buildPathQueriesDocuments();

      expect(documents).toHaveLength(1);
      expect(documents[0]?.id).toBe("path-queries");
      expect(documents[0]?.sections).toHaveLength(4);
    });

    it("includes connecting path and no-path sections", async () => {
      expect.hasAssertions();

      const [document] = await pathQueries.buildPathQueriesDocuments();
      const headings = document?.sections.map((section) => section.heading);

      expect(headings).toContain("Nx projects: connecting path found");
      expect(headings).toContain("Nx projects: no connecting path");
      expect(headings).toContain("Structured JSON format");
      expect(headings).toContain("Mermaid diagram format");
    });
  });

  describe("the examples are all documented", () => {
    // `orderDocuments` already refuses a document missing from the reading
    // order, but nothing checked the other direction: an example the package
    // guide never links to is reachable only by listing the directory. Every
    // sibling `*-examples` package checks the same thing.
    it.each(EXAMPLE_ORDER)(
      "%s is linked from the package guide",
      (exampleName) => {
        expect.hasAssertions();

        const guide = readFileSync(
          path.join(EXAMPLES_DIRECTORY, "..", "README.md"),
          "utf8",
        );

        expect(guide).toContain(`(examples/${exampleName})`);
      },
    );
  });

  describe("the committed examples", () => {
    it("collects all seventeen examples, in reading order", async () => {
      expect.hasAssertions();

      const documents = await collectDocuments();

      expect(documents.map((document) => document.id)).toStrictEqual([
        ...EXAMPLE_ORDER,
      ]);
    });

    it("refuses a document the reading order does not name", () => {
      expect.hasAssertions();
      expect(() =>
        orderDocuments([
          {
            id: "unlisted",
            jsonExports: [],
            sections: [],
            summary: "",
            title: "",
          },
        ]),
      ).toThrow("EXAMPLE_ORDER");
    });

    it("gives every section a heading, a note, and a body", async () => {
      expect.hasAssertions();

      for (const document of await collectDocuments()) {
        expect(document.sections.length).toBeGreaterThan(0);

        for (const section of document.sections) {
          expect(section.heading.length).toBeGreaterThan(0);
          expect(section.note.length).toBeGreaterThan(0);
          expect(section.body.length).toBeGreaterThan(0);
        }
      }
    });

    it("renders one top-level heading and a single trailing newline", () => {
      expect.hasAssertions();

      // An id outside `EXAMPLE_ORDER` carries no emoji and has nothing to link
      // on to, which is the shape that proves both are rendered rather than
      // authored into a document.
      expect(
        renderDocument({
          id: "00-probe",
          jsonExports: [],
          sections: [{ body: "_body_", heading: "Section", note: "A note." }],
          summary: "A summary.",
          title: "A title",
        }),
      ).toBe(
        [
          "# A title",
          "",
          "A summary.",
          "",
          "## Run it",
          "",
          "```bash",
          "nx run codependix-examples:examples",
          "```",
          "",
          "Everything below is rendered from the subject in this directory by the real",
          "graph builders, so a claim that stops being true fails a check rather than",
          "misleading anybody. The command above fails if what is committed here has",
          "drifted; `:write` regenerates it.",
          "",
          "## Section",
          "",
          "A note.",
          "",
          "_body_",
          "",
          "## Next",
          "",
          "Nothing left — back to the [package guide](../../README.md).",
          "",
        ].join("\n"),
      );
    });

    it("reports the committed output as current", async () => {
      expect.hasAssertions();

      const outcome = deliverDocuments({
        documents: await collectDocuments(),
        mode: "check",
        outputDirectory: EXAMPLES_DIRECTORY,
      });

      expect(outcome.stalePaths).toStrictEqual([]);
      expect(outcome.writtenCount).toBe(22);
    });

    it("reports every example as stale when nothing has been written", async () => {
      expect.hasAssertions();

      const outcome = deliverDocuments({
        documents: await collectDocuments(),
        mode: "check",
        outputDirectory: mkdtempSync(path.join(tmpdir(), "codependix-empty-")),
      });

      expect(outcome.stalePaths).toHaveLength(outcome.writtenCount);
    });

    it("refuses a command line naming neither mode, or both", async () => {
      expect.hasAssertions();
      expect(selectMode([])).toBeUndefined();
      expect(selectMode(["--check", "--write"])).toBeUndefined();
      expect(selectMode(["--check"])).toBe("check");
      expect(selectMode(["--write"])).toBe("write");
      await expect(run([])).resolves.toStrictEqual({
        exitCode: 1,
        lines: [USAGE_MESSAGE],
      });
    });

    it("reports the committed output as current through the run entry point", async () => {
      expect.hasAssertions();
      await expect(run(["--check"])).resolves.toStrictEqual({
        exitCode: 0,
        lines: ["🕸️ Rendered 22 codependix example files."],
      });
    });

    it("names every stale file when the output directory holds nothing", async () => {
      expect.hasAssertions();

      const outcome = await run(
        ["--check"],
        mkdtempSync(path.join(tmpdir(), "codependix-stale-")),
      );

      expect(outcome.exitCode).toBe(1);
      expect(outcome.lines[0]).toContain("22 stale codependix example(s)");
    });

    it("writes every example into a directory that does not exist yet", async () => {
      expect.hasAssertions();

      const outputDirectory = path.join(
        mkdtempSync(path.join(tmpdir(), "codependix-run-")),
        "nested",
      );
      const documents = await collectDocuments();

      expect(
        deliverDocuments({ documents, mode: "write", outputDirectory })
          .stalePaths,
      ).toStrictEqual([]);
      expect(
        readFileSync(
          path.join(outputDirectory, "graph-levels", "README.md"),
          "utf8",
        ),
      ).toContain("# 🗺️ The four graph levels, side by side");
    });
  });
});
