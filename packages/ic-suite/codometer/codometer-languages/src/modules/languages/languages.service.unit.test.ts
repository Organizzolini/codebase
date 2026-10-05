import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { LoggerService } from "@codebase/logging";

import { CommentsService } from "../comments/comments.service";
import { CssCommentsService } from "../comments/css-comments.service";
import { HashCommentsService } from "../comments/hash-comments.service";
import { HclCommentsService } from "../comments/hcl-comments.service";
import { LanguageCommentsService } from "../comments/language-comments.service";
import { SqlCommentsService } from "../comments/sql-comments.service";
import { TypescriptCommentsService } from "../comments/typescript-comments.service";
import { YamlCommentsService } from "../comments/yaml-comments.service";
import { CssService } from "../css/css.service";
import { HclService } from "../hcl/hcl.service";
import { JsonService } from "../json/json.service";
import { JupyterService } from "../jupyter/jupyter.service";
import { MarkdownService } from "../markdown/markdown.service";
import { PythonService } from "../python/python.service";
import { ShellService } from "../shell/shell.service";
import { SqlService } from "../sql/sql.service";
import { TomlService } from "../toml/toml.service";
import { TypescriptService } from "../typescript/typescript.service";
import { YamlService } from "../yaml/yaml.service";

import { LanguagesService } from "./languages.service";

import type { CommentCounter } from "../comments/comments.types";
import type { DiscoveredLanguageFiles } from "./languages.types";
import type { ResolvedCodometerConfiguration } from "@codometer/configuration";

const configuration = createMock<ResolvedCodometerConfiguration>({
  python: { command: "uv run python" },
});
const declarationCounter: CommentCounter = {
  budget: {
    maximumCharacters: undefined,
    maximumLines: 6,
    maximumWords: undefined,
    severity: "fail",
  },
  kind: "class",
  label: "class-docs",
  language: undefined,
};
const plainCounter: CommentCounter = {
  budget: {
    maximumCharacters: undefined,
    maximumLines: 4,
    maximumWords: undefined,
    severity: "fail",
  },
  kind: undefined,
  label: "yaml-comments",
  language: "yaml",
};
const commentCounters: CommentCounter[] = [declarationCounter, plainCounter];

const discoveredFiles: DiscoveredLanguageFiles = {
  cssFiles: ["src/styles.css"],
  hclFiles: ["infrastructure/main.tf"],
  jsonFiles: ["package.json"],
  markdownFiles: ["README.md"],
  notebookFiles: ["notebooks/explore.ipynb"],
  pyFiles: ["scripts/check.py"],
  shellFiles: ["scripts/setup.sh"],
  sourceFiles: ["src/app.ts"],
  sqlFiles: ["data/schema.sql"],
  tomlFiles: ["pyproject.toml"],
  yamlFiles: [".github/workflows/ci.yml"],
};

describe(LanguagesService, () => {
  let service: LanguagesService;
  let cssService: CssService;
  let jupyterService: JupyterService;
  let pythonService: PythonService;
  let yamlService: YamlService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CommentsService,
        CssCommentsService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        HashCommentsService,
        HclCommentsService,
        LanguageCommentsService,
        SqlCommentsService,
        TypescriptCommentsService,
        YamlCommentsService,
        LanguagesService,
        { provide: CssService, useValue: createMock<CssService>() },
        { provide: HclService, useValue: createMock<HclService>() },
        { provide: JsonService, useValue: createMock<JsonService>() },
        { provide: JupyterService, useValue: createMock<JupyterService>() },
        { provide: MarkdownService, useValue: createMock<MarkdownService>() },
        { provide: PythonService, useValue: createMock<PythonService>() },
        { provide: ShellService, useValue: createMock<ShellService>() },
        { provide: SqlService, useValue: createMock<SqlService>() },
        { provide: TomlService, useValue: createMock<TomlService>() },
        {
          provide: TypescriptService,
          useValue: createMock<TypescriptService>(),
        },
        { provide: YamlService, useValue: createMock<YamlService>() },
      ],
    }).compile();

    service = await module.resolve(LanguagesService);
    cssService = await module.resolve(CssService);
    jupyterService = await module.resolve(JupyterService);
    pythonService = await module.resolve(PythonService);
    yamlService = await module.resolve(YamlService);
  });

  beforeEach(() => {
    service.analyze({
      commentCounters,
      configuration,
      discoveredFiles,
      symbolCounters: [],
      workingDirectory: "/repo",
    });
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("gives each analyzer only the files of its own language", () => {
    expect(cssService.analyze).toHaveBeenCalledWith({
      cssFiles: ["src/styles.css"],
      workingDirectory: "/repo",
    });
    expect(yamlService.analyze).toHaveBeenCalledWith({
      workingDirectory: "/repo",
      yamlFiles: [".github/workflows/ci.yml"],
    });
  });

  it("passes the configured interpreter to both Python readers", () => {
    // The notebook analyzer runs the same interpreter over its code cells.
    expect(pythonService.analyze).toHaveBeenCalledWith({
      command: "uv run python",
      pythonFiles: ["scripts/check.py"],
      workingDirectory: "/repo",
    });
    expect(jupyterService.analyze).toHaveBeenCalledWith({
      notebookFiles: ["notebooks/explore.ipynb"],
      pythonCommand: "uv run python",
      workingDirectory: "/repo",
    });
  });

  it("hands every counter to both the comment readers and typescript", async () => {
    const module = await Test.createTestingModule({
      providers: [
        LanguagesService,
        {
          provide: LanguageCommentsService,
          useValue: createMock<LanguageCommentsService>(),
        },
        { provide: CssService, useValue: createMock<CssService>() },
        { provide: HclService, useValue: createMock<HclService>() },
        { provide: JsonService, useValue: createMock<JsonService>() },
        { provide: JupyterService, useValue: createMock<JupyterService>() },
        { provide: MarkdownService, useValue: createMock<MarkdownService>() },
        { provide: PythonService, useValue: createMock<PythonService>() },
        { provide: ShellService, useValue: createMock<ShellService>() },
        { provide: SqlService, useValue: createMock<SqlService>() },
        { provide: TomlService, useValue: createMock<TomlService>() },
        {
          provide: TypescriptService,
          useValue: createMock<TypescriptService>(),
        },
        { provide: YamlService, useValue: createMock<YamlService>() },
      ],
    }).compile();

    const isolatedService = await module.resolve(LanguagesService);
    const isolatedLanguageComments = await module.resolve(
      LanguageCommentsService,
    );
    const isolatedTypescriptService = await module.resolve(TypescriptService);

    isolatedService.analyze({
      commentCounters,
      configuration,
      discoveredFiles,
      symbolCounters: [],
      workingDirectory: "/repo",
    });

    expect(isolatedTypescriptService.analyze).toHaveBeenCalledWith(
      expect.objectContaining({ commentCounters }),
    );
    expect(isolatedLanguageComments.measure).toHaveBeenCalledWith(
      expect.objectContaining({ counters: commentCounters }),
    );
  });

  it("reports one entry per language", () => {
    const results = service.analyze({
      commentCounters,
      configuration,
      discoveredFiles,
      symbolCounters: [],
      workingDirectory: "/repo",
    });

    expect(Object.keys(results).toSorted()).toStrictEqual([
      "commentCounts",
      "css",
      "hcl",
      "json",
      "jupyter",
      "markdown",
      "python",
      "shell",
      "sql",
      "toml",
      "typescript",
      "yaml",
    ]);
  });
});
