import { Test } from "@nestjs/testing";
import prompts from "prompts";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { InputPromptingService } from "./input-prompting.service";
import { InputSchemaService } from "./input-schema.service";

// Mocked at the module boundary so the service's own wiring is exercised and
// no test ever reaches for a terminal.
vi.mock("prompts", () => ({ default: vi.fn() }));

const promptRunner = vi.mocked(prompts);

describe(InputPromptingService, () => {
  let service: InputPromptingService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [InputPromptingService, InputSchemaService],
    }).compile();

    service = await module.resolve(InputPromptingService);
  });

  const originalIsTty = process.stdin.isTTY;

  beforeEach(() => {
    promptRunner.mockReset();
    // A terminal, so each test exercises the prompt rather than the refusal
    // standing in front of it.
    process.stdin.isTTY = true;
  });

  afterEach(() => {
    process.stdin.isTTY = originalIsTty;
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("promptForInput", () => {
    it("returns the answer the caller typed", async () => {
      promptRunner.mockResolvedValue({ value: "my-widget" });

      await expect(
        service.promptForInput({
          inputName: "name",
          isRequired: true,
          propertySchema: { type: "string" },
        }),
      ).resolves.toBe("my-widget");
    });

    it("returns nothing when the prompt is cancelled", async () => {
      promptRunner.mockResolvedValue({});

      await expect(
        service.promptForInput({
          inputName: "name",
          isRequired: true,
          propertySchema: { type: "string" },
        }),
      ).resolves.toBeUndefined();
    });

    it("hands prompts a validator backed by the schema", async () => {
      promptRunner.mockResolvedValue({ value: "my-widget" });

      await service.promptForInput({
        inputName: "name",
        isRequired: true,
        propertySchema: { type: "string" },
      });

      const options = promptRunner.mock.calls[0]?.[0];

      if (options === undefined || Array.isArray(options)) {
        throw new Error("prompts was not called with a single prompt");
      }

      // The extra arguments are prompts' own signature: previous answers and
      // the prompt itself, neither of which this validator reads.
      expect(options.validate?.("my-widget", {}, options)).toBe(true);
      expect(options.validate?.("", {}, options)).toBe("name is required");
    });

    it("offers a choice list when the schema declares an enum", async () => {
      promptRunner.mockResolvedValue({ value: "packages" });

      await service.promptForInput({
        inputName: "type",
        isRequired: true,
        propertySchema: { enum: ["applications", "packages"] },
      });

      expect(promptRunner).toHaveBeenCalledWith(
        expect.objectContaining({ type: "select" }),
      );
    });

    it("asks for free text when the schema declares no enum", async () => {
      promptRunner.mockResolvedValue({ value: "my-widget" });

      await service.promptForInput({
        inputName: "name",
        isRequired: true,
        propertySchema: { type: "string" },
      });

      expect(promptRunner).toHaveBeenCalledWith(
        expect.objectContaining({ type: "text" }),
      );
    });

    it("returns nothing when the caller cancels", async () => {
      promptRunner.mockResolvedValue({});

      await expect(
        service.promptForInput({
          inputName: "name",
          isRequired: true,
          propertySchema: { type: "string" },
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe("promptForTemplate", () => {
    const TEMPLATES = [
      { description: "A NestJS service module", name: "nestjs-service-module" },
      { name: "react-component" },
    ];

    it("returns the template the caller chose", async () => {
      promptRunner.mockResolvedValue({ template: "react-component" });

      await expect(service.promptForTemplate(TEMPLATES)).resolves.toBe(
        "react-component",
      );
    });

    // Filtering as you type is the whole reason a long template name is
    // cheap to select, so the prompt type is asserted rather than assumed.
    it("asks with an autocomplete over the configured templates", async () => {
      promptRunner.mockResolvedValue({ template: "react-component" });

      await service.promptForTemplate(TEMPLATES);

      expect(promptRunner).toHaveBeenCalledWith(
        expect.objectContaining({
          choices: [
            {
              description: "A NestJS service module",
              title: "nestjs-service-module",
              value: "nestjs-service-module",
            },
            { title: "react-component", value: "react-component" },
          ],
          type: "autocomplete",
        }),
      );
    });

    it("returns nothing when the prompt is cancelled", async () => {
      promptRunner.mockResolvedValue({});

      await expect(
        service.promptForTemplate(TEMPLATES),
      ).resolves.toBeUndefined();
    });
  });

  describe("promptForTemplates", () => {
    const TEMPLATES = [
      { description: "A NestJS service module", name: "nestjs-service-module" },
    ];

    it("returns every template the caller ticked", async () => {
      promptRunner.mockResolvedValue({
        templates: ["nestjs-service-module", "react-component"],
      });

      await expect(
        service.promptForTemplates(TEMPLATES),
      ).resolves.toStrictEqual(["nestjs-service-module", "react-component"]);
    });

    // The flag and the picker have to be able to express the same set, and
    // `--templates all` is how the flag says "every template".
    it("offers the all sentinel alongside the configured templates", async () => {
      promptRunner.mockResolvedValue({ templates: ["all"] });

      await service.promptForTemplates(TEMPLATES);

      expect(promptRunner).toHaveBeenCalledWith(
        expect.objectContaining({
          choices: [
            expect.objectContaining({ title: "all", value: "all" }) as unknown,
            expect.objectContaining({
              description: "A NestJS service module",
              value: "nestjs-service-module",
            }) as unknown,
          ],
          type: "autocompleteMultiselect",
        }),
      );
    });

    it("returns nothing when the prompt is cancelled", async () => {
      promptRunner.mockResolvedValue({});

      await expect(
        service.promptForTemplates(TEMPLATES),
      ).resolves.toBeUndefined();
    });

    // Ticking nothing is not a narrowing, so it reads as no answer rather
    // than as "no templates", which would validate nothing at all.
    it("returns nothing when the caller ticks no template", async () => {
      promptRunner.mockResolvedValue({ templates: [] });

      await expect(
        service.promptForTemplates(TEMPLATES),
      ).resolves.toBeUndefined();
    });
  });

  describe("isAtTerminal", () => {
    it.each([
      [true, true],
      [false, false],
    ])("reads a stdin isTTY of %s as %s", (isTty, expected) => {
      process.stdin.isTTY = isTty;

      expect(service.isAtTerminal()).toBe(expected);
    });

    // `prompts` would otherwise draw its menu, never resolve, and let the
    // process exit 0 having generated nothing.
    it("refuses to prompt when stdin is not a terminal", async () => {
      process.stdin.isTTY = false;

      await expect(
        service.promptForInput({
          inputName: "name",
          isRequired: true,
          propertySchema: { type: "string" },
        }),
      ).rejects.toThrow(
        "name is required, and stdin is not a terminal so it cannot be asked for. Pass --name.",
      );
      expect(promptRunner).not.toHaveBeenCalled();
    });
  });
});
