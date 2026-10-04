import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { {{namePascalCase}}Loader } from "./{{nameKebabCase}}.loader";
import { {{namePascalCase}}Service } from "./{{nameKebabCase}}.service";

describe({{namePascalCase}}Loader, () => {
  let dataloader: {{namePascalCase}}Loader;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        {{namePascalCase}}Loader,
        {
          provide: {{namePascalCase}}Service,
          useValue: {},
        },
      ],
    }).compile();

    dataloader = await module.resolve({{namePascalCase}}Loader);
  });

  it("is defined", () => {
    expect(dataloader).toBeDefined();
  });
});
