{{! A GET reads for a route loader; a POST writes for a component, which calls it through useServerFn and then invalidates the router. }}
import { createServerFn as createServerFunction } from "@tanstack/react-start";

import {
  get{{namePascalCase}}InputSchema,
  post{{namePascalCase}}InputSchema,
} from "./{{nameKebabCase}}.constants";
import {
  find{{namePascalCase}},
  save{{namePascalCase}},
} from "./{{nameKebabCase}}.utilities";

import type { {{namePascalCase}} } from "./{{nameKebabCase}}.types";

// 🛰️ Server Functions

/**
 * Reads one {{nameCamelCase}} record, for a route loader.
 */
export const get{{namePascalCase}} = createServerFunction({ method: "GET" })
  .validator(get{{namePascalCase}}InputSchema)
  .handler(({ data }): {{namePascalCase}} => {
    return find{{namePascalCase}}(data);
  });

/**
 * Writes one {{nameCamelCase}} record, for a component through useServerFn.
 */
export const post{{namePascalCase}} = createServerFunction({ method: "POST" })
  .validator(post{{namePascalCase}}InputSchema)
  .handler(({ data }): {{namePascalCase}} => {
    return save{{namePascalCase}}(data);
  });
