// ♟️ Constants

import { z } from "zod";

export const clearPromptResponseSchema = z.object({
  dictionary: z.boolean().optional(),
  literature: z.boolean().optional(),
});
