import { describe, expect, it } from "vitest";

import { LoggerModule } from "@codebase/logging";

import { PullRequestMetadataGithubService } from "./pull-request-metadata-github.service";
import { PullRequestMetadataCommand } from "./pull-request-metadata.command";
import { PullRequestMetadataModule } from "./pull-request-metadata.module";
import { PullRequestMetadataService } from "./pull-request-metadata.service";

describe(PullRequestMetadataModule, () => {
  it("registers expected imports and providers", () => {
    expect.hasAssertions();

    const imports = Reflect.getMetadata(
      "imports",
      PullRequestMetadataModule,
    ) as undefined | unknown[];
    const providers = Reflect.getMetadata(
      "providers",
      PullRequestMetadataModule,
    ) as undefined | unknown[];

    expect(imports).toContain(LoggerModule);
    expect(providers).toContain(PullRequestMetadataCommand);
    expect(providers).toContain(PullRequestMetadataGithubService);
    expect(providers).toContain(PullRequestMetadataService);
  });
});
