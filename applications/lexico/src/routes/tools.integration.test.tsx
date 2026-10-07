import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderRoute } from "../../testing/render-route";

import { Route } from "./tools";

describe("tools", () => {
  it("renders its page", async () => {
    await renderRoute("/tools");

    await expect(
      screen.findByRole("heading", { level: 1 }),
    ).resolves.toBeDefined();
    expect(Route.fullPath).toBe("/tools");
  });
});
