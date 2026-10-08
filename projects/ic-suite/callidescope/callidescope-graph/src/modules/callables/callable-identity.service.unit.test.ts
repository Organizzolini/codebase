import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { ANALYSIS_MODULES } from "../../../testing/modules";
import {
  buildFixtureProgram,
  buildFixtureServices,
  collectFixtureCallables,
  findAbstractMethod,
} from "../../../testing/programs";

import { CallableIdentityService } from "./callable-identity.service";

import type { CallableNode } from "@callidescope/core";

/** Collects the described nodes for one in-memory source file. */
function describeFixture(source: string): CallableNode[] {
  const projectProgram = buildFixtureProgram({
    "packages/example/src/modules/a/a.service.ts": source,
  });
  const services = buildFixtureServices({ projectProgram });

  return [
    ...collectFixtureCallables({ projectProgram, services }).byId.values(),
  ].map((callable) => callable.node);
}

/** Finds one described node by the name it was given. */
function findNode(source: string, displayName: string): CallableNode {
  const node = describeFixture(source).find(
    (candidate) => candidate.displayName === displayName,
  );

  if (node === undefined) {
    throw new Error(
      `No callable named ${displayName}. Found: ${describeFixture(source)
        .map((candidate) => candidate.displayName)
        .join(", ")}`,
    );
  }

  return node;
}

describe(CallableIdentityService, () => {
  let service: CallableIdentityService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [...ANALYSIS_MODULES],
      providers: [CallableIdentityService],
    }).compile();

    service = await module.resolve(CallableIdentityService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  // 🏷️ Naming and classification, one case per declaration shape.

  it("names and classifies a function declaration", () => {
    const node = findNode("export function entry(): void {}", "entry");

    expect(node.kind).toBe("function");
    expect(node.enclosingTypeName).toBeUndefined();
  });

  it("qualifies a method with its class", () => {
    const node = findNode(
      "export class Service { public load(): void {} }",
      "Service.load",
    );

    expect(node.kind).toBe("method");
    expect(node.enclosingTypeName).toBe("Service");
    expect(node.memberName).toBe("load");
  });

  it("classifies a constructor", () => {
    const node = findNode(
      "export class Service { constructor() { this.warm(); } public warm(): void {} }",
      "Service.constructor",
    );

    expect(node.kind).toBe("constructor");
  });

  it("classifies an arrow-typed class property", () => {
    const node = findNode(
      "export class Service { public load = (): void => {}; }",
      "Service.load",
    );

    expect(node.kind).toBe("arrow-property");
  });

  it("classifies a getter and marks it as one", () => {
    const node = findNode(
      "export class Service { public get value(): number { return 1; } }",
      "Service.get value",
    );

    expect(node.kind).toBe("accessor");
  });

  it("classifies a setter", () => {
    const node = findNode(
      "export class Service { public set value(next: number) { this.store(next); } public store(next: number): void {} }",
      "Service.set value",
    );

    expect(node.kind).toBe("accessor");
  });

  it("names a function assigned to a variable", () => {
    const node = findNode("export const entry = (): void => {};", "entry");

    expect(node.kind).toBe("object-literal-method");
  });

  it("names an object literal method", () => {
    const node = findNode(
      "export const handlers = { load(): void {} };",
      "load",
    );

    expect(node.kind).toBe("object-literal-method");
  });

  it("names a callback by the call it was passed to", () => {
    // Far more useful in a printed stack than `anonymous`, and it is the only
    // name a function literal ever really has.
    const nodes = describeFixture(`
      function each(callback: () => void): void { callback(); }
      export function entry(): void { each(() => {}); }
    `);

    expect(nodes.map((node) => node.displayName)).toContain("each(…)");
  });

  it("names a callback passed to a method by that method", () => {
    const nodes = describeFixture(`
      const list = { forEach(callback: () => void): void { callback(); } };
      export function entry(): void { list.forEach(() => {}); }
    `);

    expect(nodes.map((node) => node.displayName)).toContain("forEach(…)");
  });

  // 🔑 Identity

  it("gives two callables on one line distinct identifiers", () => {
    // Line numbers collide here; offsets cannot.
    const nodes = describeFixture(
      "export const a = (): void => {}; export const b = (): void => {};",
    );
    const identifiers = new Set(nodes.map((node) => node.id));

    expect(identifiers.size).toBe(nodes.length);
  });

  it("records the one-based line a declaration starts on", () => {
    const node = findNode("\n\nexport function entry(): void {}", "entry");

    expect(node.location.line).toBe(3);
  });

  // 📤 Visibility and size

  it("marks an exported function as exported", () => {
    expect(
      findNode("export function entry(): void {}", "entry").isExported,
    ).toBe(true);
  });

  it("marks an exported arrow constant as exported", () => {
    // The declaration the graph holds is the arrow, and the `export` keyword
    // sits above it on the variable statement. React components and barrel
    // exports are written this way, so missing it leaves them promoted as
    // orphans rather than classified as the exports they are.
    expect(
      findNode("export const entry = (): void => {};", "entry").isExported,
    ).toBe(true);
  });

  it("marks a file-local arrow constant as not exported", () => {
    const nodes = describeFixture(
      "const hidden = (): void => {};\nexport function entry(): void { hidden(); }",
    );

    expect(
      nodes.find((node) => node.displayName === "hidden")?.isExported,
    ).toBe(false);
  });

  it("marks a file-local function as not exported", () => {
    const nodes = describeFixture(
      "function hidden(): void {} export function entry(): void { hidden(); }",
    );

    expect(
      nodes.find((node) => node.displayName === "hidden")?.isExported,
    ).toBe(false);
  });

  it("marks a method of an exported class as exported", () => {
    expect(
      findNode(
        "export class Service { public load(): void {} }",
        "Service.load",
      ).isExported,
    ).toBe(true);
  });

  it("counts the statements in a body", () => {
    const node = findNode(
      "export function entry(): void { const a = 1; const b = 2; }",
      "entry",
    );

    expect(node.statementCount).toBe(2);
  });

  it("counts nothing for a declaration with no body", () => {
    const declaration = findAbstractMethod(
      buildFixtureProgram({
        "packages/example/src/modules/a/a.service.ts":
          "export abstract class Base { public abstract run(): void; }",
      }),
    );

    expect(declaration).toBeDefined();
    expect(
      declaration === undefined
        ? undefined
        : service.countStatements(declaration),
    ).toBe(0);
  });

  it("counts an expression-bodied arrow as one statement", () => {
    const node = findNode("export const entry = (): number => 1;", "entry");

    expect(node.statementCount).toBe(1);
  });
});
