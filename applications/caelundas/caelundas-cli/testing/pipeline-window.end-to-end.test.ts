import { describe, expect, it } from "vitest";

import { runPipelineWindow } from "./pipeline-window.utilities";

const philadelphia = { latitude: 39.949_309, longitude: -75.171_69 };
const equinoxDay = {
  ...philadelphia,
  endDate: "2026-03-21",
  startDate: "2026-03-20",
};

describe(runPipelineWindow, { timeout: 120_000 }, () => {
  it("detects perfective events and derives progressive ones from them", async () => {
    expect.hasAssertions();

    const window = await runPipelineWindow(equinoxDay);

    expect(window.perfective.length).toBeGreaterThan(0);
    expect(window.progressive.length).toBeGreaterThan(0);
    expect(window.events).toHaveLength(
      window.perfective.length + window.progressive.length,
    );
    expect(window.input.timezone).toBe("America/New_York");
  });

  it("returns every event sorted by start time", async () => {
    expect.hasAssertions();

    const { events } = await runPipelineWindow(equinoxDay);
    const starts = events.map((event) => event.start.valueOf());

    expect(starts).toStrictEqual(starts.toSorted((a, b) => a - b));
  });

  it("reuses a window it has already swept", async () => {
    expect.hasAssertions();

    await expect(runPipelineWindow(equinoxDay)).resolves.toBe(
      await runPipelineWindow({ ...equinoxDay }),
    );
  });
});
