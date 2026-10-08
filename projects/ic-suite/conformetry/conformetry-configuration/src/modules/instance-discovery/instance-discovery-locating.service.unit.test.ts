import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { InstanceDiscoveryLocatingService } from "./instance-discovery-locating.service";

/**
 * Builds a workspace holding two module directories, so directory globs and
 * file globs can be exercised against the same tree.
 */
async function createWorkspace(): Promise<string> {
  const workingDirectory = await mkdtemp(
    path.join(tmpdir(), "conformetry-workspace-"),
  );

  for (const stem of ["differences", "logger"]) {
    const instancePath = path.join(
      workingDirectory,
      "packages/widgets/src/modules",
      stem,
    );

    await mkdir(instancePath, { recursive: true });

    for (const suffix of [
      ".module.ts",
      ".service.ts",
      ".service.unit.test.ts",
    ]) {
      await writeFile(path.join(instancePath, `${stem}${suffix}`), "", "utf8");
    }
  }

  return workingDirectory;
}

describe(InstanceDiscoveryLocatingService, () => {
  let service: InstanceDiscoveryLocatingService;
  let workingDirectory: string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [InstanceDiscoveryLocatingService],
    }).compile();

    service = await module.resolve(InstanceDiscoveryLocatingService);
    workingDirectory = await createWorkspace();
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("findInstances", () => {
    it("drops a directory instance an exclude glob matches", () => {
      const instances = service.findInstances({
        exclude: ["packages/widgets/src/modules/logger"],
        patterns: ["packages/*/src/modules/*"],
        workingDirectory,
      });

      expect(instances.map((instance) => instance.nameStem)).toStrictEqual([
        "differences",
      ]);
    });

    it("drops a file instance whose files an exclude glob matches", () => {
      const instances = service.findInstances({
        exclude: ["packages/widgets/src/modules/differences/**"],
        patterns: ["packages/*/src/modules/*/*.service.ts"],
        workingDirectory,
      });

      expect(instances.map((instance) => instance.nameStem)).toStrictEqual([
        "logger",
      ]);
    });

    it("names a directory instance by its basename and leaves the scope open", () => {
      const instances = service.findInstances({
        patterns: ["packages/*/src/modules/*"],
        workingDirectory,
      });

      expect(instances.map((instance) => instance.nameStem)).toStrictEqual([
        "differences",
        "logger",
      ]);
      expect(instances[0]?.fileScope).toBeUndefined();
    });

    it("derives the type an instance's own location answers", () => {
      // The template's `project.json` renders `{{type}}/{{nameKebabCase}}`
      // into its paths, and where the instance sits already says which.
      expect(
        service.findInstances({
          patterns: ["packages/*"],
          workingDirectory,
        })[0]?.substitutions,
      ).toStrictEqual({ type: "packages" });
    });

    it("derives no type for an instance outside the working directory", () => {
      expect(
        service.findInstances({
          patterns: ["../*"],
          workingDirectory: path.join(workingDirectory, "packages"),
        })[0]?.substitutions,
      ).toStrictEqual({});
    });

    it("lets a configured substitution win over the derived one", () => {
      // What a workspace nesting its projects deeper needs.
      expect(
        service.findInstances({
          patterns: ["packages/*"],
          substitutions: { type: "libraries" },
          workingDirectory,
        })[0]?.substitutions,
      ).toStrictEqual({ type: "libraries" });
    });

    it("collapses file matches sharing a name into one scoped instance", () => {
      const instances = service.findInstances({
        patterns: [
          "packages/*/src/modules/*/*.service.ts",
          "packages/*/src/modules/*/*.service.unit.test.ts",
        ],
        workingDirectory,
      });

      expect(instances).toHaveLength(2);
      expect(instances[0]?.nameStem).toBe("differences");
      expect(
        instances[0]?.fileScope?.map((filePath) => path.basename(filePath)),
      ).toStrictEqual([
        "differences.service.ts",
        "differences.service.unit.test.ts",
      ]);
    });

    it("keeps a directory instance separate from a file instance", () => {
      const instances = service.findInstances({
        patterns: [
          "packages/*/src/modules/differences",
          "packages/*/src/modules/differences/*.service.ts",
        ],
        workingDirectory,
      });

      expect(instances).toHaveLength(2);
      expect(
        instances.filter((instance) => instance.fileScope === undefined),
      ).toHaveLength(1);
    });

    it("falls back to the filename extension when a pattern names a file exactly", () => {
      const instances = service.findInstances({
        patterns: ["packages/*/src/modules/*/differences.module.ts"],
        workingDirectory,
      });

      expect(instances[0]?.nameStem).toBe("differences.module");
    });

    it("applies caller substitutions to every instance", () => {
      const instances = service.findInstances({
        patterns: ["packages/*/src/modules/*"],
        substitutions: { type: "packages" },
        workingDirectory,
      });

      expect(
        instances.every((instance) => {
          return instance.substitutions?.["type"] === "packages";
        }),
      ).toBe(true);
    });

    it("applies a group's threshold to every instance it locates", () => {
      const instances = service.findInstances({
        patterns: ["packages/*/src/modules/*"],
        threshold: 0.7,
        workingDirectory,
      });

      expect(instances.length).toBeGreaterThan(0);
      expect(instances.every((instance) => instance.threshold === 0.7)).toBe(
        true,
      );
    });

    it("leaves the threshold unset when the group declares none", () => {
      const instances = service.findInstances({
        patterns: ["packages/*/src/modules/*"],
        workingDirectory,
      });

      expect(instances[0]?.threshold).toBeUndefined();
    });

    it("returns nothing when a pattern matches nothing", () => {
      expect(
        service.findInstances({
          patterns: ["nowhere/*"],
          workingDirectory,
        }),
      ).toStrictEqual([]);
    });
  });
});
