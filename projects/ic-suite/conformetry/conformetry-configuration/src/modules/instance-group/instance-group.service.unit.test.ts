import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { InstanceGroupService } from "./instance-group.service";

describe(InstanceGroupService, () => {
  let service: InstanceGroupService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [InstanceGroupService],
    }).compile();

    service = await module.resolve(InstanceGroupService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("isProjectScoped", () => {
    it.each([
      ["an untagged group", { patterns: ["packages/*"] }, false],
      ["a group tagged empty", { patterns: ["packages/*"], tags: [] }, false],
      ["a tagged group", { patterns: ["src/*"], tags: ["nestjs"] }, true],
      ["a group naming only tags", { tags: ["nestjs"] }, true],
    ])("reads %s as %s", (_description, group, expected) => {
      expect(service.isProjectScoped(group)).toBe(expected);
    });
  });
});
