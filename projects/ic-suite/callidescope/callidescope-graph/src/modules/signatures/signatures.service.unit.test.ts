import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { ANALYSIS_MODULES } from "../../../testing/modules";
import {
  buildFixtureProgram,
  buildFixtureServices,
  collectFixtureCallables,
  findAbstractMethod,
} from "../../../testing/programs";

import { SignaturesService } from "./signatures.service";

import type { ReadSignatureArguments } from "./signatures.types";
import type { CallableSignature } from "@callidescope/core";

/** Builds the arguments for one named callable in an in-memory file. */
function readArguments(args: {
  displayName: string;
  source: string;
}): ReadSignatureArguments {
  const projectProgram = buildFixtureProgram({
    "packages/example/src/modules/a/a.service.ts": args.source,
  });
  const services = buildFixtureServices({ projectProgram });
  const callable = [
    ...collectFixtureCallables({ projectProgram, services }).byId.values(),
  ].find((candidate) => candidate.node.displayName === args.displayName);

  if (callable === undefined) {
    throw new Error(`No callable named ${args.displayName}`);
  }

  return {
    checker: projectProgram.checker,
    declaration: callable.declaration,
  };
}

describe(SignaturesService, () => {
  let service: SignaturesService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [...ANALYSIS_MODULES],
      providers: [SignaturesService],
    }).compile();

    service = await module.resolve(SignaturesService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("resolves a signature even for a declaration with no body", () => {
    const projectProgram = buildFixtureProgram({
      "packages/example/src/modules/a/a.service.ts":
        "export abstract class Base { public abstract run(): void; }",
    });
    const declaration = findAbstractMethod(projectProgram);

    expect(declaration).toBeDefined();
    expect(
      declaration === undefined
        ? undefined
        : service.read({
            checker: projectProgram.checker,
            declaration,
          }),
    ).toStrictEqual({ parameters: [], returnType: "void", text: "(): void" });
  });

  /** Reads the signature of one named callable. */
  function readSignature(args: {
    displayName: string;
    source: string;
  }): CallableSignature | undefined {
    return service.read(readArguments(args));
  }

  it("reads the parameters and return type of a function", () => {
    const signature = readSignature({
      displayName: "entry",
      source:
        "export function entry(value: string): number { void value; return 1; }",
    });

    expect(signature?.parameters).toStrictEqual([
      { isOptional: false, isRest: false, name: "value", type: "string" },
    ]);
    expect(signature?.returnType).toBe("number");
  });

  it("renders the whole signature on one line", () => {
    expect(
      readSignature({
        displayName: "entry",
        source:
          "export function entry(value: string): number { void value; return 1; }",
      })?.text,
    ).toBe("(value: string): number");
  });

  it("marks a parameter with a question mark as optional", () => {
    expect(
      readSignature({
        displayName: "entry",
        source: "export function entry(value?: string): void { void value; }",
      })?.parameters[0]?.isOptional,
    ).toBe(true);
  });

  it("marks a parameter with a default as optional", () => {
    expect(
      readSignature({
        displayName: "entry",
        source: "export function entry(value = 3): void { void value; }",
      })?.parameters[0]?.isOptional,
    ).toBe(true);
  });

  it("marks a rest parameter", () => {
    expect(
      readSignature({
        displayName: "entry",
        source:
          "export function entry(...values: string[]): void { void values; }",
      })?.parameters[0]?.isRest,
    ).toBe(true);
  });

  it("reads a constructor's parameters", () => {
    expect(
      readSignature({
        displayName: "Service.constructor",
        source:
          "export class Service {\n  constructor(private readonly value: string) {}\n  public use(): void { void this.value; }\n}",
      })?.parameters[0]?.name,
    ).toBe("value");
  });

  it("reads an accessor's return type", () => {
    expect(
      readSignature({
        displayName: "Service.get value",
        source:
          "export class Service {\n  public get value(): number { return 1; }\n}",
      })?.returnType,
    ).toBe("number");
  });

  it("reads an arrow property's signature", () => {
    expect(
      readSignature({
        displayName: "Service.load",
        source:
          "export class Service {\n  public load = (value: number): string => String(value);\n}",
      })?.text,
    ).toBe("(value: number): string");
  });

  it("reads a callback's contextual signature", () => {
    // The literal declares no types at all; the checker supplies them from the
    // parameter it was passed to, which is what makes a callback frame useful.
    expect(
      readSignature({
        displayName: "each(…)",
        source: `
          function each(callback: (item: string) => boolean): void { void callback("a"); }
          export function entry(): void { each((item) => item.length > 0); }
        `,
      })?.text,
    ).toBe("(item: string): boolean");
  });

  it("renders a destructured parameter as it was written", () => {
    expect(
      readSignature({
        displayName: "entry",
        source:
          "export function entry({ alpha }: { alpha: string }): void { void alpha; }",
      })?.text,
    ).toContain("{ alpha }");
  });
});
