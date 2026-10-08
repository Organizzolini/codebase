import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { PythonImportParserService } from "./python-import-parser.service";

describe(PythonImportParserService, () => {
  let service: PythonImportParserService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [PythonImportParserService],
    }).compile();

    service = await module.resolve(PythonImportParserService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("parses a plain import statement", () => {
    expect(service.parseImportSpecifiers("import re\n")).toStrictEqual([
      { level: 0, modulePath: "re" },
    ]);
  });

  it("parses a dotted plain import statement", () => {
    expect(
      service.parseImportSpecifiers("import src.output as output_module\n"),
    ).toStrictEqual([{ level: 0, modulePath: "src.output" }]);
  });

  it("parses every module named on a comma-separated import statement", () => {
    expect(
      service.parseImportSpecifiers("import os, sys as system\n"),
    ).toStrictEqual([
      { level: 0, modulePath: "os" },
      { level: 0, modulePath: "sys" },
    ]);
  });

  it("parses an absolute from-import statement", () => {
    expect(
      service.parseImportSpecifiers("from src.grammars import Grammar\n"),
    ).toStrictEqual([{ level: 0, modulePath: "src.grammars" }]);
  });

  it("parses a multi-line, parenthesized from-import statement", () => {
    const source = [
      "from src.prompts import (",
      "    PROMPT_A,",
      "    PROMPT_B,",
      ")",
      "",
    ].join("\n");

    expect(service.parseImportSpecifiers(source)).toStrictEqual([
      { level: 0, modulePath: "src.prompts" },
    ]);
  });

  it("parses a bare relative from-import statement", () => {
    expect(
      service.parseImportSpecifiers("from . import helper\n"),
    ).toStrictEqual([{ level: 1, modulePath: "" }]);
  });

  it("parses a dotted relative from-import statement", () => {
    expect(
      service.parseImportSpecifiers("from ..outer.module import name\n"),
    ).toStrictEqual([{ level: 2, modulePath: "outer.module" }]);
  });

  it("ignores an import keyword mentioned inside a comment", () => {
    expect(
      service.parseImportSpecifiers("# from src.grammars import Grammar\n"),
    ).toStrictEqual([]);
  });

  it("ignores an import keyword mentioned inside a string literal", () => {
    expect(
      service.parseImportSpecifiers(
        'GREETING = "please import src.grammars"\n',
      ),
    ).toStrictEqual([]);
  });

  it("ignores an import statement nested inside a function body", () => {
    const source = ["def helper():", "    import re", "    return re\n"].join(
      "\n",
    );

    expect(service.parseImportSpecifiers(source)).toStrictEqual([]);
  });

  it("returns nothing for a file with no imports", () => {
    expect(service.parseImportSpecifiers("value = 1\n")).toStrictEqual([]);
  });

  it("rejoins a backslash-continued import statement", () => {
    const source = ["import os, \\", "    sys", ""].join("\n");

    expect(service.parseImportSpecifiers(source)).toStrictEqual([
      { level: 0, modulePath: "os" },
      { level: 0, modulePath: "sys" },
    ]);
  });

  it("ignores a from-statement that never reaches its import clause", () => {
    expect(service.parseImportSpecifiers("from import x\n")).toStrictEqual([]);
  });

  it("ignores a bare import keyword with no module named", () => {
    expect(service.parseImportSpecifiers("import\n")).toStrictEqual([]);
  });
});
