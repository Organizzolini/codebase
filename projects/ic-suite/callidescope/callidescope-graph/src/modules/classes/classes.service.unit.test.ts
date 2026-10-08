import { Test } from "@nestjs/testing";
import ts from "typescript";
import { beforeAll, describe, expect, it } from "vitest";

import { ANALYSIS_MODULES } from "../../../testing/modules";
import { buildFixtureProgram } from "../../../testing/programs";

import { MAXIMUM_IMPLEMENTATION_CANDIDATES } from "./classes.constants";
import { ClassesService } from "./classes.service";
import { ExternalService } from "./external.service";

import type { ImplementationLookup } from "./classes.types";

/** Resolves one interface member against an in-memory workspace. */
function resolve(args: {
  files: Record<string, string>;
  memberName: string;
  ownerName: string;
}): ImplementationLookup {
  const projectProgram = buildFixtureProgram(args.files);
  const external = new ExternalService();

  external.configure({
    ownedFilePaths: projectProgram.ownedFilePaths,
    workspaceRoot: "/workspace",
  });

  const subject = new ClassesService(external);

  subject.build({ programs: [projectProgram] });

  let ownerSymbol: ts.Symbol | undefined;

  for (const sourceFile of projectProgram.program.getSourceFiles()) {
    for (const statement of sourceFile.statements) {
      const named =
        ts.isInterfaceDeclaration(statement) || ts.isClassDeclaration(statement)
          ? statement
          : undefined;

      if (named?.name?.text === args.ownerName) {
        ownerSymbol = projectProgram.checker.getSymbolAtLocation(named.name);
      }
    }
  }

  if (ownerSymbol === undefined) {
    throw new Error(`No type named ${args.ownerName}`);
  }

  return subject.resolveImplementations({
    checker: projectProgram.checker,
    memberName: args.memberName,
    ownerName: args.ownerName,
    ownerSymbol,
  });
}

