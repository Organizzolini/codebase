import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PronunciationButton } from "./pronunciation-button";

describe(PronunciationButton, () => {
  it("applies its class name", () => {
    render(
      <PronunciationButton
        className="pronunciation-button"
        text="amo"
      />,
    );

    expect(screen.getByTestId("pronunciation-button").className).toBe(
      "pronunciation-button",
    );
  });

  it("names the dialect it plays", () => {
    render(
      <PronunciationButton
        dialect="ecclesiastical"
        text="amo"
      />,
    );

    expect(
      screen.getByTitle("Play ecclesiastical pronunciation"),
    ).toBeDefined();
  });
});
