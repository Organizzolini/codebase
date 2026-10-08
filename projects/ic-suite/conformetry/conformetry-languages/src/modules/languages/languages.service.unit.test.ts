import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { LanguagesModule } from "./languages.module";
import { LanguagesService } from "./languages.service";

import type { PreparedValidationDocument } from "@conformetry/core";

function createDocument(args: {
  filename: string;
  instance: string;
  renderedTemplate: string;
}): PreparedValidationDocument {
  return {
    filename: args.filename,
    instance: args.instance,
    instanceFilePath: `/instance/${args.filename}`,
    renderedTemplate: args.renderedTemplate,
    templateFilePath: `/template/${args.filename}`,
  };
}

function readNames(validators: { descriptor: { name: string } }[]): string[] {
  return validators.map((validator) => {
    return validator.descriptor.name;
  });
}

describe(LanguagesService, () => {
  let service: LanguagesService;

  beforeAll(async () => {
    // The real Languages rather than mocks: resolution is a question about
    // what the engines claim, so mocking their descriptors would test the
    // mock's answer instead of theirs.
    const module = await Test.createTestingModule({
      imports: [LanguagesModule],
      providers: [LanguagesService],
    }).compile();

    service = await module.resolve(LanguagesService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("resolves an extension to the language that claims it", () => {
    expect(
      readNames(service.resolveValidators({ extensions: [".ts"] })),
    ).toStrictEqual(["typescript"]);
  });

  it("leaves out the languages no extension in the run needs", () => {
    expect(
      readNames(service.resolveValidators({ extensions: [".json"] })),
    ).toStrictEqual(["json"]);
  });

  it("resolves every language when every language is in play", () => {
    expect(
      readNames(
        service.resolveValidators({
          extensions: [".ipynb", ".json", ".md", ".py", ".tsx"],
        }),
      ),
    ).toStrictEqual(["json", "jupyter", "markdown", "python", "typescript"]);
  });

  it("routes an extension no language claims to the fallback", () => {
    expect(
      readNames(service.resolveValidators({ extensions: [".toml"] })),
    ).toStrictEqual(["text"]);
  });

  it("adds no fallback when every extension is claimed", () => {
    expect(
      readNames(service.resolveValidators({ extensions: [".json", ".ts"] })),
    ).toStrictEqual(["json", "typescript"]);
  });

  it("resolves nothing for a run with no extensions", () => {
    // Not even the fallback: there is no file for it to compare, so adding it
    // would put a language in the report that had nothing to say.
    expect(service.resolveValidators({ extensions: [] })).toStrictEqual([]);
  });

  it("reaches the text language through the fallback, not as a claimer", () => {
    // `.txt` is the text language's own extension, but the text language is
    // not among the claimers — so a run holding only `.txt` arrives here the
    // same way `.toml` does, and still claims `.txt`.
    const [fallback] = service.resolveValidators({ extensions: [".txt"] });

    expect(fallback?.descriptor.name).toBe("text");
    expect(fallback?.descriptor.fileExtensions).toContain(".txt");
  });

  it("widens the fallback over exactly the unclaimed extensions", () => {
    const validators = service.resolveValidators({
      extensions: [".json", ".toml", ".cfg"],
    });
    const fallback = validators.find((validator) => {
      return validator.descriptor.name === "text";
    });

    expect(readNames(validators)).toStrictEqual(["json", "text"]);
    expect(fallback?.descriptor.fileExtensions).toStrictEqual([
      ".txt",
      ".toml",
      ".cfg",
    ]);
  });

  it("compares an unclaimed extension through the text language", () => {
    const [fallback] = service.resolveValidators({ extensions: [".toml"] });
    const result = fallback?.validateDocument(
      createDocument({
        filename: "settings.toml",
        instance: "port = 8080\n",
        renderedTemplate: "port = 8080\nhost = localhost\n",
      }),
    );

    expect(result?.differences).toStrictEqual([
      expect.objectContaining({
        language: "text",
        message: "Missing line: host = localhost",
      }),
    ]);
  });
});
