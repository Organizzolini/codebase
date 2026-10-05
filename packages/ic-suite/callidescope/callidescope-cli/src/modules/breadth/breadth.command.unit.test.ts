import {
  ConfigurationModule,
  ConfigurationService,
  flagResolutionError,
  ProjectConfigurationFieldNotPermittedError,
} from "@callidescope/configuration";
import { BreadthService, ProgramConfigurationError } from "@callidescope/graph";
import { AddressReportService } from "@callidescope/output";
import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { LoggerService } from "@codebase/logging";

import { buildDiscoveredCallable } from "../../../testing/mocks";
import { AddressLookupService } from "../address-lookup/address-lookup.service";

import { BreadthCommand } from "./breadth.command";

import type { LocatedWorkspace } from "../address-lookup/address-lookup.types";
import type { ResolvedCallidescopeConfiguration } from "@callidescope/configuration";

/** A resolved configuration with the defaults these tests assume. */
function buildConfiguration(): ResolvedCallidescopeConfiguration {
  return {
    directories: [],
    entryPoints: {
      addresses: [],
      decorators: [],
      includeExportedFunctions: true,
      includeOrphans: true,
      includeTests: false,
    },
    exclude: [],
    excludeCallees: [],
    excludeFrom: [],
    limits: {
      maximumDepth: 6,
    },
    write: {
      json: undefined,
      markdown: undefined,
      mermaid: undefined,
    },
  };
}

/** An empty located outcome, for tests that only care about the resolution. */
function buildLocated(): {
  callablesById: Map<string, ReturnType<typeof buildDiscoveredCallable>>;
  graph: {
    calleeIdsByCaller: Map<string, string[]>;
    callerIdsByCallee: Map<string, string[]>;
    edges: never[];
    unresolvedCallerIds: Set<string>;
    unresolvedCalls: never[];
  };
  startingProjectRoots: Map<string, string>;
} {
  return {
    callablesById: new Map(),
    graph: {
      calleeIdsByCaller: new Map(),
      callerIdsByCallee: new Map(),
      edges: [],
      unresolvedCallerIds: new Set(),
      unresolvedCalls: [],
    },
    startingProjectRoots: new Map(),
  };
}

