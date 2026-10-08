import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { ConfigurationLoaderService } from "./configuration-loader.service";

describe(ConfigurationLoaderService, () => {
  let service: ConfigurationLoaderService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [ConfigurationLoaderService],
    }).compile();

    service = await module.resolve(ConfigurationLoaderService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("findConfigurationFile", () => {
    it("finds a configuration file in the search directory itself", async () => {
      const directory = await mkdtemp(
        path.join(tmpdir(), "codependix-loader-"),
      );
      const configurationPath = path.join(directory, "codependix.config.json");

      await writeFile(configurationPath, "{}", "utf8");

      expect(service.findConfigurationFile(directory)).toBe(configurationPath);
    });

    it("walks upward to find a configuration file", async () => {
      const root = await mkdtemp(path.join(tmpdir(), "codependix-loader-"));
      const nested = path.join(root, "nested", "deeper");

      await mkdir(nested, { recursive: true });

      const configurationPath = path.join(root, "codependix.config.json");

      await writeFile(configurationPath, "{}", "utf8");

      expect(service.findConfigurationFile(nested)).toBe(configurationPath);
    });

    it("returns undefined when no configuration file exists", async () => {
      const directory = await mkdtemp(
        path.join(tmpdir(), "codependix-loader-"),
      );

      expect(service.findConfigurationFile(directory)).toBeUndefined();
    });
  });

  describe("findProjectConfigurationFile", () => {
    it("finds a configuration file colocated with the project", async () => {
      const directory = await mkdtemp(
        path.join(tmpdir(), "codependix-loader-"),
      );
      const configurationPath = path.join(directory, "codependix.config.json");

      await writeFile(configurationPath, "{}", "utf8");

      expect(service.findProjectConfigurationFile(directory)).toBe(
        configurationPath,
      );
    });

    it("never walks upward, unlike findConfigurationFile", async () => {
      const root = await mkdtemp(path.join(tmpdir(), "codependix-loader-"));
      const nested = path.join(root, "nested");

      await mkdir(nested, { recursive: true });
      await writeFile(path.join(root, "codependix.config.json"), "{}", "utf8");

      expect(service.findProjectConfigurationFile(nested)).toBeUndefined();
    });
  });

  describe("readAuthoredConfiguration", () => {
    it("reads and parses a JSON configuration file", async () => {
      const directory = await mkdtemp(
        path.join(tmpdir(), "codependix-loader-"),
      );

      await writeFile(
        path.join(directory, "codependix.config.json"),
        JSON.stringify({ include: ["**"] }),
        "utf8",
      );

      await expect(
        service.readAuthoredConfiguration({ searchDirectory: directory }),
      ).resolves.toStrictEqual({ include: ["**"] });
    });

    it("resolves to an empty configuration when none is found", async () => {
      const directory = await mkdtemp(
        path.join(tmpdir(), "codependix-loader-"),
      );

      await expect(
        service.readAuthoredConfiguration({ searchDirectory: directory }),
      ).resolves.toStrictEqual({});
    });
  });

  describe("resolveConfigurationPath", () => {
    it("resolves an existing relative path against the cwd", async () => {
      const directory = await mkdtemp(
        path.join(tmpdir(), "codependix-loader-"),
      );
      const configurationPath = path.join(directory, "codependix.config.json");

      await writeFile(configurationPath, "{}", "utf8");

      expect(service.resolveConfigurationPath(configurationPath)).toBe(
        configurationPath,
      );
    });
  });
});
