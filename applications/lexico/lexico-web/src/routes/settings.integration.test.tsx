import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderRoute } from "../../testing/render-route";

import { Route } from "./settings";

describe("settings", () => {
  it("renders its page", async () => {
    await renderRoute("/settings");

    await expect(
      screen.findByRole("heading", { level: 1 }),
    ).resolves.toBeDefined();
    expect(Route.fullPath).toBe("/settings");
  });
});
