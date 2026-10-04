import path from "node:path";
import { fileURLToPath } from "node:url";

import { createViteLibraryConfig } from "../../../../configuration/vite.library.config.ts";

export default createViteLibraryConfig({
  entry: {
    "src/index": path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "src/index.ts",
    ),
    "src/main": path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "src/main.ts",
    ),
  },
  packageDirectory: path.dirname(fileURLToPath(import.meta.url)),
});
