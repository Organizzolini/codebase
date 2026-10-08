import { describe, expect, it } from "vitest";

import { LoggerModule } from "@codebase/logging";

import { ConformetryGeneratorsModule } from "../conformetry-generators/conformetry-generators.module";
import { ConventionalConfigModule } from "../conventional-config/conventional-config.module";
import { DevcontainerConfigurationModule } from "../devcontainer-configuration/devcontainer-configuration.module";
import { PullRequestLabelsModule } from "../pull-request-labels/pull-request-labels.module";
import { PullRequestTemplateModule } from "../pull-request-template/pull-request-template.module";
import { SkillExclusionsModule } from "../skill-exclusions/skill-exclusions.module";

import { SynchronizationCommand } from "./synchronization.command";
import { SynchronizationModule } from "./synchronization.module";
import { SynchronizationService } from "./synchronization.service";

describe(SynchronizationModule, () => {
  it("registers every synchronization command's module as an import", () => {
    const imports = Reflect.getMetadata("imports", SynchronizationModule) as
      | undefined
      | unknown[];
    const providers = Reflect.getMetadata(
      "providers",
      SynchronizationModule,
    ) as undefined | unknown[];

    expect(imports).toBeDefined();
    expect(imports).toContain(LoggerModule);
    expect(imports).toContain(ConformetryGeneratorsModule);
    expect(imports).toContain(ConventionalConfigModule);
    expect(imports).toContain(DevcontainerConfigurationModule);
    expect(imports).toContain(PullRequestLabelsModule);
    expect(imports).toContain(PullRequestTemplateModule);
    expect(imports).toContain(SkillExclusionsModule);

    expect(providers).toBeDefined();
    expect(providers).toContain(SynchronizationCommand);
    expect(providers).toContain(SynchronizationService);
  });
});
