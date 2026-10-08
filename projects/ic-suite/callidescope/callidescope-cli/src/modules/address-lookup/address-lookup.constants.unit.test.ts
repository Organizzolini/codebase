import {
  ProjectConfigurationError,
  ProjectConfigurationFieldNotPermittedError,
} from "@callidescope/configuration";
import { describe, expect, it } from "vitest";

import { isRefusedProjectConfiguration } from "./address-lookup.constants";

describe(isRefusedProjectConfiguration, () => {
  // A lookup traces before it matches, so it loads every reached project's
  // own configuration and inherits both refusals that can come of it.
  it("recognizes both refusals a project's own configuration can earn", () => {
    expect(
      isRefusedProjectConfiguration(
        new ProjectConfigurationError({
          cause: new Error("Unexpected token."),
          configurationPath: "packages/thing/callidescope.config.ts",
          project: "packages/thing",
        }),
      ),
    ).toBe(true);
    expect(
      isRefusedProjectConfiguration(
        new ProjectConfigurationFieldNotPermittedError({
          field: "excludeFrom",
          project: "packages/thing",
        }),
      ),
    ).toBe(true);
  });

  // Narrow on purpose: anything else is callidescope's own fault and must
  // keep its stack rather than be reported as a file somebody wrote.
  it.each([
    ["a plain error", new Error("Trace failed.")],
    ["a type error", new TypeError("Not a function.")],
    ["a thrown string", "Trace failed."],
    ["nothing at all", undefined],
  ])("does not recognize %s", (_description, error) => {
    expect(isRefusedProjectConfiguration(error)).toBe(false);
  });
});
