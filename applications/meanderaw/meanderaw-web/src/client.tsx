import { StartClient } from "@tanstack/react-start/client";
import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";

// Kept rather than left to TanStack's identical virtual entry: it is the only
// static `react-dom/client` import, and without one the dependency checks strip
// `react-dom` from this project's manifest.
startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <StartClient />
    </StrictMode>,
  );
});
