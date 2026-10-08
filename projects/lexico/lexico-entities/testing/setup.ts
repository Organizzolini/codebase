import fs from "node:fs";

import "reflect-metadata";
import { noop } from "lodash";
import { beforeAll, beforeEach, vi } from "vitest";

/**
 * Global test setup - automatically imported via vitest.config.ts setupFiles.
 * This file is executed before all tests.
 */

// 🎯 Setup global test environment
beforeAll(() => {
  const outputDirectory = "./output";
  if (!fs.existsSync(outputDirectory)) {
    fs.mkdirSync(outputDirectory, { recursive: true });
  }
});

// 🤐 Suppress console output in tests by default
beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "log").mockImplementation(noop);
  vi.spyOn(console, "error").mockImplementation(noop);
  vi.spyOn(console, "warn").mockImplementation(noop);
});
