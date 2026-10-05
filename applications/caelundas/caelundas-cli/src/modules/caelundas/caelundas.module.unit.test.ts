import { beforeAll, describe, expect, it, vi } from "vitest";

type ConfigOptions =
  | undefined
  | {
      envFilePath?: string | string[];
      isGlobal?: boolean;
      validate?: (config: Record<string, unknown>) => unknown;
    };

describe("caelundas module", () => {
  let mainModule: unknown;
  let configOptions: ConfigOptions;

  beforeAll(async () => {
    vi.resetModules();
    const importedConfigModule = await import("@nestjs/config");
    const forRootSpy = vi.spyOn(importedConfigModule.ConfigModule, "forRoot");

    const importedModule = await import("../../main.module");
    mainModule = importedModule.MainModule;
    configOptions = forRootSpy.mock.calls[0]?.[0];
  });

  it("configures the global env validator", () => {
    expect(mainModule).toBeDefined();

    const options = configOptions;

    if (options === undefined) {
      throw new Error("options is undefined");
    }

    expect(options.envFilePath).toBe(".env");
    expect(options.isGlobal).toBe(true);
    expect(typeof options.validate).toBe("function");
    expect(options.validate?.({})).toStrictEqual({
      OUTPUT_DIRECTORY: "./output",
    });
  });
});
