import { describe, expect, it } from "vitest";

import { LoggerModule } from "@codebase/logging";

import { ReadmeProjectsCommand } from "./readme-projects.command";
import { ReadmeProjectsModule } from "./readme-projects.module";
import { ReadmeProjectsService } from "./readme-projects.service";

describe(ReadmeProjectsModule, () => {
  it("registers expected imports and providers", () => {
    expect.hasAssertions();

    const imports = Reflect.getMetadata("imports", ReadmeProjectsModule) as
      | undefined
      | unknown[];
    const providers = Reflect.getMetadata("providers", ReadmeProjectsModule) as
      | undefined
      | unknown[];

    expect(imports).toContain(LoggerModule);
    expect(providers).toContain(ReadmeProjectsCommand);
    expect(providers).toContain(ReadmeProjectsService);
  });
});
