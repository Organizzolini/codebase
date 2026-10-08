import { describe, expect, it } from "vitest";

import { CatalogService } from "./catalog.service.js";

describe("CatalogService", () => {
  it("blanks an item without pricing it", () => {
    expect(CatalogService.blank("item-1").price).toBe(0);
  });
});
