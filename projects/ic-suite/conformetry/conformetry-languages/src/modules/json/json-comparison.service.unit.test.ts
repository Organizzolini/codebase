import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { ScoringService } from "../scoring/scoring.service";

import { JsonComparisonService } from "./json-comparison.service";

import type { JsonValue } from "./json.types";
import type { ConformetryDifference } from "@conformetry/core";

describe(JsonComparisonService, () => {
  let service: JsonComparisonService;

  function compare(
    templateValue: JsonValue,
    instanceValue: JsonValue,
  ): ConformetryDifference[] {
    return service.compare({
      instanceValue,
      language: "json",
      templateValue,
    }).differences;
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [JsonComparisonService, ScoringService],
    }).compile();

    service = await module.resolve(JsonComparisonService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("accepts an instance that adds keys the template does not declare", () => {
    expect(compare({ a: 1 }, { a: 1, extra: true })).toStrictEqual([]);
  });

  it("reports a missing key with its JSON path", () => {
    const differences = compare({ scripts: { build: "tsc" } }, { scripts: {} });

    expect(differences).toHaveLength(1);
    expect(differences[0]?.message).toBe(
      'Missing required key "scripts.build"',
    );
    expect(differences[0]?.instancePath).toBe("scripts.build");
    expect(differences[0]?.language).toBe("json");
  });

  it("reports a mismatched scalar with expected and actual", () => {
    const differences = compare({ target: "es2023" }, { target: "esnext" });

    expect(differences[0]?.expected).toBe('"es2023"');
    expect(differences[0]?.actual).toBe('"esnext"');
    expect(differences[0]?.instancePath).toBe("target");
  });

  it("accepts a required array scalar in any position", () => {
    expect(compare({ tags: ["a"] }, { tags: ["z", "a"] })).toStrictEqual([]);
  });

  it("reports a required array scalar that is absent", () => {
    const differences = compare({ tags: ["a"] }, { tags: ["z"] });

    expect(differences).toHaveLength(1);
    expect(differences[0]?.message).toContain(
      'Missing required array value "a"',
    );
    expect(differences[0]?.instancePath).toBe("tags");
  });

  it("reports an empty array where the template requires a structure", () => {
    const differences = compare({ items: [{ id: 1 }] }, { items: [] });

    expect(differences).toHaveLength(1);
    expect(differences[0]?.message).toBe(
      'Missing required array structure at "items"',
    );
  });

  it("matches the array entry that produces the fewest differences", () => {
    const differences = compare(
      { items: [{ id: 1, kind: "a" }] },
      {
        items: [
          { id: 9, kind: "z" },
          { id: 1, kind: "a" },
        ],
      },
    );

    expect(differences).toStrictEqual([]);
  });

  it("indexes array paths", () => {
    const differences = compare({ items: [{ id: 1 }] }, { items: [{ id: 2 }] });

    expect(differences[0]?.instancePath).toBe("items[0].id");
  });

  it("attributes differences to the requesting language", () => {
    const differences = service.compare({
      instanceValue: {},
      language: "python",
      templateValue: { a: 1 },
    }).differences;

    expect(differences[0]?.language).toBe("python");
  });

  it("prefers the instance entry with the fewest differences", () => {
    // The second instance entry matches the template exactly, so the
    // reduction has to keep looking past the first.
    const differences = compare(
      {
        items: [
          { id: 9, kind: "z" },
          { id: 1, kind: "a" },
        ],
      },
      { items: [{ id: 1, kind: "a" }] },
    );

    expect(differences).toHaveLength(2);
  });

  it("treats an explicit null as present rather than missing", () => {
    expect(compare({ a: null }, { a: null })).toStrictEqual([]);
  });

  it("reports a null the template does not allow", () => {
    const differences = compare({ a: null }, { a: 1 });

    expect(differences).toHaveLength(1);
    expect(differences[0]?.instancePath).toBe("a");
  });

  it("carries an actionable fix", () => {
    const differences = compare({ a: 1 }, {});

    expect(differences[0]?.fix).toBe(
      'Add the key "a" to the instance document.',
    );
  });

  describe("weighing", () => {
    it("weighs a missing object by everything inside it", () => {
      const leaf = service.compare({
        instanceValue: {},
        language: "json",
        templateValue: { a: 1 },
      });
      const subtree = service.compare({
        instanceValue: {},
        language: "json",
        templateValue: { a: { b: 1, c: 2, d: [3, 4] } },
      });

      // Both report one missing key. Without subtree weighting, dropping a
      // whole config section would cost the same as dropping one scalar.
      expect(leaf.differences).toHaveLength(1);
      expect(subtree.differences).toHaveLength(1);
      expect(subtree.differences[0]?.weight).toBeGreaterThan(
        leaf.differences[0]?.weight ?? 0,
      );
    });

    it("counts array entries and their contents toward the total", () => {
      const flat = service.compare({
        instanceValue: { a: [1, 2] },
        language: "json",
        templateValue: { a: [1, 2] },
      });
      const nested = service.compare({
        instanceValue: { a: [{ b: 1 }, { c: 2 }] },
        language: "json",
        templateValue: { a: [{ b: 1 }, { c: 2 }] },
      });

      expect(flat.differences).toStrictEqual([]);
      expect(nested.differences).toStrictEqual([]);
      expect(nested.totalWeight).toBeGreaterThan(flat.totalWeight);
    });

    it("asks for the same amount whether or not the instance supplied it", () => {
      const template = { a: { b: 1, c: [2, 3] } };
      const present = service.compare({
        instanceValue: template,
        language: "json",
        templateValue: template,
      });
      const absent = service.compare({
        instanceValue: {},
        language: "json",
        templateValue: template,
      });

      expect(absent.totalWeight).toBe(present.totalWeight);
    });
  });
});
