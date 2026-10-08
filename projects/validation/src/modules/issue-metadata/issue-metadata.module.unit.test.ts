import { describe, expect, it } from "vitest";

import { LoggerModule } from "@codebase/logging";

import { IssueMetadataGithubService } from "./issue-metadata-github.service";
import { IssueMetadataCommand } from "./issue-metadata.command";
import { IssueMetadataModule } from "./issue-metadata.module";
import { IssueMetadataService } from "./issue-metadata.service";

describe(IssueMetadataModule, () => {
  it("registers expected imports and providers", () => {
    expect.hasAssertions();

    const imports = Reflect.getMetadata("imports", IssueMetadataModule) as
      | undefined
      | unknown[];
    const providers = Reflect.getMetadata("providers", IssueMetadataModule) as
      | undefined
      | unknown[];

    expect(imports).toContain(LoggerModule);
    expect(providers).toContain(IssueMetadataCommand);
    expect(providers).toContain(IssueMetadataGithubService);
    expect(providers).toContain(IssueMetadataService);
  });
});
