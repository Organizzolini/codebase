import { describe, expect, it } from "vitest";

import { LoggerModule } from "@codebase/logging";

import { LockfileCommand } from "./lockfile.command";
import { LockfileModule } from "./lockfile.module";
import { LockfileService } from "./lockfile.service";

describe(LockfileModule, () => {
  it("registers expected imports and providers", () => {
    expect.hasAssertions();

    const imports = Reflect.getMetadata("imports", LockfileModule) as
      | undefined
      | unknown[];
    const providers = Reflect.getMetadata("providers", LockfileModule) as
      | undefined
      | unknown[];

    expect(imports).toContain(LoggerModule);
    expect(providers).toContain(LockfileCommand);
    expect(providers).toContain(LockfileService);
  });
});
