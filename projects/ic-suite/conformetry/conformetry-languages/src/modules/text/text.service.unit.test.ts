import { createPlaceholderValue } from "@conformetry/configuration";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { TextService } from "./text.service";

import type { PreparedValidationDocument } from "@conformetry/core";

function createDocument(args: {
  instance: string;
  renderedTemplate: string;
}): PreparedValidationDocument {
  return {
    filename: "notes.txt",
    instance: args.instance,
    instanceFilePath: "/project/notes.txt",
    renderedTemplate: args.renderedTemplate,
    templateFilePath: "/templates/notes.txt",
  };
}

describe(TextService, () => {
  let service: TextService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [TextService],
    }).compile();

    service = await module.resolve(TextService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("claims only .txt files", () => {
    expect(service.descriptor.fileExtensions).toStrictEqual([".txt"]);
    expect(service.descriptor.name).toBe("text");
  });

  it("accepts an instance containing every template line", () => {
    expect(
      service.validateDocument(
        createDocument({ instance: "a\nb", renderedTemplate: "a\nb" }),
      ).differences,
    ).toStrictEqual([]);
  });

  it("accepts extra lines, since the template is a lower bound", () => {
    expect(
      service.validateDocument(
        createDocument({ instance: "a\nextra\nb", renderedTemplate: "a\nb" }),
      ).differences,
    ).toStrictEqual([]);
  });

  it("ignores line order", () => {
    expect(
      service.validateDocument(
        createDocument({ instance: "b\na", renderedTemplate: "a\nb" }),
      ).differences,
    ).toStrictEqual([]);
  });

  it("reports a missing line with its template line number", () => {
    const { differences } = service.validateDocument(
      createDocument({ instance: "a", renderedTemplate: "a\nmissing" }),
    );

    expect(differences).toHaveLength(1);
    expect(differences[0]?.message).toBe("Missing line: missing");
    expect(differences[0]?.templateLine).toBe(2);
    expect(differences[0]?.expected).toBe("missing");
    expect(differences[0]?.language).toBe("text");
  });

  it("requires a duplicated template line to appear as often", () => {
    const { differences } = service.validateDocument(
      createDocument({ instance: "a", renderedTemplate: "a\na" }),
    );

    expect(differences).toHaveLength(1);
    expect(differences[0]?.templateLine).toBe(2);
  });

  it("weighs every template line, conforming ones included", () => {
    const conforming = service.validateDocument(
      createDocument({ instance: "a\nb\nc", renderedTemplate: "a\nb\nc" }),
    );

    // A file that conforms still contributes its whole denominator; counting
    // only the broken lines would score every clean instance against nothing.
    expect(conforming).toStrictEqual({
      captures: {},
      differences: [],
      totalWeight: 3,
    });
  });

  it("weighs each missing line as one requirement", () => {
    const result = service.validateDocument(
      createDocument({ instance: "a", renderedTemplate: "a\nb\nc" }),
    );

    expect(result.totalWeight).toBe(3);
    expect(result.differences.map((error) => error.weight)).toStrictEqual([
      undefined,
      undefined,
    ]);
  });

  it("carries an actionable fix", () => {
    const { differences } = service.validateDocument(
      createDocument({ instance: "", renderedTemplate: "needed" }),
    );

    expect(differences[0]?.fix).toBe(
      "Add the line `needed` to the instance file.",
    );
  });

  it("captures a line a placeholder value stands in for", () => {
    const value = createPlaceholderValue();
    const result = service.validateDocument(
      createDocument({
        instance: "first\nport=8080\nlast",
        renderedTemplate: `first\nport=${value}\nlast`,
      }),
    );

    expect(result.differences).toStrictEqual([]);
    expect(result.captures).toStrictEqual({ [value]: "8080" });
  });
});
