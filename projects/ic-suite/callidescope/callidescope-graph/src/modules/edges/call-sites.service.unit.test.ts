import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { ANALYSIS_MODULES } from "../../../testing/modules";
import {
  buildFixtureProgram,
  buildFixtureServices,
  collectFixtureCallables,
  findAbstractMethod,
} from "../../../testing/programs";

import { CallSitesService } from "./call-sites.service";

/** Lists the call sites found inside one named callable. */
function collectSites(args: { displayName: string; source: string }): string[] {
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

  return new CallSitesService()
    .collect(callable.declaration)
    .map((site) => site.expression.expression.getText());
}

describe(CallSitesService, () => {
  let service: CallSitesService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [...ANALYSIS_MODULES],
      providers: [CallSitesService],
    }).compile();

    service = await module.resolve(CallSitesService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("finds a call made directly in the body", () => {
    expect(
      collectSites({
        displayName: "entry",
        source:
          "function work(): void {}\nexport function entry(): void { work(); }",
      }),
    ).toStrictEqual(["work"]);
  });

  it("finds a call nested inside a control-flow statement", () => {
    expect(
      collectSites({
        displayName: "entry",
        source: `
          function work(): void {}
          export function entry(flag: boolean): void {
            if (flag) { work(); }
          }
        `,
      }),
    ).toStrictEqual(["work"]);
  });

  it("finds a construction as a call site", () => {
    expect(
      collectSites({
        displayName: "entry",
        source:
          "class Thing {}\nexport function entry(): void { new Thing(); }",
      }),
    ).toStrictEqual(["Thing"]);
  });

  it("finds a construction written without an argument list", () => {
    expect(
      collectSites({
        displayName: "entry",
        source:
          "class Thing {}\nexport function entry(): void { const made = new Thing; void made; }",
      }),
    ).toStrictEqual(["Thing"]);
  });

  it("finds the single call an expression-bodied arrow is", () => {
    // A concise body is the call itself rather than a block containing one, so
    // walking only its children steps straight past it and the arrow reports
    // no callees at all.
    expect(
      collectSites({
        displayName: "entry",
        source: `
          function work(): number { return 1; }
          export const entry = (): number => work();
        `,
      }),
    ).toStrictEqual(["work"]);
  });

  it("does not descend into a nested function literal", () => {
    // A literal is its own frame; attributing its calls to the enclosing body
    // is how a shallow orchestrator inherits a callback's whole depth.
    expect(
      collectSites({
        displayName: "entry",
        source: `
          function each(callback: () => void): void { callback(); }
          function work(): void {}
          export function entry(): void { each(() => { work(); }); }
        `,
      }),
    ).toStrictEqual(["each"]);
  });

  it("does not descend into a nested class declaration", () => {
    expect(
      collectSites({
        displayName: "entry",
        source: `
          function work(): void {}
          export function entry(): void {
            class Inner { public run(): void { work(); } }
            void Inner;
          }
        `,
      }),
    ).toStrictEqual([]);
  });

  it("collects the function literals a call is passed", () => {
    const projectProgram = buildFixtureProgram({
      "packages/example/src/modules/a/a.service.ts": `
        function each(callback: () => void): void { callback(); }
        export function entry(): void { each(() => {}); }
      `,
    });
    const services = buildFixtureServices({ projectProgram });
    const callable = [
      ...collectFixtureCallables({ projectProgram, services }).byId.values(),
    ].find((candidate) => candidate.node.displayName === "entry");
    const sites =
      callable === undefined
        ? []
        : new CallSitesService().collect(callable.declaration);

    expect(sites[0]?.functionArguments).toHaveLength(1);
  });

  it("finds nothing in a declaration with no body", () => {
    const declaration = findAbstractMethod(
      buildFixtureProgram({
        "packages/example/src/modules/a/a.service.ts":
          "export abstract class Base { public abstract run(): void; }",
      }),
    );

    expect(declaration).toBeDefined();
    expect(
      declaration === undefined ? undefined : service.collect(declaration),
    ).toStrictEqual([]);
  });

  it("finds nothing in a body that calls nothing", () => {
    expect(
      collectSites({
        displayName: "entry",
        source: "export function entry(): number { return 1; }",
      }),
    ).toStrictEqual([]);
  });
});
