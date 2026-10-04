import path from "node:path";
import { fileURLToPath } from "node:url";

import { createViteLibraryConfig } from "../../../../configuration/vite.library.config";

const packageDirectory = path.dirname(fileURLToPath(import.meta.url));

export default createViteLibraryConfig({
  entry: {
    "src/executors/validate/executor": path.resolve(
      packageDirectory,
      "src/executors/validate/executor.ts",
    ),
    "src/generators/sync/generator": path.resolve(
      packageDirectory,
      "src/generators/sync/generator.ts",
    ),
    "src/index": path.resolve(packageDirectory, "src/index.ts"),
    "src/main": path.resolve(packageDirectory, "src/main.ts"),
  },
  packageDirectory,
});
