import { createServerFn as createServerFunction } from "@tanstack/react-start";

/**
 * Serialized text document owned by a user in the personal library feature.
 */
export interface UserText {
  /** Text UUID */
  id: string;
  /** Content of the text */
  text: string;
  /** Title of the text */
  title: string;
  /** ID of the user who owns the text */
  user_id: string;
}

/**
 * Server function placeholder for listing texts in the current user's library.
 */
export const getUserTexts = createServerFunction({ method: "GET" }).handler(
  // eslint-disable-next-line @typescript-eslint/require-await
  async (): Promise<UserText[]> => {
    return [];
  },
);

/**
 * Server function placeholder for creating a user-owned text document.
 */
export const createUserText = createServerFunction({ method: "POST" })
  .validator((data: { text: string; title: string }) => data)
  .handler(
    async (): Promise<{
      error: null | string;
      success: boolean;
      text: null | UserText;
    }> => {
      await Promise.resolve();
      return { error: null, success: true, text: null };
    },
  );

/**
 * Server function placeholder for updating an existing user text.
 */
export const updateUserText = createServerFunction({ method: "POST" })
  .validator((data: { id: string; text: string; title: string }) => data)
  .handler(
    // eslint-disable-next-line @typescript-eslint/require-await
    async (): Promise<{ error: null | string; success: boolean }> => {
      return { error: null, success: true };
    },
  );

/**
 * Server function placeholder for deleting a user text by id.
 */
export const deleteUserText = createServerFunction({ method: "POST" })
  .validator((data: { id: string }) => data)
  .handler(
    // eslint-disable-next-line @typescript-eslint/require-await
    async (): Promise<{ error: null | string; success: boolean }> => {
      return { error: null, success: true };
    },
  );
