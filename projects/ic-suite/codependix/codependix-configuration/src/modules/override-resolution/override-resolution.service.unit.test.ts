import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { OverrideResolutionService } from "./override-resolution.service";

import type { ResolvedCodependixConfiguration } from "../configuration/configuration.types";

/** A resolved configuration with the defaults these tests assume. */
function buildResolved(): ResolvedCodependixConfiguration {
  return {
    boundaries: {
      fileImports: { python: [], typescript: [] },
      nestjsModules: [],
      nxProjects: [],
    },
    exclude: [],
    include: ["packages/**"],
    projectGraph: undefined,
    selection: { projects: [], tags: [] },
    workspace: {},
  };
}

describe(OverrideResolutionService, () => {
  let service: OverrideResolutionService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [OverrideResolutionService],
    }).compile();

    service = await module.resolve(OverrideResolutionService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("leaves the resolved configuration untouched when no overrides are given", () => {
    const resolved = buildResolved();

    const applied = service.applyOverrides({
      authored: { include: ["packages/**"] },
      overrides: undefined,
      resolved,
    });

    expect(applied).toBe(resolved);
  });

  it("overrides include when the author declared it", () => {
    const applied = service.applyOverrides({
      authored: { include: ["packages/**"] },
      overrides: { include: ["applications/**"] },
      resolved: buildResolved(),
    });

    expect(applied.include).toStrictEqual(["applications/**"]);
  });

  it("overrides exclude when the author declared it", () => {
    const applied = service.applyOverrides({
      authored: { exclude: ["scratch-*"], include: ["packages/**"] },
      overrides: { exclude: ["fixtures-*"] },
      resolved: { ...buildResolved(), exclude: ["scratch-*"] },
    });

    expect(applied.exclude).toStrictEqual(["fixtures-*"]);
  });

  it("refuses to override include the author never declared", () => {
    expect(() =>
      service.applyOverrides({
        authored: {},
        overrides: { include: ["applications/**"] },
        resolved: buildResolved(),
      }),
    ).toThrow(
      "--include overrides a value the configuration does not declare. Add `include` to the configuration this run reads, then use --include to change it.",
    );
  });

  it("refuses to override exclude the author never declared", () => {
    expect(() =>
      service.applyOverrides({
        authored: { include: ["packages/**"] },
        overrides: { exclude: ["fixtures-*"] },
        resolved: buildResolved(),
      }),
    ).toThrow(
      "--exclude overrides a value the configuration does not declare. Add `exclude` to the configuration this run reads, then use --exclude to change it.",
    );
  });

  it("ignores an empty override list, the same as an absent one", () => {
    const applied = service.applyOverrides({
      authored: {},
      overrides: { include: [] },
      resolved: buildResolved(),
    });

    expect(applied.include).toStrictEqual(["packages/**"]);
  });
});
