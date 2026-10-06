// ♟️ Constants

import { z } from "zod";

export const corpusScriptorumTreeNodeSchema = z.object({
  path: z.string(),
  type: z.string(),
});

export const corpusScriptorumTreeResponseSchema = z.object({
  tree: z.array(corpusScriptorumTreeNodeSchema),
});
