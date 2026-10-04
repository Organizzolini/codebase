import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { buildTile } from "../../../testing/tiles";
import { TileService } from "../tile/tile.service";

import { SymmetryService } from "./symmetry.service";

describe(SymmetryService, () => {
  let service: SymmetryService;

  // Five rows, one column: five interior rows whose top point sends a
  // southward edge, then a bare point, then the wrapped east-west rule,
  // then another bare point.
  const singleColumn = buildTile(["s", ".", ".", "e", "."]);

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [SymmetryService, TileService],
    }).compile();

    service = await module.resolve(SymmetryService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("canonicalTile", () => {
    it("hands every member of a symmetry class the same tile", () => {
      const flipped = buildTile([".", "e", ".", "s", "."]);

      expect(service.canonicalTile(flipped)).toStrictEqual(
        service.canonicalTile(singleColumn),
      );
    });

    it("is idempotent, so the representative of a class represents itself", () => {
      const representative = service.canonicalTile(singleColumn);

      expect(service.canonicalTile(representative)).toStrictEqual(
        representative,
      );
    });

    it("picks the member that anchors its edges earliest, which is not always the one written down", () => {
      // A bare point followed by a southward edge is reached earlier than
      // the wrapped rule, so the mirror of this tile is what the corpus
      // draws — the same order the old exact-cover search found covers in.
      const tile = buildTile(["e", "s", "."]);

      expect(service.canonicalTile(tile)).toStrictEqual(
        buildTile(["s", ".", "e"]),
      );
    });
  });

  describe("variants", () => {
    it("holds every distinct tile that draws the same pattern, itself included", () => {
      const variants = service.variants(singleColumn);

      expect(variants).toContainEqual(singleColumn);
      expect(new Set(variants.map((tile) => service.edgeKey(tile))).size).toBe(
        variants.length,
      );
    });

    it("is smaller than the group where a tile is symmetric under one of its elements", () => {
      // Every point bare is fixed by every element of the group.
      expect(service.variants(buildTile([".", ".", "."]))).toHaveLength(1);
      expect(
        service.variants(buildTile(["e.", ".e", ".."])).length,
      ).toBeGreaterThan(1);
    });
  });

  describe("reflections", () => {
    it("holds the tile's mirror, its flip, and both at once, each a member of its symmetry class", () => {
      const tile = buildTile(["s.", ".e", ".."]);
      const members = new Set(
        service.variants(tile).map((variant) => service.edgeKey(variant)),
      );
      const reflections = service.reflections(tile);

      expect(reflections).toHaveLength(3);
      expect(
        reflections.every((reflection) =>
          members.has(service.edgeKey(reflection)),
        ),
      ).toBe(true);
    });

    it("turns a single column upside down, which no shift of it reaches", () => {
      expect(service.reflections(singleColumn)).toContainEqual(
        buildTile([".", "e", ".", "s", "."]),
      );
    });

    it("leaves a tile every mirror and flip fixes unchanged", () => {
      const bare = buildTile(["..", ".."]);

      expect(service.reflections(bare)).toStrictEqual([bare, bare, bare]);
    });
  });

  describe("edgePermutations", () => {
    it("is the whole group as permutations of a shape's edges, one per element, each drawing a variant", () => {
      const tile = buildTile(["s.", ".e", ".."]);
      const key = service.edgeKey(tile);
      const permutations = service.edgePermutations({ columns: 2, rows: 3 });
      const permuted = permutations.map((permutation) => {
        const bits = Array.from(key, () => "0");

        for (const [ordinal, image] of permutation.entries()) {
          bits[image] = key.charAt(ordinal);
        }

        return bits.join("");
      });

      expect(permutations).toHaveLength(8);
      expect(
        permutations.every(
          (permutation) => new Set(permutation).size === key.length,
        ),
      ).toBe(true);
      expect(new Set(permuted)).toStrictEqual(
        new Set(
          service.variants(tile).map((variant) => service.edgeKey(variant)),
        ),
      );
    });
  });
});