describe(ClassesService, () => {
  let service: ClassesService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [...ANALYSIS_MODULES],
      providers: [ClassesService],
    }).compile();

    service = await module.resolve(ClassesService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("finds a class that declares it implements the interface", () => {
    const lookup = resolve({
      files: {
        "packages/example/src/modules/a/a.service.ts": `
          export interface Runner { run(): void; }
          export class Worker implements Runner { public run(): void {} }
        `,
      },
      memberName: "run",
      ownerName: "Runner",
    });

    expect(lookup.declarations).toHaveLength(1);
  });

  it("finds a class that satisfies the interface without saying so", () => {
    // This repository's providers are written exactly this way, so a purely
    // nominal index would find none of them.
    const lookup = resolve({
      files: {
        "packages/example/src/modules/a/a.service.ts": `
          export interface Runner { run(): void; }
          export class Worker { public run(): void {} }
        `,
      },
      memberName: "run",
      ownerName: "Runner",
    });

    expect(lookup.declarations).toHaveLength(1);
  });

  it("finds an arrow-typed member declared as a property signature", () => {
    const lookup = resolve({
      files: {
        "packages/example/src/modules/a/a.service.ts": `
          export interface Provider { ingest: () => void; }
          export class BookProvider { public ingest = (): void => {}; }
        `,
      },
      memberName: "ingest",
      ownerName: "Provider",
    });

    expect(lookup.declarations).toHaveLength(1);
  });

  it("finds a subclass overriding an abstract method", () => {
    const lookup = resolve({
      files: {
        "packages/example/src/modules/a/a.service.ts": `
          export abstract class Base { public abstract run(): void; }
          export class Concrete extends Base { public run(): void {} }
        `,
      },
      memberName: "run",
      ownerName: "Base",
    });

    expect(lookup.declarations).toHaveLength(1);
  });

  it("finds every class implementing the same interface", () => {
    const lookup = resolve({
      files: {
        "packages/example/src/modules/a/a.service.ts": `
          export interface Runner { run(): void; }
          export class One { public run(): void {} }
          export class Two { public run(): void {} }
        `,
      },
      memberName: "run",
      ownerName: "Runner",
    });

    expect(lookup.declarations).toHaveLength(2);
  });

  it("gives up rather than guess when too many classes match", () => {
    // The primary noise control: a structurally matched `run` otherwise
    // resolves to dozens of unrelated classes and invents a call stack. One
    // past MAXIMUM_IMPLEMENTATION_CANDIDATES is what the cap is for.
    const implementations = Array.from(
      { length: MAXIMUM_IMPLEMENTATION_CANDIDATES + 1 },
      (_unused, index) => `export class Runner${String(index)} {
        public run(): void {}
      }`,
    ).join("\n");
    const lookup = resolve({
      files: {
        "packages/example/src/modules/a/a.service.ts": `
          export interface Runner { run(): void; }
          ${implementations}
        `,
      },
      memberName: "run",
      ownerName: "Runner",
    });

    expect(lookup.exceededCandidateLimit).toBe(true);
    expect(lookup.declarations).toStrictEqual([]);
  });

  it("resolves a candidate set sitting exactly at the cap", () => {
    const implementations = Array.from(
      { length: MAXIMUM_IMPLEMENTATION_CANDIDATES },
      (_unused, index) => `export class Runner${String(index)} {
        public run(): void {}
      }`,
    ).join("\n");
    const lookup = resolve({
      files: {
        "packages/example/src/modules/a/a.service.ts": `
          export interface Runner { run(): void; }
          ${implementations}
        `,
      },
      memberName: "run",
      ownerName: "Runner",
    });

    expect(lookup.exceededCandidateLimit).toBe(false);
    expect(lookup.declarations).toHaveLength(MAXIMUM_IMPLEMENTATION_CANDIDATES);
  });

  it("indexes two classes extending the same base", () => {
    const lookup = resolve({
      files: {
        "packages/example/src/modules/a/a.service.ts": `
          export abstract class Base { public abstract run(): void; }
          export class One extends Base { public run(): void {} }
          export class Two extends Base { public run(): void {} }
        `,
      },
      memberName: "run",
      ownerName: "Base",
    });

    expect(lookup.declarations).toHaveLength(2);
  });

  it("ignores a base that is not written as a plain name", () => {
    // `extends mixin(Base)` names no identifier to index against.
    const lookup = resolve({
      files: {
        "packages/example/src/modules/a/a.service.ts": `
          export interface Runner { run(): void; }
          declare function mixin(): new () => { other(): void };
          export class Mixed extends mixin() { public run(): void {} }
        `,
      },
      memberName: "run",
      ownerName: "Runner",
    });

    expect(lookup.declarations).toHaveLength(1);
  });

  it("answers a repeated lookup from its cache", () => {
    const projectProgram = buildFixtureProgram({
      "packages/example/src/modules/a/a.service.ts": `
        export interface Runner { run(): void; }
        export class Worker { public run(): void {} }
      `,
    });
    const external = new ExternalService();

    external.configure({
      ownedFilePaths: projectProgram.ownedFilePaths,
      workspaceRoot: "/workspace",
    });

    const subject = new ClassesService(external);

    subject.build({ programs: [projectProgram] });

    let ownerSymbol: ts.Symbol | undefined;

    for (const sourceFile of projectProgram.program.getSourceFiles()) {
      for (const statement of sourceFile.statements) {
        if (
          ts.isInterfaceDeclaration(statement) &&
          statement.name.text === "Runner"
        ) {
          ownerSymbol = projectProgram.checker.getSymbolAtLocation(
            statement.name,
          );
        }
      }
    }

    if (ownerSymbol === undefined) {
      throw new Error("No Runner interface");
    }

    const query = {
      checker: projectProgram.checker,
      memberName: "run",
      ownerName: "Runner",
      ownerSymbol,
    };

    expect(subject.resolveImplementations(query)).toBe(
      subject.resolveImplementations(query),
    );
  });

  it("does not index a class from outside the traced code", () => {
    const projectProgram = buildFixtureProgram({
      "packages/example/src/modules/a/a.service.ts": `
        export interface Runner { run(): void; }
        export class Worker { public run(): void {} }
      `,
    });
    const external = new ExternalService();

    // Nothing is owned, so every file reads as external.
    external.configure({
      ownedFilePaths: new Set(),
      workspaceRoot: "/nowhere",
    });

    const subject = new ClassesService(external);

    subject.build({ programs: [projectProgram] });

    let ownerSymbol: ts.Symbol | undefined;

    for (const sourceFile of projectProgram.program.getSourceFiles()) {
      for (const statement of sourceFile.statements) {
        if (
          ts.isInterfaceDeclaration(statement) &&
          statement.name.text === "Runner"
        ) {
          ownerSymbol = projectProgram.checker.getSymbolAtLocation(
            statement.name,
          );
        }
      }
    }

    if (ownerSymbol === undefined) {
      throw new Error("No Runner interface");
    }

    expect(
      subject.resolveImplementations({
        checker: projectProgram.checker,
        memberName: "run",
        ownerName: "Runner",
        ownerSymbol,
      }).declarations,
    ).toStrictEqual([]);
  });

  it("skips a class with no name to resolve", () => {
    const lookup = resolve({
      files: {
        "packages/example/src/modules/a/a.service.ts": `
          export interface Runner { run(): void; }
          export default class { public run(): void {} }
        `,
      },
      memberName: "run",
      ownerName: "Runner",
    });

    expect(lookup.declarations).toStrictEqual([]);
  });

  it("finds nothing for a member nothing implements", () => {
    const lookup = resolve({
      files: {
        "packages/example/src/modules/a/a.service.ts":
          "export interface Runner { run(): void; }",
      },
      memberName: "run",
      ownerName: "Runner",
    });

    expect(lookup.declarations).toStrictEqual([]);
  });

  it("collects a derived class with no name to revisit", () => {
    // An anonymous default export still implements the member and still
    // belongs in the result — it just cannot be walked any further for its
    // own subclasses, since nothing names it to look them up by.
    const lookup = resolve({
      files: {
        "packages/example/src/modules/a/a.service.ts": `
          export abstract class Base { public abstract run(): void; }
          export default class extends Base { public run(): void {} }
        `,
      },
      memberName: "run",
      ownerName: "Base",
    });

    expect(lookup.declarations).toHaveLength(1);
  });

  it("leaves out a class whose override is still abstract", () => {
    const lookup = resolve({
      files: {
        "packages/example/src/modules/a/a.service.ts": `
          export abstract class Base { public abstract run(): void; }
          export abstract class Middle extends Base { public abstract run(): void; }
          export class Concrete extends Middle { public run(): void {} }
        `,
      },
      memberName: "run",
      ownerName: "Base",
    });

    expect(lookup.declarations).toHaveLength(1);
  });
});
