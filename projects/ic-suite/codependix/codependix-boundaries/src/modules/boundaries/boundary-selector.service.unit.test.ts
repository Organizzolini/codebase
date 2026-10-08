import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { BoundarySelectorService } from "./boundary-selector.service";

import type { BoundaryNode } from "./boundaries.types";

const PROJECT_NODE: BoundaryNode = {
  id: "codependix-nx-projects",
  path: "packages/ic-suite/codependix/codependix-nx-projects",
  project: "codependix-nx-projects",
  tags: ["language:typescript", "type:package"],
};

const FILE_NODE: BoundaryNode = {
  id: "src/modules/map/map.types.ts",
  path: "src/modules/map/map.types.ts",
  project: "codependix-cli",
};

const MODULE_NODE: BoundaryNode = { id: "MapModule" };

describe(BoundarySelectorService, () => {
  let service: BoundarySelectorService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [BoundarySelectorService],
    }).compile();

    service = await module.resolve(BoundarySelectorService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("matches an identifier glob", () => {
    expect(service.matches(PROJECT_NODE, { id: ["codependix-*"] })).toBe(true);
    expect(service.matches(PROJECT_NODE, { id: ["codometer-*"] })).toBe(false);
  });

  it("matches any one glob within a field", () => {
    expect(
      service.matches(PROJECT_NODE, { id: ["codometer-*", "codependix-n*"] }),
    ).toBe(true);
  });

  it("narrows across fields rather than widening", () => {
    expect(
      service.matches(FILE_NODE, {
        path: ["**/*.types.ts"],
        project: ["codependix-cli"],
      }),
    ).toBe(true);
    expect(
      service.matches(FILE_NODE, {
        path: ["**/*.types.ts"],
        project: ["codependix-nx-projects"],
      }),
    ).toBe(false);
  });

  it("matches a node carrying one of the named tags", () => {
    expect(service.matches(PROJECT_NODE, { tags: ["type:*"] })).toBe(true);
    expect(service.matches(PROJECT_NODE, { tags: ["framework:react"] })).toBe(
      false,
    );
  });

  it("matches nothing when the level carries no such attribute", () => {
    expect(service.matches(MODULE_NODE, { path: ["**"] })).toBe(false);
    expect(service.matches(MODULE_NODE, { project: ["**"] })).toBe(false);
    expect(service.matches(MODULE_NODE, { tags: ["**"] })).toBe(false);
  });

  it("selects every node when a scope names no selector", () => {
    expect(
      service.selectIds([PROJECT_NODE, MODULE_NODE], undefined),
    ).toStrictEqual(new Set(["codependix-nx-projects", "MapModule"]));
  });

  it("selects only the nodes a scope claims", () => {
    expect(
      service.selectIds([PROJECT_NODE, FILE_NODE], { id: ["**/*.types.ts"] }),
    ).toStrictEqual(new Set(["src/modules/map/map.types.ts"]));
  });

  it("selects nothing when a scope claims no node", () => {
    expect(
      service.selectIds([PROJECT_NODE, FILE_NODE], { id: ["nothing-*"] }),
    ).toStrictEqual(new Set());
  });
});
