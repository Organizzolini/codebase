import { describe, expect, it } from "vitest";

import { LoggerModule } from "@codebase/logging";

import { AuditGovernanceCommand } from "./audit-governance.command";
import { AuditGovernanceModule } from "./audit-governance.module";
import { AuditGovernanceService } from "./audit-governance.service";

describe(AuditGovernanceModule, () => {
  it("registers expected imports and providers", () => {
    expect.hasAssertions();

    const imports = Reflect.getMetadata("imports", AuditGovernanceModule) as
      | undefined
      | unknown[];
    const providers = Reflect.getMetadata(
      "providers",
      AuditGovernanceModule,
    ) as undefined | unknown[];

    expect(imports).toContain(LoggerModule);
    expect(providers).toContain(AuditGovernanceCommand);
    expect(providers).toContain(AuditGovernanceService);
  });
});
