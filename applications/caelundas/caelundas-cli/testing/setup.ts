import fs from "node:fs";

import "reflect-metadata";
import { beforeAll, beforeEach, vi } from "vitest";

/**
 * Global test setup - automatically imported via vitest.config.ts setupFiles.
 * This file is executed before all tests.
 */

// Ensure output directory exists for database files (needed for integration tests)
beforeAll(() => {
  const outputDirectory = "./output";
  if (!fs.existsSync(outputDirectory)) {
    fs.mkdirSync(outputDirectory, { recursive: true });
  }
});

// Suppress console output in tests by default
beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
