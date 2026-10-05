import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { LoggerService } from "@codebase/logging";

import { CommentsService } from "./comments.service";
import { CssCommentsService } from "./css-comments.service";
import { HashCommentsService } from "./hash-comments.service";
import { HclCommentsService } from "./hcl-comments.service";
import { LanguageCommentsService } from "./language-comments.service";
import { SqlCommentsService } from "./sql-comments.service";
import { TypescriptCommentsService } from "./typescript-comments.service";
import { YamlCommentsService } from "./yaml-comments.service";

import type { CommentBudget, LanguageCommentFiles } from "./comments.types";
import type { DeepMocked } from "@golevelup/ts-vitest";

describe(LanguageCommentsService, () => {
  let service: LanguageCommentsService;
  let loggerService: DeepMocked<LoggerService>;
  const temporaryDirectories: string[] = [];

  const budget: CommentBudget = {
    maximumCharacters: undefined,
    maximumLines: undefined,
    maximumWords: 3,
    severity: "fail",
  };

  /** An empty discovery result, with one language's files filled in. */
  function discovered(
    overrides: Partial<LanguageCommentFiles>,
  ): LanguageCommentFiles {
    return {
      cssFiles: [],
      hclFiles: [],
      shellFiles: [],
      sourceFiles: [],
      sqlFiles: [],
      tomlFiles: [],
      yamlFiles: [],
      ...overrides,
    };
  }

  /** Writes files into a fresh directory and returns where they landed. */
  function writeFiles(files: Record<string, string>): string {
    const workingDirectory = mkdtempSync(path.join(tmpdir(), "codometer-cm-"));
    temporaryDirectories.push(workingDirectory);

    for (const [name, content] of Object.entries(files)) {
      writeFileSync(path.join(workingDirectory, name), content, "utf8");
    }

    return workingDirectory;
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CommentsService,
        CssCommentsService,
        HashCommentsService,
        HclCommentsService,
        LanguageCommentsService,
        SqlCommentsService,
        TypescriptCommentsService,
        YamlCommentsService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    service = await module.resolve(LanguageCommentsService);
    loggerService = await module.resolve(LoggerService);
  });

  afterEach(() => {
    for (const directory of temporaryDirectories.splice(0)) {
      rmSync(directory, { force: true, recursive: true });
    }
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("measures nothing when no counter was declared", () => {
    const workingDirectory = writeFiles({ "a.sh": "# one two three four\n" });

    expect(
      service.measure({
        counters: [],
        files: discovered({ shellFiles: ["a.sh"] }),
        pythonComments: [],
        workingDirectory,
      }),
    ).toStrictEqual({});
  });

  it.each<{
    content: string;
    extension: string;
    files: Partial<LanguageCommentFiles>;
    language: "shell" | "toml" | "yaml";
  }>([
    {
      content: "# one two three four\n",
      extension: "sh",
      files: { shellFiles: ["a.sh"] },
      language: "shell",
    },
    {
      content: "# one two three four\n",
      extension: "toml",
      files: { tomlFiles: ["a.toml"] },
      language: "toml",
    },
    {
      content: "# one two three four\n",
      extension: "yaml",
      files: { yamlFiles: ["a.yaml"] },
      language: "yaml",
    },
  ])(
    "measures $language comment blocks against a counter's own budget",
    ({ content, extension, files, language }) => {
      const workingDirectory = writeFiles({ [`a.${extension}`]: content });

      const results = service.measure({
        counters: [{ budget, kind: undefined, label: "prose", language }],
        files: discovered(files),
        pythonComments: [],
        workingDirectory,
      });

      expect(results["prose"]).toHaveLength(1);
      expect(results["prose"]?.[0]).toMatchObject({
        breached: true,
        file: `a.${extension}`,
        measured: 4,
        unit: "words",
      });
    },
  );

  it.each<{
    content: string;
    extension: string;
    files: Partial<LanguageCommentFiles>;
    language: "css" | "hcl" | "sql" | "typescript";
  }>([
    {
      content: "/* one two three four */\n.order {}\n",
      extension: "css",
      files: { cssFiles: ["a.css"] },
      language: "css",
    },
    {
      content: "# one two three four\n",
      extension: "tf",
      files: { hclFiles: ["a.tf"] },
      language: "hcl",
    },
    {
      content: "-- one two three four\nSELECT 1;\n",
      extension: "sql",
      files: { sqlFiles: ["a.sql"] },
      language: "sql",
    },
    {
      content: "// one two three four\nconst value = 1;\n",
      extension: "ts",
      files: { sourceFiles: ["a.ts"] },
      language: "typescript",
    },
  ])(
    "measures $language comment blocks against a counter's own budget",
    ({ content, extension, files, language }) => {
      const workingDirectory = writeFiles({ [`a.${extension}`]: content });

      const results = service.measure({
        counters: [{ budget, kind: undefined, label: "prose", language }],
        files: discovered(files),
        pythonComments: [],
        workingDirectory,
      });

      expect(results["prose"]).toHaveLength(1);
      expect(results["prose"]?.[0]).toMatchObject({
        breached: true,
        file: `a.${extension}`,
        measured: 4,
        unit: "words",
      });
    },
  );

  it("skips a counter naming a declaration kind, which the walk measures", () => {
    const workingDirectory = writeFiles({ "a.sh": "# one two three four\n" });

    const results = service.measure({
      counters: [
        { budget, kind: "class", label: "class-docs", language: "shell" },
      ],
      files: discovered({ shellFiles: ["a.sh"] }),
      pythonComments: [],
      workingDirectory,
    });

    expect(results).toStrictEqual({});
  });

  it("measures every language at once when a counter names none", () => {
    const workingDirectory = writeFiles({
      "a.sh": "# one two three four\n",
      "a.yaml": "# one two three four\n",
    });

    const results = service.measure({
      counters: [
        { budget, kind: undefined, label: "prose", language: undefined },
      ],
      files: discovered({ shellFiles: ["a.sh"], yamlFiles: ["a.yaml"] }),
      pythonComments: [],
      workingDirectory,
    });

    expect(
      results["prose"]?.map((entry) => entry.file).toSorted(),
    ).toStrictEqual(["a.sh", "a.yaml"]);
  });

  it("keeps two counters' results apart, even over the same language", () => {
    const workingDirectory = writeFiles({ "a.sh": "# one two three four\n" });
    const strict: CommentBudget = { ...budget, maximumWords: 1 };

    const results = service.measure({
      counters: [
        { budget, kind: undefined, label: "loose", language: "shell" },
        { budget: strict, kind: undefined, label: "strict", language: "shell" },
      ],
      files: discovered({ shellFiles: ["a.sh"] }),
      pythonComments: [],
      workingDirectory,
    });

    expect(results["loose"]).toHaveLength(1);
    expect(results["strict"]).toHaveLength(1);
    expect(results["loose"]?.[0]?.limit).toBe(3);
    expect(results["strict"]?.[0]?.limit).toBe(1);
  });

  it("measures the Python comments its own analyzer already found", () => {
    // Python is read in Python: `tokenize` runs in the subprocess and the
    // tokens arrive here, so nothing re-reads the `.py` file.
    const results = service.measure({
      counters: [
        { budget, kind: undefined, label: "prose", language: "python" },
      ],
      files: discovered({}),
      pythonComments: [
        {
          file: "a.py",
          line: 1,
          ownLine: true,
          prose: "one two",
          source: "# one two",
        },
        {
          file: "a.py",
          line: 2,
          ownLine: true,
          prose: "three four",
          source: "# three four",
        },
        {
          file: "b.py",
          line: 9,
          ownLine: true,
          prose: "five",
          source: "# five",
        },
      ],
      workingDirectory: "/repo",
    });

    // Adjacent lines in one file join; a different file never joins, whatever
    // the line numbers say.
    expect(
      results["prose"]?.map((entry) => [
        entry.file,
        entry.line,
        entry.measured,
      ]),
    ).toStrictEqual([
      ["a.py", 1, 4],
      ["b.py", 9, 1],
    ]);
  });

  it("reads YAML with the tokenizer rather than the line scanner", () => {
    const workingDirectory = writeFiles({
      "a.yaml": 'key: "one two three four five"\n',
    });

    // A line scanner would find no `#` here either; the point is that the
    // tokenizer is what YAML is routed through.
    expect(
      service.measure({
        counters: [
          { budget, kind: undefined, label: "prose", language: "yaml" },
        ],
        files: discovered({ yamlFiles: ["a.yaml"] }),
        pythonComments: [],
        workingDirectory,
      })["prose"],
    ).toStrictEqual([]);
  });

  it("skips a file it cannot read and warns", () => {
    const results = service.measure({
      counters: [
        { budget, kind: undefined, label: "prose", language: "shell" },
      ],
      files: discovered({ shellFiles: ["missing.sh"] }),
      pythonComments: [],
      workingDirectory: "/repo",
    });

    expect(results["prose"]).toStrictEqual([]);
    expect(loggerService.warn).toHaveBeenCalledWith(
      "🗒️ Skipped comment measurement",
      undefined,
      expect.objectContaining({ filePath: "missing.sh" }),
    );
  });
});
