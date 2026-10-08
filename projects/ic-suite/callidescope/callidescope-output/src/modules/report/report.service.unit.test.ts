import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { buildSourceLocation, buildStackFrame } from "../../../testing/mocks";
import { ANALYSIS_MODULES } from "../../../testing/modules";

import { ReportService } from "./report.service";

import type { CallStack, StackFrame } from "@callidescope/core";

/** Builds a stack frame for a printed tree. */
function frame(
  displayName: string,
  overrides: Partial<StackFrame> = {},
): StackFrame {
  return buildStackFrame({
    displayName,
    location: buildSourceLocation({ filePath: `${displayName}.ts`, line: 12 }),
    ...overrides,
  });
}

/** Builds a stack from its frames. */
function stack(frames: StackFrame[]): CallStack {
  return {
    depth: frames.length,
    entryPointKind: "decorated-method",
    frames,
    isLowerBound: false,
  };
}

describe(ReportService, () => {
  let service: ReportService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [...ANALYSIS_MODULES],
      providers: [ReportService],
    }).compile();

    service = await module.resolve(ReportService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("prints every frame of a stack", () => {
    const rendered = service.renderStackTree(
      stack([frame("Resolver.read"), frame("Service.load")]),
    );

    expect(rendered).toContain("Resolver.read()");
    expect(rendered).toContain("Service.load()");
  });

  it("indents each frame below the one that called it", () => {
    const rendered = service.renderStackTree(
      stack([
        frame("Resolver.read"),
        frame("Service.load"),
        frame("Repo.find"),
      ]),
    );

    expect(rendered).toContain("  └─> Service.load()");
    expect(rendered).toContain("    └─> Repo.find()");
  });

  it("marks the entry point differently from the frames below it", () => {
    const rendered = service.renderStackTree(
      stack([frame("Resolver.read"), frame("Service.load")]),
    );

    expect(rendered.startsWith("🚀 ")).toBe(true);
  });

  it("prints the file and line of every frame", () => {
    expect(service.renderStackTree(stack([frame("Resolver.read")]))).toContain(
      "[Resolver.read.ts:12]",
    );
  });

  it("marks the frames belonging to a cycle", () => {
    const rendered = service.renderStackTree(
      stack([frame("Service.recurse", { isCycle: true })]),
    );

    expect(rendered).toContain("Service.recurse() (cycle)");
  });

  // ✍️ Signatures and documentation

  it("prints a frame's signature where the empty parentheses were", () => {
    const rendered = service.renderStackTree(
      stack([
        frame("Service.load", {
          signature: {
            parameters: [],
            returnType: "Promise<void>",
            text: "(value: string): Promise<void>",
          },
        }),
      ]),
    );

    expect(rendered).toContain("Service.load(value: string): Promise<void>");
  });

  it("collapses a signature too long to print, keeping the return type", () => {
    // Which twelve services a constructor takes is noise mid-stack; what it
    // hands back is not.
    const rendered = service.renderStackTree(
      stack([
        frame("Service.constructor", {
          signature: {
            parameters: [],
            returnType: "Service",
            text: `(${"dependency: SomeVeryLongServiceName, ".repeat(6)}): Service`,
          },
        }),
      ]),
    );

    expect(rendered).toContain("Service.constructor(…): Service");
  });

  it("prints a frame's documentation under it", () => {
    const rendered = service.renderStackTree(
      stack([
        frame("Service.load", {
          documentation: {
            isDeprecated: false,
            summary: "Loads the thing from the repository.",
            tags: [],
          },
        }),
      ]),
    );

    expect(rendered).toContain("↳ Loads the thing from the repository.");
  });

  it("marks a deprecated frame", () => {
    const rendered = service.renderStackTree(
      stack([
        frame("Service.old", {
          documentation: {
            isDeprecated: true,
            summary: "",
            tags: ["deprecated"],
          },
        }),
      ]),
    );

    expect(rendered).toContain("⚠ deprecated");
  });

  it("adds no documentation line for an undocumented frame", () => {
    expect(
      service.renderStackTree(stack([frame("Service.load")])),
    ).not.toContain("↳");
  });

  // ✂️ Shortening a summary to fit under a frame

  /** Renders one frame carrying the given summary, and returns its prose. */
  function renderSummary(summary: string): string {
    const rendered = service.renderStackTree(
      stack([
        frame("Service.load", {
          documentation: { isDeprecated: false, summary, tags: [] },
        }),
      ]),
    );

    return rendered.split("↳ ")[1] ?? "";
  }

  it("prints a summary that already fits, whole", () => {
    expect(renderSummary("Loads the thing.")).toBe("Loads the thing.");
  });

  it("keeps only the opening sentence of a summary that runs long", () => {
    // What a callable does, then paragraphs of why. The first half is the half
    // that orients someone reading a stack.
    expect(
      renderSummary(
        `Loads the thing from the repository. ${"Because of a long reason. ".repeat(6)}`.trim(),
      ),
    ).toBe("Loads the thing from the repository.");
  });

  it("marks nothing when the opening sentence is a complete thought", () => {
    // A whole sentence is not an elision, and the frame's file:line already
    // points at the rest.
    expect(
      renderSummary(`Does it. ${"More prose here. ".repeat(10)}`.trim()),
    ).not.toContain("…");
  });

  it("does not mistake a dotted identifier for the end of a sentence", () => {
    expect(
      renderSummary(
        `Wraps Array.prototype.map for the caller. ${"Padding sentence. ".repeat(10)}`.trim(),
      ),
    ).toBe("Wraps Array.prototype.map for the caller.");
  });

  it("cuts a single overlong sentence on a word, and marks it", () => {
    const word = "observability";

    expect(renderSummary(`${word} `.repeat(20).trim())).toBe(
      `${`${word} `.repeat(8).trim()}…`,
    );
  });

  it("cuts at the limit when one word runs past it", () => {
    expect(renderSummary("x".repeat(200))).toBe(`${"x".repeat(120)}…`);
  });

  it("renders nothing for a stack with no frames", () => {
    expect(service.renderStackTree(stack([]))).toBe("");
  });
});
