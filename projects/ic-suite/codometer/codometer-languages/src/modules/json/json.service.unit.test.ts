import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { LoggerService } from "@codebase/logging";

import { JsonService } from "./json.service";

import type { DeepMocked } from "@golevelup/ts-vitest";
import type * as NodeFileSystem from "node:fs";

// Reads stay real except for one sentinel path, which throws a bare string:
// a rejected promise or a thrown literal is not an Error, and the analyzer
// still has to report which file it gave up on.
vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof NodeFileSystem>();

  return {
    ...actual,
    readFileSync: (filePath: string, encoding: "utf8") => {
      if (filePath.endsWith("throws-a-string.json")) {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw "not an Error";
      }

      return actual.readFileSync(filePath, encoding);
    },
  };
});

describe(JsonService, () => {
  let service: JsonService;
  let loggerService: DeepMocked<LoggerService>;
  let tempDirectory: string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        JsonService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    service = await module.resolve(JsonService);
    loggerService = await module.resolve(LoggerService);
  });

  beforeEach(() => {
    tempDirectory = mkdtempSync(path.join(tmpdir(), "codometer-json-"));
  });

  afterEach(() => {
    rmSync(tempDirectory, { force: true, recursive: true });
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("counts object, array, primitive, and nesting metrics in JSON files", () => {
    const filePath = path.join(tempDirectory, "sample.json");
    const content = `{
  "name": "codometer",
  "enabled": true,
  "count": 2,
  "nested": {
    "items": [1, "two", null, false],
    "meta": {
      "active": false
    }
  },
  "empty": []
}
`;

    writeFileSync(filePath, content, "utf8");

    const result = service.analyze({
      jsonFiles: [path.relative(tempDirectory, filePath)],
      workingDirectory: tempDirectory,
    });

    expect(result.files).toBe(1);
    expect(result.lines).toBe(
      content.split("\n").filter((line) => line.trim() !== "").length,
    );
    expect(result.objects).toBe(3);
    expect(result.arrays).toBe(2);
    expect(result.strings).toBe(2);
    expect(result.numbers).toBe(2);
    expect(result.booleans).toBe(3);
    expect(result.nulls).toBe(1);
    expect(result.properties).toBe(8);
    expect(result.items).toBe(4);
    expect(result.totalNodes).toBe(13);
    expect(result.maxDepth).toBe(4);
  });

  it("parses jsonc comments and jsonl documents", () => {
    const jsoncFilePath = path.join(tempDirectory, "config.jsonc");
    const jsonlFilePath = path.join(tempDirectory, "events.jsonl");

    writeFileSync(
      jsoncFilePath,
      `// comment\n{ "enabled": true, "count": 3 }\n`,
      "utf8",
    );
    writeFileSync(jsonlFilePath, `{"name":"one"}\n{"name":"two"}\n`, "utf8");

    const result = service.analyze({
      jsonFiles: [
        path.relative(tempDirectory, jsoncFilePath),
        path.relative(tempDirectory, jsonlFilePath),
      ],
      workingDirectory: tempDirectory,
    });

    expect(result.files).toBe(2);
    expect(result.lines).toBe(4);
    expect(result.objects).toBe(3);
    expect(result.booleans).toBe(1);
    expect(result.numbers).toBe(1);
    expect(result.strings).toBe(2);
  });

  it("parses JSONC content carrying escaped backslashes and quotes", () => {
    const filePath = path.join(tempDirectory, "escaped.jsonc");
    const backslash = String.fromCodePoint(92);
    const content = JSON.stringify(
      {
        escaped: ["line", backslash, "n", "break"].join(""),
        path: `C:${backslash}${backslash}Users${backslash}${backslash}root`,
        quote: 'say "hello"',
      },
      undefined,
      2,
    );

    writeFileSync(filePath, `${content}${String.fromCodePoint(10)}`, "utf8");

    const result = service.analyze({
      jsonFiles: [path.relative(tempDirectory, filePath)],
      workingDirectory: tempDirectory,
    });

    expect(result.files).toBe(1);
    expect(result.objects).toBe(1);
    expect(result.strings).toBe(3);
  });

  it("handles files with no content gracefully", () => {
    const filePath = path.join(tempDirectory, "empty.json");
    writeFileSync(filePath, "", "utf8");

    const result = service.analyze({
      jsonFiles: [path.relative(tempDirectory, filePath)],
      workingDirectory: tempDirectory,
    });

    expect(result.files).toBe(1);
    expect(result.objects).toBe(0);
    expect(result.arrays).toBe(0);
    expect(result.strings).toBe(0);
  });

  it("handles JSONC block comments with quotes inside", () => {
    const filePath = path.join(tempDirectory, "block-comment.jsonc");
    writeFileSync(
      filePath,
      `{
  /* comment with "quote" inside */
  "value": 42
}
`,
      "utf8",
    );

    const result = service.analyze({
      jsonFiles: [path.relative(tempDirectory, filePath)],
      workingDirectory: tempDirectory,
    });

    expect(result.files).toBe(1);
    expect(result.objects).toBe(1);
    expect(result.numbers).toBe(1);
  });

  it("counts nested arrays correctly", () => {
    const filePath = path.join(tempDirectory, "nested-arrays.json");
    writeFileSync(
      filePath,
      `{
  "outer": [
    [1, 2],
    [3, 4]
  ],
  "empty": []
}
`,
      "utf8",
    );

    const result = service.analyze({
      jsonFiles: [path.relative(tempDirectory, filePath)],
      workingDirectory: tempDirectory,
    });

    expect(result.objects).toBe(1);
    expect(result.arrays).toBe(4);
    expect(result.numbers).toBe(4);
  });

  it("skips unreadable files without failing the batch", () => {
    const filePath = path.join(tempDirectory, "missing.json");

    const result = service.analyze({
      jsonFiles: [path.relative(tempDirectory, filePath)],
      workingDirectory: tempDirectory,
    });

    expect(result.files).toBe(1);
    expect(result.lines).toBe(0);
    expect(result.objects).toBe(0);
    expect(result.arrays).toBe(0);
  });

  it("warns and continues when a file cannot be read", () => {
    const filePath = path.join(tempDirectory, "missing.json");

    service.analyze({
      jsonFiles: [path.relative(tempDirectory, filePath)],
      workingDirectory: tempDirectory,
    });

    expect(loggerService.warn).toHaveBeenCalledWith(
      "🧮 Skipped JSON analysis",
      undefined,
      expect.objectContaining({ path: filePath }),
    );
  });

  it("warns and continues when a document cannot be parsed", () => {
    const filePath = path.join(tempDirectory, "broken.json");
    writeFileSync(filePath, "{ not json", "utf8");

    service.analyze({
      jsonFiles: [path.relative(tempDirectory, filePath)],
      workingDirectory: tempDirectory,
    });

    expect(loggerService.warn).toHaveBeenCalledWith(
      "🧮 Skipped JSON analysis",
      undefined,
      expect.objectContaining({ path: filePath }),
    );
  });

  it("reports a non-Error thrown value as a plain string", () => {
    const filePath = path.join(tempDirectory, "throws-a-string.json");

    service.analyze({
      jsonFiles: [path.relative(tempDirectory, filePath)],
      workingDirectory: tempDirectory,
    });

    expect(loggerService.warn).toHaveBeenCalledWith(
      "🧮 Skipped JSON analysis",
      undefined,
      expect.objectContaining({ path: filePath, reason: "not an Error" }),
    );
  });
});
