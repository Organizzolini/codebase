import { createServerFn as createServerFunction } from "@tanstack/react-start";

/**
 * Authenticated user.
 */
export interface AuthenticationUser {
  avatarUrl?: string;
  email: string;
  id: string;
  name?: string;
}

/**
 * Server function to get the current authenticated user.
 * Returns null if not authenticated.
 */
export const getCurrentUser = createServerFunction({ method: "GET" }).handler(
  async (): Promise<AuthenticationUser | null> => {
    await Promise.resolve();
    return null;
  },
);

/**
 * Server function to sign out the current user.
 */
export const signOut = createServerFunction({ method: "POST" }).handler(
  async (): Promise<{ success: boolean }> => {
    await Promise.resolve();
    return { success: true };
  },
);

/**
 * Server function to get the OAuth sign-in URL for Google.
 */
export const getGoogleSignInUrl = createServerFunction({ method: "GET" })
  .validator((data: { redirectTo: string }) => data)
  .handler(async (): Promise<{ error: null | string; url: null | string }> => {
    await Promise.resolve();
    return { error: null, url: "/" };
  });

/**
 * Server function to exchange an OAuth code for a session.
 * This is called after the OAuth provider redirects back to our app.
 */
export const exchangeCodeForSession = createServerFunction({ method: "POST" })
  .validator((data: { code: string }) => data)
  .handler(async (): Promise<{ error: null | string; success: boolean }> => {
    await Promise.resolve();
    return { error: null, success: true };
  });

/**
 * Server function to delete the current user's account.
 * This requires admin privileges in production.
 */
export const deleteAccount = createServerFunction({ method: "POST" }).handler(
  async (): Promise<{ error: null | string; success: boolean }> => {
    await Promise.resolve();
    return { error: null, success: true };
  },
);
