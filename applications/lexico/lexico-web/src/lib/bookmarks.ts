import { createServerFn as createServerFunction } from "@tanstack/react-start";

import type { PartOfSpeech, PrincipalParts } from "./types";

/**
 * Serialized entry shape returned by bookmark server functions.
 */
export interface BookmarkedEntry {
  /** Entry UUID */
  id: string;
  /** Inflection metadata */
  inflection: Record<string, object>;
  /** Part of speech classification */
  part_of_speech: PartOfSpeech;
  /** Principal parts of the entry */
  principal_parts: PrincipalParts;
  /** Translation strings */
  translations: string[];
}

/**
 * Server function placeholder for listing the current user's bookmarked entries.
 */
export const getBookmarks = createServerFunction({ method: "GET" }).handler(
  // eslint-disable-next-line @typescript-eslint/require-await
  async (): Promise<BookmarkedEntry[]> => {
    return [];
  },
);

/**
 * Server function placeholder for checking bookmark status of a single entry.
 */
export const isBookmarked = createServerFunction({ method: "GET" })
  .validator((data: { entryId: string }) => data)
  .handler(
    // eslint-disable-next-line @typescript-eslint/require-await
    async (): Promise<boolean> => {
      return false;
    },
  );

/**
 * Server function placeholder for creating a bookmark for one entry.
 */
export const addBookmark = createServerFunction({ method: "POST" })
  .validator((data: { entryId: string }) => data)
  .handler(
    // eslint-disable-next-line @typescript-eslint/require-await
    async (): Promise<{ error: null | string; success: boolean }> => {
      return { error: null, success: true };
    },
  );

/**
 * Server function placeholder for removing a bookmark for one entry.
 */
export const removeBookmark = createServerFunction({ method: "POST" })
  .validator((data: { entryId: string }) => data)
  .handler(
    // eslint-disable-next-line @typescript-eslint/require-await
    async (): Promise<{ error: null | string; success: boolean }> => {
      return { error: null, success: true };
    },
  );

/**
 * Server function placeholder for toggling bookmark state and returning the new status.
 */
export const toggleBookmark = createServerFunction({ method: "POST" })
  .validator((data: { entryId: string }) => data)
  .handler(
    async (): Promise<{
      bookmarked: boolean;
      error: null | string;
      success: boolean;
    }> => {
      await Promise.resolve();
      return {
        bookmarked: false,
        error: null,
        success: true,
      };
    },
  );
