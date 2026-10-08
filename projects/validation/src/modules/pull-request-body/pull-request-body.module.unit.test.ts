import { describe, expect, it } from "vitest";

import { LoggerModule } from "@codebase/logging";

import { PullRequestBodyCommand } from "./pull-request-body.command";
import { PullRequestBodyModule } from "./pull-request-body.module";
import { PullRequestBodyService } from "./pull-request-body.service";

describe(PullRequestBodyModule, () => {
  it("registers expected imports and providers", () => {
    expect.hasAssertions();

    const imports = Reflect.getMetadata("imports", PullRequestBodyModule) as
      | undefined
      | unknown[];
    const providers = Reflect.getMetadata(
      "providers",
      PullRequestBodyModule,
    ) as undefined | unknown[];

    expect(imports).toContain(LoggerModule);
    expect(providers).toContain(PullRequestBodyCommand);
    expect(providers).toContain(PullRequestBodyService);
  });
});
