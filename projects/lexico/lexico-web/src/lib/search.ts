import { createServerFn as createServerFunction } from "@tanstack/react-start";

import type { EntryFull, EntrySearchResult } from "./types";

/**
 * Search input.
 */
interface SearchInput {
  language?: "auto" | "english" | "latin";
  query: string;
}

export const searchEntries = createServerFunction({ method: "GET" })
  .validator((data: SearchInput) => data)
  .handler(
    // eslint-disable-next-line @typescript-eslint/require-await
    async (): Promise<EntrySearchResult[]> => {
      return [];
    },
  );

/**
 * Get entry input.
 */
interface GetEntryInput {
  id: string;
}

export const getEntry = createServerFunction({ method: "GET" })
  .validator((data: GetEntryInput) => data)
  .handler(
    // eslint-disable-next-line @typescript-eslint/require-await
    async (): Promise<EntryFull | null> => {
      return null;
    },
  );
