import { z } from "zod";

// ♟️ Constants

/**
 * Validates what get{{namePascalCase}} is called with.
 */
export const get{{namePascalCase}}InputSchema = z.object({ id: z.string() });

/**
 * Validates what post{{namePascalCase}} is called with.
 */
export const post{{namePascalCase}}InputSchema = z.object({
  id: z.string(),
  title: z.string(),
});
