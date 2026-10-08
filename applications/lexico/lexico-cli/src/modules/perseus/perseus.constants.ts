// ♟️ Constants

import { z } from "zod";

export const perseusTreeNodeSchema = z.object({
  path: z.string(),
  type: z.string(),
});

export const perseusTreeResponseSchema = z.object({
  tree: z.array(perseusTreeNodeSchema),
});
