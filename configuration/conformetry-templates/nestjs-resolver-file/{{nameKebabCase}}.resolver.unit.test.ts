import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { {{namePascalCase}}Resolver } from "./{{nameKebabCase}}.resolver";

describe({{namePascalCase}}Resolver, () => {
  let resolver: {{namePascalCase}}Resolver;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [{{namePascalCase}}Resolver],
    }).compile();

    resolver = await module.resolve({{namePascalCase}}Resolver);
  });

  it("is defined", () => {
    expect(resolver).toBeDefined();
  });
});
