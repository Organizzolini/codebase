import path from "node:path";

import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { InventoryService } from "./inventory.service";

import type {
  InventoriedInstance,
  InventoriedPairing,
  InventoriedTemplate,
} from "@conformetry/core";

/** A complete pairing: every file the template declares is present. */
const COMPLETE: InventoriedPairing = {
  matchedFileCount: 5,
  matchRatio: 1,
  name: "nestjs-command-module",
  templateFileCount: 5,
};

/** A partial pairing, three of the template's five files. */
const PARTIAL: InventoriedPairing = {
  matchedFileCount: 3,
  matchRatio: 0.6,
  name: "nestjs-service-module",
  templateFileCount: 5,
};

/** Discovery reports absolute paths, so the fixtures do too. */
const GEARS_PATH = path.join(
  "/workspace",
  "packages/widgets/src/modules/gears",
);

/** The shortened form of `GEARS_PATH`, spelled with the platform separator. */
const GEARS_RELATIVE_PATH = path.join("packages/widgets/src/modules/gears");

/** One template with a description and one instance. */
const COMMAND_MODULE: InventoriedTemplate = {
  description: "Generate a NestJS command module",
  instances: [{ ...COMPLETE, name: GEARS_RELATIVE_PATH }],
  name: "nestjs-command-module",
  templatePath: "configuration/templates/nestjs-command-module",
};

/** One template declaring no description. */
const BARE_MODULE: InventoriedTemplate = {
  description: "",
  instances: [],
  name: "react-component",
  templatePath: "configuration/templates/react-component",
};

describe(InventoryService, () => {
  let service: InventoryService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [InventoryService],
    }).compile();

    service = await module.resolve(InventoryService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("describeTemplates", () => {
    it("names a template with its description and folder", () => {
      const lines = service
        .describeTemplates({
          showInstances: false,
          templates: [COMMAND_MODULE],
        })
        .join("\n");

      expect(lines).toContain("nestjs-command-module");
      expect(lines).toContain("Generate a NestJS command module");
      expect(lines).toContain(
        "Template: configuration/templates/nestjs-command-module",
      );
    });

    it("names a template declaring no description", () => {
      // Asserted as the whole line set rather than by absent substring: the
      // point is that no description line is emitted at all, which a
      // `not.toContain` would also satisfy for the wrong reason.
      const lines = service.describeTemplates({
        showInstances: false,
        templates: [BARE_MODULE],
      });

      expect(lines).toStrictEqual([
        "  react-component",
        "    Template: configuration/templates/react-component",
      ]);
    });

    // A bare listing is a registry; naming every instance of every template
    // would bury the handful somebody actually asked about.
    it("omits instances unless the caller asked for them", () => {
      expect(
        service
          .describeTemplates({
            showInstances: false,
            templates: [COMMAND_MODULE],
          })
          .join("\n"),
      ).not.toContain("Instances:");
    });

    it("lists the instances a template explains when asked", () => {
      const lines = service
        .describeTemplates({ showInstances: true, templates: [COMMAND_MODULE] })
        .join("\n");

      expect(lines).toContain("Instances:");
      expect(lines).toContain(`${GEARS_RELATIVE_PATH} 5/5 files 100%`);
    });

    // Asking for instances of a template nothing was generated from must not
    // print an empty heading.
    it("omits the heading for a template explaining nothing", () => {
      expect(
        service
          .describeTemplates({ showInstances: true, templates: [BARE_MODULE] })
          .join("\n"),
      ).not.toContain("Instances:");
    });

    it("renders every template given, in order", () => {
      expect(
        service.describeTemplates({
          showInstances: false,
          templates: [COMMAND_MODULE, BARE_MODULE],
        }),
      ).toHaveLength(5);
    });

    it("renders nothing when given no templates", () => {
      expect(
        service.describeTemplates({ showInstances: true, templates: [] }),
      ).toStrictEqual([]);
    });
  });

  describe("describeInstances", () => {
    it("names an instance with every template that explains it", () => {
      const lines = service
        .describeInstances([
          { path: GEARS_RELATIVE_PATH, templates: [COMPLETE, PARTIAL] },
        ])
        .join("\n");

      expect(lines).toContain(GEARS_RELATIVE_PATH);
      expect(lines).toContain("Templates:");
      expect(lines).toContain("nestjs-command-module 5/5 files 100%");
      expect(lines).toContain("nestjs-service-module 3/5 files 60%");
    });

    it("indents a pairing beneath its entry", () => {
      const lines = service.describeInstances([
        { path: GEARS_RELATIVE_PATH, templates: [COMPLETE] },
      ]);

      expect(lines[0]).toMatch(/^ {2}\S/u);
      expect(lines[2]).toMatch(/^ {6}\S/u);
    });

    it("renders nothing when given no instances", () => {
      expect(service.describeInstances([])).toStrictEqual([]);
    });
  });

  describe("shortenInstancePaths", () => {
    it("shortens each instance path against the working directory", () => {
      const instances: InventoriedInstance[] = [
        { path: GEARS_PATH, templates: [COMPLETE] },
      ];

      expect(
        service.shortenInstancePaths({
          instances,
          workingDirectory: "/workspace",
        }),
      ).toStrictEqual([{ path: GEARS_RELATIVE_PATH, templates: [COMPLETE] }]);
    });

    it("leaves a path outside the working directory reachable", () => {
      expect(
        service.shortenInstancePaths({
          instances: [{ path: "/elsewhere/widgets", templates: [] }],
          workingDirectory: "/workspace",
        })[0]?.path,
      ).toContain("..");
    });
  });

  describe("shortenTemplatePairings", () => {
    it("shortens the path naming each instance a template explains", () => {
      const templates: InventoriedTemplate[] = [
        { ...COMMAND_MODULE, instances: [{ ...COMPLETE, name: GEARS_PATH }] },
      ];

      expect(
        service.shortenTemplatePairings({
          templates,
          workingDirectory: "/workspace",
        })[0]?.instances[0]?.name,
      ).toBe(GEARS_RELATIVE_PATH);
    });

    it("leaves a template explaining nothing untouched", () => {
      expect(
        service.shortenTemplatePairings({
          templates: [BARE_MODULE],
          workingDirectory: "/workspace",
        })[0]?.instances,
      ).toStrictEqual([]);
    });
  });
});
