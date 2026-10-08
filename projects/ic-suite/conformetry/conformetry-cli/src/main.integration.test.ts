import { Test } from "@nestjs/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { MainModule } from "./main.module";
import { GenerateCommand } from "./modules/generate/generate.command";
import { InstancesCommand } from "./modules/instances/instances.command";
import { TemplatesCommand } from "./modules/templates/templates.command";
import { ValidateCommand } from "./modules/validate/validate.command";

import type { TestingModule } from "@nestjs/testing";

/**
 * Boots the real module graph rather than mocking the packages.
 *
 * Mocked module stubs cannot catch the failure that matters here: a command
 * whose dependencies resolve to `undefined` still constructs fine and only
 * fails when a method is called. Compiling the actual graph is what proves
 * the wiring.
 */
describe(MainModule, () => {
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [MainModule],
    }).compile();
  });

  afterAll(async () => {
    await module.close();
  });

  it("compiles the whole application graph", () => {
    expect(module).toBeDefined();
  });

  it("resolves the generate command with every dependency injected", async () => {
    const command = await module.resolve(GenerateCommand);

    expect(command).toBeDefined();
    expect(command.parseTemplate("example")).toBe("example");
  });

  it("resolves the instances command with every dependency injected", async () => {
    const command = await module.resolve(InstancesCommand);

    expect(command).toBeDefined();
    expect(command.parseTemplates("react-component")).toStrictEqual([
      "react-component",
    ]);
  });

  it("resolves the templates command with every dependency injected", async () => {
    const command = await module.resolve(TemplatesCommand);

    expect(command).toBeDefined();
    expect(command.parseInstances("packages/*")).toStrictEqual(["packages/*"]);
  });

  it("resolves the validate command with every dependency injected", async () => {
    const command = await module.resolve(ValidateCommand);

    expect(command).toBeDefined();
    expect(command.parseLanguages("typescript")).toStrictEqual(["typescript"]);
  });
});
