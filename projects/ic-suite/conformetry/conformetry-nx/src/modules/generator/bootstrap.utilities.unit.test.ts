import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { lstat, readlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  resolveGeneratorService,
  resolveOptionsService,
  resolveProjectsService,
} from "../plugin/plugin-context.utilities";

import { bootstrapPlugin, runBootstrapCli } from "./bootstrap.utilities";
import { DEFAULT_OUTPUT_PATH } from "./generator.constants";

// What the emitted files contain is the generator service's business and is
// tested there; what these functions own is putting them where Nx looks.
vi.mock("../plugin/plugin-context.utilities", () => ({
  resolveGeneratorService: vi.fn(),
  resolveOptionsService: vi.fn(),
  resolveProjectsService: vi.fn(),
}));

const emitPlugin = vi.fn();
const resolveConfigurationPath =
  vi.fn<
    (args: {
      exists: (candidatePath: string) => boolean;
      nxConfiguration: unknown;
    }) => string
  >();

describe("bootstrap utilities", () => {
  let workspaceRoot: string;

  beforeEach(() => {
    workspaceRoot = mkdtempSync(path.join(tmpdir(), "conformetry-bootstrap-"));
    emitPlugin.mockResolvedValue([
      {
        content: '{ "generators": {} }\n',
        filePath: path.join(DEFAULT_OUTPUT_PATH, "generators.json"),
      },
      {
        content: "{}\n",
        filePath: path.join(DEFAULT_OUTPUT_PATH, "src/schemas/kept.json"),
      },
    ]);
    // type-coverage:ignore-next-line -- a deliberate stand-in for the service
    vi.mocked(resolveGeneratorService).mockResolvedValue({
      emitPlugin,
    } as unknown as Awaited<ReturnType<typeof resolveGeneratorService>>);
    resolveConfigurationPath.mockReturnValue("conformetry.config.ts");
    // type-coverage:ignore-next-line -- a deliberate stand-in for the service
    vi.mocked(resolveOptionsService).mockResolvedValue({
      resolveConfigurationPath,
    } as unknown as Awaited<ReturnType<typeof resolveOptionsService>>);
    // type-coverage:ignore-next-line -- a deliberate stand-in for the service
    vi.mocked(resolveProjectsService).mockResolvedValue({
      listWorkspaceProjects: () => [],
    } as unknown as Awaited<ReturnType<typeof resolveProjectsService>>);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe(bootstrapPlugin, () => {
    it("writes every emitted file to disk", async () => {
      await bootstrapPlugin(workspaceRoot);

      expect(
        readFileSync(
          path.join(workspaceRoot, DEFAULT_OUTPUT_PATH, "generators.json"),
          "utf8",
        ),
      ).toBe('{ "generators": {} }\n');
    });

    it("drops a schema the configuration no longer declares", async () => {
      const schemasPath = path.join(
        workspaceRoot,
        DEFAULT_OUTPUT_PATH,
        "src/schemas",
      );

      mkdirSync(schemasPath, { recursive: true });
      writeFileSync(path.join(schemasPath, "removed.json"), "{}\n", "utf8");

      await bootstrapPlugin(workspaceRoot);

      expect(existsSync(path.join(schemasPath, "removed.json"))).toBe(false);
      expect(existsSync(path.join(schemasPath, "kept.json"))).toBe(true);
    });

    it("links the emitted plugin into the root node_modules", async () => {
      await bootstrapPlugin(workspaceRoot);

      const linkPath = path.join(workspaceRoot, "node_modules/conformetry");
      const linkStatistics = await lstat(linkPath);

      expect(linkStatistics.isSymbolicLink()).toBe(true);
      // Relative, so the link keeps working if the workspace is moved.
      expect(path.isAbsolute(await readlink(linkPath))).toBe(false);
      expect(readFileSync(path.join(linkPath, "generators.json"), "utf8")).toBe(
        '{ "generators": {} }\n',
      );
    });

    it("replaces the link rather than failing when bootstrapped twice", async () => {
      await bootstrapPlugin(workspaceRoot);

      await expect(bootstrapPlugin(workspaceRoot)).resolves.toHaveLength(2);
    });

    it("refuses to overwrite an installed package of the same name", async () => {
      // The plugin's name is unscoped, so an unrelated dependency could hold
      // this path; deleting it would be worse than failing to link.
      mkdirSync(path.join(workspaceRoot, "node_modules/conformetry"), {
        recursive: true,
      });

      await expect(bootstrapPlugin(workspaceRoot)).rejects.toThrow(
        "is an installed package",
      );
    });

    it("replaces a dangling link left behind by a deleted emit", async () => {
      // A link this bootstrap made previously, whose target has since been
      // removed, still counts as ours — `realpathSync` throws on it, and the
      // fallback treats a link with nothing on disk as leading nowhere else.
      mkdirSync(path.join(workspaceRoot, "node_modules"), { recursive: true });
      symlinkSync(
        path.join(workspaceRoot, "no-longer-there"),
        path.join(workspaceRoot, "node_modules/conformetry"),
        "dir",
      );

      await expect(bootstrapPlugin(workspaceRoot)).resolves.toHaveLength(2);

      const linkPath = path.join(workspaceRoot, "node_modules/conformetry");

      expect(readFileSync(path.join(linkPath, "generators.json"), "utf8")).toBe(
        '{ "generators": {} }\n',
      );
    });

    it("refuses a link to somewhere other than the emitted plugin", async () => {
      // pnpm installs packages as symlinks into its store, so being a link is
      // no evidence the link is this bootstrap's.
      const installedPath = path.join(workspaceRoot, "store/conformetry");

      mkdirSync(installedPath, { recursive: true });
      mkdirSync(path.join(workspaceRoot, "node_modules"), { recursive: true });
      symlinkSync(
        installedPath,
        path.join(workspaceRoot, "node_modules/conformetry"),
        "dir",
      );

      await expect(bootstrapPlugin(workspaceRoot)).rejects.toThrow(
        "is an installed package",
      );
    });

    it("returns the files it emitted", async () => {
      await expect(bootstrapPlugin(workspaceRoot)).resolves.toHaveLength(2);
    });

    it("emits from the path the workspace registered the plugin with", async () => {
      const nxConfiguration = {
        plugins: [
          {
            options: { configurationPath: "elsewhere/conformetry.config.ts" },
            plugin: "@conformetry/nx",
          },
        ],
      };

      writeFileSync(
        path.join(workspaceRoot, "nx.json"),
        JSON.stringify(nxConfiguration),
        "utf8",
      );
      resolveConfigurationPath.mockReturnValue(
        "elsewhere/conformetry.config.ts",
      );

      await bootstrapPlugin(workspaceRoot);

      // A postinstall gets no options from Nx, so the registration is read.
      expect(resolveConfigurationPath).toHaveBeenCalledWith(
        expect.objectContaining({ nxConfiguration }),
      );
      expect(emitPlugin).toHaveBeenCalledWith({
        configurationPath: "elsewhere/conformetry.config.ts",
        outputPath: DEFAULT_OUTPUT_PATH,
        packageName: "conformetry",
        projects: [],
      });
    });

    it("discovers a root config file when the workspace has no nx.json", async () => {
      writeFileSync(
        path.join(workspaceRoot, "conformetry.json"),
        "[]\n",
        "utf8",
      );
      // Stands in for the real candidate walk, so what is asserted is that the
      // bootstrap hands over a predicate answering about its own workspace.
      resolveConfigurationPath.mockImplementation((args) => {
        return args.exists("conformetry.json")
          ? "conformetry.json"
          : "conformetry.config.ts";
      });

      await bootstrapPlugin(workspaceRoot);

      expect(resolveConfigurationPath).toHaveBeenCalledWith(
        expect.objectContaining({ nxConfiguration: undefined }),
      );
      expect(emitPlugin).toHaveBeenCalledWith(
        expect.objectContaining({ configurationPath: "conformetry.json" }),
      );
    });
  });

  describe(runBootstrapCli, () => {
    it("reports what it emitted", async () => {
      const info = vi.spyOn(console, "info").mockReturnValue(undefined);

      await runBootstrapCli(workspaceRoot);

      // Emoji then a verb, matching the logger convention the rest of the
      // toolchain follows, with the varying count carried as data.
      expect(info).toHaveBeenCalledWith(
        expect.stringMatching(/^👔 Emitted /u),
        { count: 2 },
      );
    });

    it("warns rather than failing the install when the emit throws", async () => {
      const warn = vi.spyOn(console, "warn").mockReturnValue(undefined);

      emitPlugin.mockRejectedValue(new Error("the configuration is broken"));

      await expect(runBootstrapCli(workspaceRoot)).resolves.toBeUndefined();
      expect(warn).toHaveBeenCalledWith("the configuration is broken");
    });

    it("warns with whatever was thrown when it is not an error", async () => {
      const warn = vi.spyOn(console, "warn").mockReturnValue(undefined);

      emitPlugin.mockRejectedValue("thrown as a string");

      await runBootstrapCli(workspaceRoot);

      expect(warn).toHaveBeenCalledWith("thrown as a string");
    });
  });
});
