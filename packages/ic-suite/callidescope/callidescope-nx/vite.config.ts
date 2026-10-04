import path from "node:path";
import { fileURLToPath } from "node:url";

import { createViteLibraryConfig } from "../../../../configuration/vite.library.config.ts";

const packageDirectory = path.dirname(fileURLToPath(import.meta.url));

export default createViteLibraryConfig({
  entry: {
    "src/executors/breadth/executor": path.resolve(
      packageDirectory,
      "src/executors/breadth/executor.ts",
    ),
    "src/executors/depth/executor": path.resolve(
      packageDirectory,
      "src/executors/depth/executor.ts",
    ),
    "src/executors/gate/executor": path.resolve(
      packageDirectory,
      "src/executors/gate/executor.ts",
    ),
    "src/executors/trace/executor": path.resolve(
      packageDirectory,
      "src/executors/trace/executor.ts",
    ),
    "src/index": path.resolve(packageDirectory, "src/index.ts"),
  },
  packageDirectory,
});
