import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderRoute } from "../../testing/render-route";

import { Route } from "./word.$id";

// The loader reads the entry through a server function, which only runs
// inside the Start runtime; an unknown entry renders the not-found page.
vi.mock("../lib/search", () => {
  return { getEntry: vi.fn().mockResolvedValue(null) };
});

describe("word.$id", () => {
  it("renders its page", async () => {
    await renderRoute("/word/$id");

    await expect(
      screen.findByRole("heading", { level: 1 }),
    ).resolves.toBeDefined();
    expect(Route.fullPath).toBe("/word/$id");
  });
});
