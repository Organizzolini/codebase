import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { formatFiles } from "@nx/devkit";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { AdapterService } from "./adapter.service";

import type { Tree } from "@nx/devkit";

// Formatting defers to the workspace's own configuration, which is Nx's job
// rather than this adapter's.
vi.mock("@nx/devkit", () => ({ formatFiles: vi.fn() }));

/** The subset of `Tree` the adapter uses, recording every write. */
function createFakeTree(root: string): {
  tree: Tree;
  writes: Map<string, string>;
} {
  const writes = new Map<string, string>();
  const tree = createMock<Tree>({
    children: (instancePath: string) => {
      return [...writes.keys()]
        .filter((filePath) => path.dirname(filePath) === instancePath)
        .map((filePath) => path.basename(filePath));
    },
    isFile: (filePath: string) => writes.has(filePath),
    // Text, not a buffer: the adapter always reads with an encoding.
    read: (filePath: string) => writes.get(filePath) ?? null,
    root,
    write: (filePath: string, content: string) => {
      writes.set(filePath, content);
    },
  });

  return { tree, writes };
}

describe(AdapterService, () => {
  let service: AdapterService;
  let workspaceRoot: string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [AdapterService],
    }).compile();

    service = await module.resolve(AdapterService);
    workspaceRoot = await mkdtemp(path.join(tmpdir(), "conformetry-nx-tree-"));
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("createAdapters", () => {
    it("writes through the tree using a workspace-relative path", async () => {
      const { tree, writes } = createFakeTree(workspaceRoot);
      const { filesystem } = service.createAdapters({ tree, workspaceRoot });

      await filesystem.writeFile(
        path.join(workspaceRoot, "packages/widgets/index.ts"),
        "export {};",
      );

      expect(writes.get("packages/widgets/index.ts")).toBe("export {};");
    });

    it("reads a file the tree already holds", async () => {
      const { tree } = createFakeTree(workspaceRoot);
      const { filesystem } = service.createAdapters({ tree, workspaceRoot });

      await filesystem.writeFile(
        path.join(workspaceRoot, "notes.md"),
        "# tree",
      );

      await expect(
        filesystem.readFile(path.join(workspaceRoot, "notes.md")),
      ).resolves.toBe("# tree");
    });

    it("falls back to the filesystem for a path outside the workspace", async () => {
      const outsideRoot = await mkdtemp(
        path.join(tmpdir(), "conformetry-nx-outside-"),
      );
      const outsideFilePath = path.join(outsideRoot, "template.txt");

      await writeFile(outsideFilePath, "on disk", "utf8");

      const { tree } = createFakeTree(workspaceRoot);
      const { filesystem } = service.createAdapters({ tree, workspaceRoot });

      await expect(filesystem.readFile(outsideFilePath)).resolves.toBe(
        "on disk",
      );
    });

    it("treats making a directory as a no-op", async () => {
      const { tree, writes } = createFakeTree(workspaceRoot);
      const { filesystem } = service.createAdapters({ tree, workspaceRoot });

      await filesystem.makeDirectory(path.join(workspaceRoot, "packages"));

      expect(writes.size).toBe(0);
    });

    it("lists a directory through the tree when it sits in the workspace", async () => {
      const { tree } = createFakeTree(workspaceRoot);
      const { filesystem } = service.createAdapters({ tree, workspaceRoot });

      await filesystem.writeFile(
        path.join(workspaceRoot, "widgets/gears.ts"),
        "export const gears = 1;\n",
      );

      await expect(
        filesystem.listDirectory(path.join(workspaceRoot, "widgets")),
      ).resolves.toStrictEqual([{ isDirectory: false, name: "gears.ts" }]);
    });

    it("lists a directory through the filesystem when it sits outside", async () => {
      const outsidePath = await mkdtemp(
        path.join(tmpdir(), "conformetry-out-"),
      );

      await writeFile(path.join(outsidePath, "notes.md"), "# Notes\n", "utf8");

      const { tree } = createFakeTree(workspaceRoot);
      const { filesystem } = service.createAdapters({ tree, workspaceRoot });

      await expect(
        filesystem.listDirectory(outsidePath),
      ).resolves.toStrictEqual([{ isDirectory: false, name: "notes.md" }]);
    });

    it("writes an absolute path unchanged when it sits outside the workspace", async () => {
      const outsidePath = await mkdtemp(
        path.join(tmpdir(), "conformetry-out-"),
      );
      const filePath = path.join(outsidePath, "notes.md");
      const { tree, writes } = createFakeTree(workspaceRoot);
      const { filesystem } = service.createAdapters({ tree, workspaceRoot });

      await filesystem.writeFile(filePath, "# Notes\n");

      expect(writes.get(filePath)).toBe("# Notes\n");
    });

    it("hands formatting to Nx rather than doing its own", async () => {
      const { tree } = createFakeTree(workspaceRoot);
      const { formatter } = service.createAdapters({ tree, workspaceRoot });

      await formatter.formatFiles([]);

      expect(formatFiles).toHaveBeenCalledWith(tree);
    });
  });
});
