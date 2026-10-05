import { describe, expect, it } from "vitest";

import { LoggerModule } from "@codebase/logging";

import { PullRequestReleaseSignificanceGithubService } from "./pull-request-release-significance-github.service";
import { PullRequestReleaseSignificanceCommand } from "./pull-request-release-significance.command";
import { PullRequestReleaseSignificanceModule } from "./pull-request-release-significance.module";
import { PullRequestReleaseSignificanceService } from "./pull-request-release-significance.service";

describe(PullRequestReleaseSignificanceModule, () => {
  it("registers expected imports and providers", () => {
    expect.hasAssertions();

    const imports = Reflect.getMetadata(
      "imports",
      PullRequestReleaseSignificanceModule,
    ) as undefined | unknown[];
    const providers = Reflect.getMetadata(
      "providers",
      PullRequestReleaseSignificanceModule,
    ) as undefined | unknown[];

    expect(imports).toContain(LoggerModule);
    expect(providers).toContain(PullRequestReleaseSignificanceCommand);
    expect(providers).toContain(PullRequestReleaseSignificanceGithubService);
    expect(providers).toContain(PullRequestReleaseSignificanceService);
  });
});
