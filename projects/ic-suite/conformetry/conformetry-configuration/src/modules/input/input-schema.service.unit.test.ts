import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { InputSchemaService } from "./input-schema.service";

describe(InputSchemaService, () => {
  let service: InputSchemaService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [InputSchemaService],
    }).compile();

    service = await module.resolve(InputSchemaService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("describeInput", () => {
    it("marks an input listed in required", () => {
      expect(
        service.describeInput({
          inputName: "name",
          schema: {
            properties: { name: { type: "string" } },
            required: ["name"],
          },
        }),
      ).toStrictEqual({
        inputName: "name",
        isRequired: true,
        propertySchema: { type: "string" },
      });
    });

    it("treats an input as optional when required is absent", () => {
      expect(
        service.describeInput({
          inputName: "name",
          schema: { properties: { name: {} } },
        }).isRequired,
      ).toBe(false);
    });
  });

  describe("readPropertyNames", () => {
    it("returns an empty list for a schema with no properties", () => {
      expect(service.readPropertyNames({})).toStrictEqual([]);
    });
  });

  describe("readEnumValues", () => {
    it("keeps only string members", () => {
      expect(service.readEnumValues({ enum: ["a", 1, "b"] })).toStrictEqual([
        "a",
        "b",
      ]);
    });

    it("returns nothing for a non-object schema", () => {
      expect(service.readEnumValues("nope")).toStrictEqual([]);
    });
  });

  describe("readPromptMessage", () => {
    it("prefers the schema description", () => {
      expect(
        service.readPromptMessage({
          inputName: "name",
          isRequired: true,
          propertySchema: { description: "Module name" },
        }),
      ).toBe("Module name");
    });

    it("falls back to a generic message", () => {
      expect(
        service.readPromptMessage({
          inputName: "name",
          isRequired: true,
          propertySchema: {},
        }),
      ).toBe("Enter name");
    });
  });

  describe("validateValue", () => {
    const requiredInput = {
      inputName: "name",
      isRequired: true,
      propertySchema: {},
    };

    it("rejects a blank required value", () => {
      expect(service.validateValue({ input: requiredInput, value: "  " })).toBe(
        "name is required",
      );
    });

    it("accepts a blank optional value", () => {
      expect(
        service.validateValue({
          input: { ...requiredInput, isRequired: false },
          value: "",
        }),
      ).toBe(true);
    });

    it("enforces enum membership", () => {
      expect(
        service.validateValue({
          input: { ...requiredInput, propertySchema: { enum: ["a", "b"] } },
          value: "c",
        }),
      ).toBe("name must be one of: a, b");
    });

    it("enforces minimum and maximum length", () => {
      expect(
        service.validateValue({
          input: { ...requiredInput, propertySchema: { minLength: 4 } },
          value: "abc",
        }),
      ).toBe("name must be at least 4 characters");
      expect(
        service.validateValue({
          input: { ...requiredInput, propertySchema: { maxLength: 2 } },
          value: "abc",
        }),
      ).toBe("name must be at most 2 characters");
    });

    it("enforces a pattern", () => {
      expect(
        service.validateValue({
          input: { ...requiredInput, propertySchema: { pattern: "^[a-z-]+$" } },
          value: "NotKebab",
        }),
      ).toBe("name does not match pattern ^[a-z-]+$");
    });

    it("accepts a value that satisfies every constraint", () => {
      expect(
        service.validateValue({
          input: {
            ...requiredInput,
            propertySchema: {
              maxLength: 20,
              minLength: 2,
              pattern: "^[a-z-]+$",
            },
          },
          value: "my-widget",
        }),
      ).toBe(true);
    });
  });
});
