import { describe, expect, it } from "vitest";

import { buildTargetsGroup } from "./markdown.utilities";

// One top-level block per file, so the badge renderers this module exposes
// are described together rather than as separate suites. `formatBytes`
// itself is tested in `../render/render.utilities.unit.test.ts`, the module
// this one now delegates to.
describe("output markdown utilities", () => {
  describe(buildTargetsGroup, () => {
    it("renders nothing when no target was measured", () => {
      expect(buildTargetsGroup([])).toBe("");
    });

    it("renders one badge per target, in the order they were measured", () => {
      const group = buildTargetsGroup([
        { bytes: 5324, compression: "gzip", name: "Compiled JavaScript" },
        { bytes: 800, compression: "brotli", name: "Client CSS" },
      ]);

      expect(group.startsWith("### Measured Targets")).toBe(true);
      expect(group.indexOf("Compiled_JavaScript_Size")).toBeLessThan(
        group.indexOf("Client_CSS_Size"),
      );
      expect(group).toContain("Client_CSS_Size-0.80_kB_brotli");
    });
  });
});
