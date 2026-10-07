import { createPlaceholderValue } from "@conformetry/configuration";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { ScoringService } from "../scoring/scoring.service";

import { JsonComparisonService } from "./json-comparison.service";
import { JsonService } from "./json.service";

import type { PreparedValidationDocument } from "@conformetry/core";

function createDocument(args: {
  instance: string;
  renderedTemplate: string;
}): PreparedValidationDocument {
  return {
    filename: "tsconfig.json",
    instance: args.instance,
    instanceFilePath: "/project/tsconfig.json",
    renderedTemplate: args.renderedTemplate,
    templateFilePath: "/templates/tsconfig.json",
  };
}

describe(JsonService, () => {
  let service: JsonService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [JsonComparisonService, JsonService, ScoringService],
    }).compile();

    service = await module.resolve(JsonService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("claims JSON and JSONC files", () => {
    expect(service.descriptor.fileExtensions).toStrictEqual([
      ".json",
      ".jsonc",
    ]);
    expect(service.descriptor.name).toBe("json");
  });

  it("accepts an instance that is a superset of the template", () => {
    expect(
      service.validateDocument(
        createDocument({
          instance: '{"a": 1, "b": 2}',
          renderedTemplate: '{"a": 1}',
        }),
      ).differences,
    ).toStrictEqual([]);
  });

  it("reports a missing key", () => {
    const { differences } = service.validateDocument(
      createDocument({ instance: "{}", renderedTemplate: '{"a": 1}' }),
    );

    expect(differences).toHaveLength(1);
    expect(differences[0]?.message).toBe('Missing required key "a"');
  });

  it("reads comments, so a commented tsconfig parses", () => {
    expect(
      service.validateDocument(
        createDocument({
          instance: '{\n  // a comment\n  "a": 1\n}',
          renderedTemplate: '{"a": 1}',
        }),
      ).differences,
    ).toStrictEqual([]);
  });

  it("captures a value and an array entry a placeholder value stands in for", () => {
    const value = createPlaceholderValue();
    const result = service.validateDocument(
      createDocument({
        instance: '{ "name": "@scope/alpha", "tags": ["scope:alpha"] }',
        renderedTemplate: `{ "name": "@scope/${value}", "tags": ["scope:${value}"] }`,
      }),
    );

    expect(result.differences).toStrictEqual([]);
    expect(result.captures).toStrictEqual({ [value]: "alpha" });
  });
});
