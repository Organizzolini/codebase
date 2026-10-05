import { describe, expect, it } from "vitest";

import { LoggerModule } from "@codebase/logging";

import { IssueLabelsGithubService } from "./issue-labels-github.service";
import { IssueLabelsCommand } from "./issue-labels.command";
import { IssueLabelsModule } from "./issue-labels.module";
import { IssueLabelsService } from "./issue-labels.service";

describe(IssueLabelsModule, () => {
  it("registers expected imports and providers", () => {
    expect.hasAssertions();

    const imports = Reflect.getMetadata("imports", IssueLabelsModule) as
      | undefined
      | unknown[];
    const providers = Reflect.getMetadata("providers", IssueLabelsModule) as
      | undefined
      | unknown[];

    expect(imports).toContain(LoggerModule);
    expect(providers).toContain(IssueLabelsCommand);
    expect(providers).toContain(IssueLabelsGithubService);
    expect(providers).toContain(IssueLabelsService);
  });
});
