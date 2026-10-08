import { AddressLookupService } from "@callidescope/cli";
import { AddressDepthService, BreadthService } from "@callidescope/graph";
import { AddressReportService } from "@callidescope/output";
import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { AddressService } from "./address.service";

import type { LocatedWorkspace } from "@callidescope/cli";
import type { CallableId } from "@callidescope/core";
import type { DiscoveredCallable } from "@callidescope/graph";

/** The address every test looks up. */
const ADDRESS = "src/foo.service.ts#FooService.bar";

describe(AddressService, () => {
  let addressDepthService: ReturnType<typeof createMock<AddressDepthService>>;
  let addressLookupService: ReturnType<typeof createMock<AddressLookupService>>;
  let addressReportService: ReturnType<typeof createMock<AddressReportService>>;
  let breadthService: ReturnType<typeof createMock<BreadthService>>;
  let service: AddressService;

  beforeAll(async () => {
    addressDepthService = createMock<AddressDepthService>();
    addressLookupService = createMock<AddressLookupService>();
    addressReportService = createMock<AddressReportService>();
    breadthService = createMock<BreadthService>();

    const module = await Test.createTestingModule({
      providers: [
        AddressService,
        { provide: AddressDepthService, useValue: addressDepthService },
        { provide: AddressLookupService, useValue: addressLookupService },
        { provide: AddressReportService, useValue: addressReportService },
        { provide: BreadthService, useValue: breadthService },
      ],
    }).compile();

    service = await module.resolve(AddressService);
  });

  /** Stubs a lookup that resolved, holding one traced callable. */
  function stubResolved(): void {
    addressLookupService.locate.mockResolvedValue(
      createMock<LocatedWorkspace>({
        located: {
          callablesById: new Map<CallableId, DiscoveredCallable>([
            ["id", createMock<DiscoveredCallable>()],
          ]),
        },
      }),
    );
    addressLookupService.resolve.mockReturnValue({
      id: "id",
      kind: "resolved",
    });
    addressLookupService.describeProblem.mockReturnValue(undefined);
    addressReportService.renderDepthReports.mockReturnValue("# Depth");
    addressReportService.renderBreadthReports.mockReturnValue("# Breadth");
  }

  beforeEach(() => {
    stubResolved();
  });

  it("is defined", () => {
    expect.hasAssertions();
    expect(service).toBeDefined();
  });

  it("resolves the address against the directories it was given, never prompting", async () => {
    expect.hasAssertions();

    await service.runDepth({
      addresses: [ADDRESS],
      directories: ["packages/alpha"],
    });

    // A task runner has nobody to prompt. Nothing here has to ask it not to:
    // the plugin drives the lookup service directly rather than through a
    // command, and every value that command would prompt for is passed.
    expect(addressLookupService.locate).toHaveBeenCalledWith({
      directories: ["packages/alpha"],
    });
  });

  it("passes a configuration path and format through to the lookup", async () => {
    expect.hasAssertions();

    await service.runDepth({
      addresses: [ADDRESS],
      configurationPath: "elsewhere.ts",
      directories: ["packages/alpha"],
      format: "json",
    });

    expect(addressLookupService.locate).toHaveBeenCalledWith({
      config: "elsewhere.ts",
      directories: ["packages/alpha"],
      format: "json",
    });
  });

  describe("runDepth", () => {
    it("renders the stacks above and below the callable", async () => {
      expect.hasAssertions();

      await expect(
        service.runDepth({
          addresses: [ADDRESS],
          directories: ["packages/alpha"],
        }),
      ).resolves.toStrictEqual({ ok: true, report: "# Depth" });
      expect(addressDepthService.buildUpwardStacks).toHaveBeenCalledTimes(1);
      expect(addressDepthService.buildDownwardStacks).toHaveBeenCalledTimes(1);
    });

    it("reports the reason an address could not be resolved", async () => {
      expect.hasAssertions();

      addressLookupService.describeProblem.mockReturnValue(
        "No callable matches it.",
      );

      // Returned rather than thrown or logged: the executor's product is what
      // it writes, and a reader wants the reason where the report would be.
      await expect(
        service.runDepth({
          addresses: [ADDRESS],
          directories: ["packages/alpha"],
        }),
      ).resolves.toStrictEqual({
        ok: false,
        report: "No callable matches it.",
      });
    });

    it("reports an address that resolved to nothing without a stated problem", async () => {
      expect.hasAssertions();

      addressLookupService.locate.mockResolvedValue(
        createMock<LocatedWorkspace>({}),
      );
      addressLookupService.resolve.mockReturnValue({ kind: "not-found" });
      addressLookupService.describeProblem.mockReturnValue(undefined);

      await expect(
        service.runDepth({
          addresses: [ADDRESS],
          directories: ["packages/alpha"],
        }),
      ).resolves.toMatchObject({ ok: false });
    });
  });

  describe("runBreadth", () => {
    it("renders the callable's direct callers and callees", async () => {
      expect.hasAssertions();

      await expect(
        service.runBreadth({
          addresses: [ADDRESS],
          directories: ["packages/alpha"],
        }),
      ).resolves.toStrictEqual({ ok: true, report: "# Breadth" });
      expect(breadthService.describeDirectCalls).toHaveBeenCalledTimes(1);
    });

    it("refuses an address that resolved to a callable nothing traced", async () => {
      expect.hasAssertions();

      addressLookupService.locate.mockResolvedValue(
        createMock<LocatedWorkspace>({
          located: { callablesById: new Map() },
        }),
      );
      addressLookupService.resolve.mockReturnValue({
        id: "id",
        kind: "resolved",
      });

      await expect(
        service.runBreadth({
          addresses: [ADDRESS],
          directories: ["packages/alpha"],
        }),
      ).resolves.toMatchObject({ ok: false });
    });

    it("reports the reason an address could not be resolved", async () => {
      expect.hasAssertions();

      addressLookupService.describeProblem.mockReturnValue("Ambiguous.");

      await expect(
        service.runBreadth({
          addresses: [ADDRESS],
          directories: ["packages/alpha"],
        }),
      ).resolves.toStrictEqual({ ok: false, report: "Ambiguous." });
    });
  });

  describe("several addresses", () => {
    it("renders every address it was given as one report", async () => {
      expect.hasAssertions();

      await expect(
        service.runDepth({
          addresses: [ADDRESS, "packages/beta/src/b.service.ts#B.c"],
          directories: ["packages/alpha"],
        }),
      ).resolves.toStrictEqual({ ok: true, report: "# Depth" });

      // One traced selection serves both, and each address gets its own pair
      // of stack walks inside it.
      expect(addressLookupService.locate).toHaveBeenCalledTimes(1);
      expect(addressDepthService.buildUpwardStacks).toHaveBeenCalledTimes(2);
      expect(addressDepthService.buildDownwardStacks).toHaveBeenCalledTimes(2);
    });

    it("hands the renderer one report per address, naming each", async () => {
      expect.hasAssertions();

      await service.runDepth({
        addresses: [ADDRESS, "packages/beta/src/b.service.ts#B.c"],
        directories: ["packages/alpha"],
      });

      const rendered =
        addressReportService.renderDepthReports.mock.calls[0]?.[0];

      expect(rendered?.reports.map((report) => report.address)).toStrictEqual([
        ADDRESS,
        "packages/beta/src/b.service.ts#B.c",
      ]);
    });

    // All or nothing, the way the command line is: a partial answer under a
    // passing task is worse than a failed one.
    it("reports nothing when any one address does not resolve", async () => {
      expect.hasAssertions();

      addressLookupService.resolve
        .mockReturnValueOnce({ id: "id", kind: "resolved" })
        .mockReturnValueOnce({ kind: "not-found" });
      addressLookupService.describeProblem
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce("No callable matches it.");

      await expect(
        service.runDepth({
          addresses: [ADDRESS, "nope.ts#Nope.nope"],
          directories: ["packages/alpha"],
        }),
      ).resolves.toStrictEqual({
        ok: false,
        report: "No callable matches it.",
      });
      expect(addressReportService.renderDepthReports).not.toHaveBeenCalled();
    });

    it("names every address that failed, not only the first", async () => {
      expect.hasAssertions();

      addressLookupService.resolve.mockReturnValue({ kind: "not-found" });
      addressLookupService.describeProblem
        .mockReturnValueOnce("First is ambiguous.")
        .mockReturnValueOnce("Second matches nothing.");

      await expect(
        service.runDepth({
          addresses: [ADDRESS, "nope.ts#Nope.nope"],
          directories: ["packages/alpha"],
        }),
      ).resolves.toStrictEqual({
        ok: false,
        report: "First is ambiguous.\nSecond matches nothing.",
      });
    });

    it("renders every address's direct calls as one breadth report", async () => {
      expect.hasAssertions();

      await expect(
        service.runBreadth({
          addresses: [ADDRESS, "packages/beta/src/b.service.ts#B.c"],
          directories: ["packages/alpha"],
        }),
      ).resolves.toStrictEqual({ ok: true, report: "# Breadth" });
      expect(breadthService.describeDirectCalls).toHaveBeenCalledTimes(2);
    });
  });
});
