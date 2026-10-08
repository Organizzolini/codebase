import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { ANALYSIS_MODULES } from "../../../testing/modules";
import {
  buildFixtureProgram,
  buildFixtureServices,
  collectFixtureCallables,
} from "../../../testing/programs";

import { DocumentationService } from "./documentation.service";

import type { ReadDocumentationArguments } from "./documentation.types";
import type { CallableDocumentation } from "@callidescope/core";

/** Builds the arguments for one named callable in an in-memory file. */
function readArguments(args: {
  displayName: string;
  source: string;
}): ReadDocumentationArguments {
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

describe(DocumentationService, () => {
  let service: DocumentationService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [...ANALYSIS_MODULES],
      providers: [DocumentationService],
    }).compile();

    service = await module.resolve(DocumentationService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  /** Reads the documentation of one named callable. */
  function readDocumentation(args: {
    displayName: string;
    source: string;
  }): CallableDocumentation | undefined {
    return service.read(readArguments(args));
  }

  it("reads the summary of a documented function", () => {
    expect(
      readDocumentation({
        displayName: "entry",
        source: "/** Does the thing. */\nexport function entry(): void {}",
      }),
    ).toStrictEqual({
      isDeprecated: false,
      summary: "Does the thing.",
      tags: [],
    });
  });

  it("reads the summary of a documented method", () => {
    expect(
      readDocumentation({
        displayName: "Service.load",
        source:
          "export class Service {\n  /** Loads it. */\n  public load(): void {}\n}",
      })?.summary,
    ).toBe("Loads it.");
  });

  it("finds the comment above an arrow-typed property", () => {
    // The comment sits on the property; the graph's node is the arrow.
    expect(
      readDocumentation({
        displayName: "Service.load",
        source:
          "export class Service {\n  /** Loads it. */\n  public load = (): void => {};\n}",
      })?.summary,
    ).toBe("Loads it.");
  });

  it("finds the comment above a variable-assigned arrow", () => {
    expect(
      readDocumentation({
        displayName: "entry",
        source: "/** Does the thing. */\nexport const entry = (): void => {};",
      })?.summary,
    ).toBe("Does the thing.");
  });

  it("finds the comment above an object literal method", () => {
    expect(
      readDocumentation({
        displayName: "load",
        source:
          "export const handlers = {\n  /** Loads it. */\n  load: (): void => {},\n};",
      })?.summary,
    ).toBe("Loads it.");
  });

  it("finds the comment on an overload signature", () => {
    // The graph points at the implementation, which carries no comment of its
    // own — only the signature above it does.
    expect(
      readDocumentation({
        displayName: "entry",
        source: `
          /** Handles either shape. */
          export function entry(value: string): void;
          export function entry(value: number): void;
          export function entry(value: unknown): void { void value; }
        `,
      })?.summary,
    ).toBe("Handles either shape.");
  });

  it("collapses a multi-line comment onto one line", () => {
    expect(
      readDocumentation({
        displayName: "entry",
        source:
          "/**\n * First line.\n * Second line.\n */\nexport function entry(): void {}",
      })?.summary,
    ).toBe("First line. Second line.");
  });

  it("keeps a long summary whole, leaving what fits to the renderer", () => {
    // Shortening belongs to whatever is being rendered into. A JSON consumer
    // has no line width to respect, and cutting here would decide for it.
    const summary = readDocumentation({
      displayName: "entry",
      source: `/** ${"word ".repeat(60)} */\nexport function entry(): void {}`,
    })?.summary;

    expect(summary?.length).toBeGreaterThan(200);
    expect(summary).not.toContain("\u2026");
  });

  it("records the tags a comment carries", () => {
    expect(
      readDocumentation({
        displayName: "entry",
        source:
          "/**\n * Does it.\n * @returns nothing\n * @see somewhere\n */\nexport function entry(): void {}",
      })?.tags,
    ).toStrictEqual(["returns", "see"]);
  });

  it("marks a deprecated callable even with no prose", () => {
    // A comment that is nothing but `@deprecated` leaves the summary empty, so
    // the tags cannot be inferred from whether there was anything to read.
    expect(
      readDocumentation({
        displayName: "entry",
        source:
          "/** @deprecated use other */\nexport function entry(): void {}",
      }),
    ).toStrictEqual({
      isDeprecated: true,
      summary: "",
      tags: ["deprecated"],
    });
  });

  it("records a repeated tag once", () => {
    expect(
      readDocumentation({
        displayName: "entry",
        source:
          "/**\n * @throws when one fails\n * @throws when two fails\n */\nexport function entry(): void {}",
      })?.tags,
    ).toStrictEqual(["throws"]);
  });

  it("reads nothing for an undocumented callable", () => {
    expect(
      readDocumentation({
        displayName: "entry",
        source: "export function entry(): void {}",
      }),
    ).toBeUndefined();
  });

  it("reads nothing for an anonymous callback", () => {
    expect(
      readDocumentation({
        displayName: "each(…)",
        source: `
          function each(callback: () => void): void { callback(); }
          export function entry(): void { each(() => {}); }
        `,
      }),
    ).toBeUndefined();
  });
});