describe(BreadthCommand, () => {
  let addressLookupService: ReturnType<typeof createMock<AddressLookupService>>;
  let addressReportService: ReturnType<typeof createMock<AddressReportService>>;
  let breadthService: ReturnType<typeof createMock<BreadthService>>;
  let command: BreadthCommand;
  let configurationService: ConfigurationService;
  let logger: ReturnType<typeof createMock<LoggerService>>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [ConfigurationModule],
      providers: [
        BreadthCommand,
        {
          provide: AddressLookupService,
          useValue: createMock<AddressLookupService>(),
        },
        {
          provide: AddressReportService,
          useValue: createMock<AddressReportService>(),
        },
        { provide: BreadthService, useValue: createMock<BreadthService>() },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    command = await module.resolve(BreadthCommand);
    configurationService = await module.resolve(ConfigurationService);
  });

  const originalIsTty = process.stdin.isTTY;

  beforeEach(() => {
    addressLookupService = createMock<AddressLookupService>();
    addressReportService = createMock<AddressReportService>();
    breadthService = createMock<BreadthService>();
    logger = createMock<LoggerService>();
    // Not a terminal by default, so a test that does not opt into prompting
    // exercises the refusal a scripted run gets.
    process.stdin.isTTY = false;

    command = new BreadthCommand(
      addressLookupService,
      addressReportService,
      breadthService,
      configurationService,
      logger,
    );

    vi.spyOn(process.stdout, "write").mockReturnValue(true);
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.exitCode = undefined;
    process.stdin.isTTY = originalIsTty;
  });

  it("is defined", () => {
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    const module = await Test.createTestingModule({
      imports: [ConfigurationModule],
      providers: [
        BreadthCommand,
        {
          provide: AddressLookupService,
          useValue: createMock<AddressLookupService>(),
        },
        {
          provide: AddressReportService,
          useValue: createMock<AddressReportService>(),
        },
        { provide: BreadthService, useValue: createMock<BreadthService>() },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    await module.resolve(BreadthCommand);

    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("BreadthCommand");
  });

  // 🎛️ Option parsing

  it("delegates option parsing to the shared parsing service", () => {
    expect(command.parseAddresses("a.ts#A.b, b.ts#B.c")).toStrictEqual([
      "a.ts#A.b",
      "b.ts#B.c",
    ]);
    expect(command.parseFormat("json")).toBe("json");
    expect(command.parseDirectories("alpha,beta")).toStrictEqual([
      "alpha",
      "beta",
    ]);
    expect(command.parseConfig("callidescope.config.ts")).toBe(
      "callidescope.config.ts",
    );
  });

  it.each([
    "parseEntryPointAddresses",
    "parseEntryPointDecorators",
    "parseExclude",
    "parseExcludeCallees",
  ] as const)("splits %s on commas", (method) => {
    expect(command[method]("alpha, beta")).toStrictEqual(["alpha", "beta"]);
  });

  it.each([
    ["parseIncludeExportedFunctions", "false"],
    ["parseIncludeOrphans", "false"],
    ["parseIncludeTests", "true"],
  ] as const)("passes %s through unchanged", (method, value) => {
    expect(command[method](value)).toBe(value);
  });

  // 🏃 Running

  it("rejects a run with no addresses it could ask for", async () => {
    await command.run([], {});

    expect(process.exitCode).toBe(1);
    expect(addressLookupService.resolve).not.toHaveBeenCalled();
  });

  // A positional argument is no longer read at all, so one passed out of
  // habit must not quietly stand in for the flag.
  it("ignores a positional argument, asking for the flag instead", async () => {
    await command.run(["a.ts#Foo.bar"], {});

    expect(process.exitCode).toBe(1);
    expect(addressLookupService.resolve).not.toHaveBeenCalled();
  });

  it("rejects a run whose address could not be resolved", async () => {
    addressLookupService.locate.mockResolvedValue({
      configuration: buildConfiguration(),
      format: "markdown",
      located: buildLocated(),
      workspaceRoot: "/workspace",
    });
    addressLookupService.resolve.mockReturnValue({ kind: "not-found" });
    addressLookupService.describeProblem.mockReturnValue(
      "No callable matches it.",
    );

    await command.run([], { addresses: ["a.ts#Foo.bar"] });

    expect(process.exitCode).toBe(1);
    expect(breadthService.describeDirectCalls).not.toHaveBeenCalled();
  });

  it("fails when the resolved id was not among the traced callables", async () => {
    addressLookupService.locate.mockResolvedValue({
      configuration: buildConfiguration(),
      format: "markdown",
      located: buildLocated(),
      workspaceRoot: "/workspace",
    });
    addressLookupService.resolve.mockReturnValue({
      id: "missing#0",
      kind: "resolved",
    });
    addressLookupService.describeProblem.mockReturnValue(undefined);

    await command.run([], { addresses: ["a.ts#Foo.bar"] });

    expect(process.exitCode).toBe(1);
    expect(breadthService.describeDirectCalls).not.toHaveBeenCalled();
  });

  it("names the direct calls of the resolved callable and prints the report", async () => {
    const located = buildLocated();
    const callable = buildDiscoveredCallable({
      displayName: "Foo.bar",
      id: "a.ts#0",
    });

    located.callablesById.set("a.ts#0", callable);

    addressLookupService.locate.mockResolvedValue({
      configuration: buildConfiguration(),
      format: "markdown",
      located,
      workspaceRoot: "/workspace",
    });
    addressLookupService.resolve.mockReturnValue({
      id: "a.ts#0",
      kind: "resolved",
    });
    addressLookupService.describeProblem.mockReturnValue(undefined);
    breadthService.describeDirectCalls.mockReturnValue({
      callees: [],
      callers: [],
    });
    addressReportService.renderBreadthReports.mockReturnValue(
      "rendered breadth\n",
    );

    await command.run([], { addresses: ["a.ts#Foo.bar"] });

    expect(breadthService.describeDirectCalls).toHaveBeenCalledWith({
      callablesById: located.callablesById,
      graph: located.graph,
      id: "a.ts#0",
    });
    // The format is the run's, named once, rather than repeated into every
    // report the run renders.
    expect(addressReportService.renderBreadthReports).toHaveBeenCalledWith({
      format: "markdown",
      reports: [
        {
          address: "a.ts#Foo.bar",
          directCalls: { callees: [], callers: [] },
          displayName: "Foo.bar",
          id: "a.ts#0",
          location: callable.node.location,
        },
      ],
    });
    expect(process.stdout.write).toHaveBeenCalledWith("rendered breadth\n");
    expect(process.exitCode).toBeUndefined();
  });

  // 🗣️ Prompting

  it("prompts for the addresses when the flag is missing", async () => {
    process.stdin.isTTY = true;
    vi.spyOn(
      configurationService,
      "promptForAutocompleteMultiselect",
    ).mockResolvedValue(["a.ts#Foo.bar"]);
    addressLookupService.listAddresses.mockReturnValue([
      "a.ts#Foo.bar",
      "b.ts#Bar.baz",
    ]);
    addressLookupService.locate.mockResolvedValue({
      configuration: buildConfiguration(),
      format: "markdown",
      located: buildLocated(),
      workspaceRoot: "/workspace",
    });
    addressLookupService.resolve.mockReturnValue({ kind: "not-found" });
    addressLookupService.describeProblem.mockReturnValue(
      "No callable matches it.",
    );

    // A format is passed explicitly so this test exercises only the address
    // prompt, not the separate format prompt that would otherwise also run.
    await command.run([], { format: "markdown" });

    // The list it completes against is what the one trace found, so the
    // caller picks a callable that provably exists.
    expect(
      configurationService.promptForAutocompleteMultiselect,
    ).toHaveBeenCalledWith({
      message: "Which callables? (file#qualified-name)",
      subject:
        'At least one callable address, as in "breadth --addresses src/foo.service.ts#FooService.bar"',
      suggestions: ["a.ts#Foo.bar", "b.ts#Bar.baz"],
    });
    expect(addressLookupService.resolve).toHaveBeenCalledWith({
      address: "a.ts#Foo.bar",
      workspace: expect.objectContaining({
        workspaceRoot: "/workspace",
      }) as LocatedWorkspace,
    });
  });

  it("does not prompt for the addresses when the flag was given", async () => {
    process.stdin.isTTY = true;
    vi.spyOn(configurationService, "promptForAutocompleteMultiselect");
    addressLookupService.locate.mockResolvedValue({
      configuration: buildConfiguration(),
      format: "markdown",
      located: buildLocated(),
      workspaceRoot: "/workspace",
    });
    addressLookupService.resolve.mockReturnValue({ kind: "not-found" });
    addressLookupService.describeProblem.mockReturnValue(
      "No callable matches it.",
    );

    await command.run([], {
      addresses: ["a.ts#Foo.bar"],
      format: "markdown",
    });

    expect(
      configurationService.promptForAutocompleteMultiselect,
    ).not.toHaveBeenCalled();
  });

  it("prompts for a format when it was left off, at a terminal", async () => {
    process.stdin.isTTY = true;
    vi.spyOn(configurationService, "promptForSelect").mockResolvedValue("json");
    addressLookupService.locate.mockResolvedValue({
      configuration: buildConfiguration(),
      format: "markdown",
      located: buildLocated(),
      workspaceRoot: "/workspace",
    });
    addressLookupService.resolve.mockReturnValue({ kind: "not-found" });
    addressLookupService.describeProblem.mockReturnValue(
      "No callable matches it.",
    );

    await command.run([], { addresses: ["a.ts#Foo.bar"] });

    expect(configurationService.promptForSelect).toHaveBeenCalledWith({
      choices: ["markdown", "mermaid", "json"],
      message: "Which output format?",
      subject: "An output format (--format)",
    });
    // The prompted format reaches the trace, which reads the configuration
    // it scopes the run with.
    expect(addressLookupService.locate).toHaveBeenCalledWith({
      addresses: ["a.ts#Foo.bar"],
      format: "json",
    });
  });

  it("does not prompt for a format that was already given", async () => {
    process.stdin.isTTY = true;
    vi.spyOn(configurationService, "promptForSelect");
    addressLookupService.locate.mockResolvedValue({
      configuration: buildConfiguration(),
      format: "markdown",
      located: buildLocated(),
      workspaceRoot: "/workspace",
    });
    addressLookupService.resolve.mockReturnValue({ kind: "not-found" });
    addressLookupService.describeProblem.mockReturnValue(
      "No callable matches it.",
    );

    await command.run([], {
      addresses: ["a.ts#Foo.bar"],
      format: "mermaid",
    });

    expect(configurationService.promptForSelect).not.toHaveBeenCalled();
  });

  // A genuine failure keeps its stack rather than being reported to the
  // reader as a command line they mistyped.
  it("lets a failure that is not a refused command line propagate", async () => {
    addressLookupService.locate.mockRejectedValue(new Error("Trace failed."));

    await expect(
      command.run([], { addresses: ["a.ts#Foo.bar"], format: "markdown" }),
    ).rejects.toThrow("Trace failed.");
  });

  // A lookup resolves its flags before it traces, and `prepareLookup` throws
  // rather than returning a half-prepared lookup — so the refusal an
  // unrecognized `--format` earns has to reach the reader as a rejected
  // command line under the same headline the workspace run prints.
  // cspell:ignore markdwon
  it("reports a refused command line instead of crashing", async () => {
    const error = flagResolutionError([
      '--format does not accept "markdwon". It takes one of "markdown", "mermaid", "json".',
    ]);

    addressLookupService.locate.mockRejectedValue(error);

    await command.run([], { addresses: ["a.ts#Foo.bar"], format: "markdwon" });

    expect(logger.error).toHaveBeenCalledExactlyOnceWith(
      "🔭 Rejected the command line",
      undefined,
      { reason: error.message },
    );
    expect(process.exitCode).toBe(1);
    expect(process.stdout.write).not.toHaveBeenCalled();
  });

  // A lookup traces before it matches, so it loads the configuration of every
  // project it reaches — and a file somebody wrote is reported as such, under
  // the same headline a full trace prints, rather than as a crash.
  it("reports a refused project configuration instead of crashing", async () => {
    const error = new ProjectConfigurationFieldNotPermittedError({
      field: "excludeFrom",
      project: "packages/thing",
    });

    addressLookupService.locate.mockRejectedValue(error);

    await command.run([], { addresses: ["a.ts#Foo.bar"], format: "markdown" });

    expect(logger.error).toHaveBeenCalledExactlyOnceWith(
      "🔭 Rejected a project configuration",
      undefined,
      { reason: error.message },
    );
    expect(process.exitCode).toBe(1);
    expect(process.stdout.write).not.toHaveBeenCalled();
  });

  // A lookup traces before it matches, so it can reach a project whose
  // `tsconfig.json` is missing or will not parse — the same failure a
  // whole-workspace trace already reports under this headline, rather than
  // the raw stack `main.ts`'s handler would otherwise print.
  it("reports a project it could not read instead of crashing", async () => {
    const error = new ProgramConfigurationError({
      configurationPath: "packages/broken/tsconfig.json",
      messages: ["missing"],
    });

    addressLookupService.locate.mockRejectedValue(error);

    await command.run([], { addresses: ["a.ts#Foo.bar"], format: "markdown" });

    expect(logger.error).toHaveBeenCalledExactlyOnceWith(
      "🔭 Rejected a project it could not read",
      undefined,
      { reason: error.message },
    );
    expect(process.exitCode).toBe(1);
    expect(process.stdout.write).not.toHaveBeenCalled();
  });

  // 📚 Several addresses

  // All or nothing: half a report under an exit code that says the run
  // succeeded for the addresses it did understand is worse than no report.
  it("prints nothing when any one of several addresses does not resolve", async () => {
    const located = buildLocated();
    const callable = buildDiscoveredCallable({
      displayName: "Foo.bar",
      id: "a.ts#0",
    });

    located.callablesById.set("a.ts#0", callable);
    addressLookupService.locate.mockResolvedValue({
      configuration: buildConfiguration(),
      format: "markdown",
      located,
      workspaceRoot: "/workspace",
    });
    addressLookupService.resolve
      .mockReturnValueOnce({ id: "a.ts#0", kind: "resolved" })
      .mockReturnValueOnce({ kind: "not-found" });
    addressLookupService.describeProblem
      .mockReturnValueOnce(undefined)
      .mockReturnValueOnce("No callable matches it.");
    breadthService.describeDirectCalls.mockReturnValue({
      callees: [],
      callers: [],
    });

    await command.run([], {
      addresses: ["a.ts#Foo.bar", "b.ts#Nope.nope"],
      format: "markdown",
    });

    expect(process.exitCode).toBe(1);
    expect(process.stdout.write).not.toHaveBeenCalled();
    expect(addressReportService.renderBreadthReports).not.toHaveBeenCalled();
  });

  // An unresolved address with nothing to say about it still has to reach the
  // reader as something rather than as `undefined`.
  it("explains an address that resolved to nothing without a stated problem", async () => {
    addressLookupService.locate.mockResolvedValue({
      configuration: buildConfiguration(),
      format: "markdown",
      located: buildLocated(),
      workspaceRoot: "/workspace",
    });
    addressLookupService.resolve.mockReturnValue({ kind: "not-found" });
    addressLookupService.describeProblem.mockReturnValue(undefined);

    await command.run([], {
      addresses: ["a.ts#Foo.bar"],
      format: "markdown",
    });

    expect(process.exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalledWith(
      "🔭 Rejected a callable address",
      undefined,
      { problems: ['"a.ts#Foo.bar" resolved to nothing.'] },
    );
  });
});
