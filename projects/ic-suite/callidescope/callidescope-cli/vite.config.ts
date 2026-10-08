import path from "node:path";
import { fileURLToPath } from "node:url";

import { createViteLibraryConfig } from "../../../../configuration/vite.library.config.ts";

const packageDirectory = path.dirname(fileURLToPath(import.meta.url));

export default createViteLibraryConfig({
  entry: {
    "src/index": path.resolve(packageDirectory, "src/index.ts"),
    "src/main": path.resolve(packageDirectory, "src/main.ts"),
  },
  packageDirectory,
});
