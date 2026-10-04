import { Injectable, Scope } from "@nestjs/common";
import DataLoader from "dataloader";

import { type {{namePascalCase}} } from "./{{nameKebabCase}}.types";
import { {{namePascalCase}}Service } from "./{{nameKebabCase}}.service";

/**
 * TODO: Document the {{nameCamelCase}} dataloader.
 *
 * Dataloaders are request-scoped to ensure caching is limited to
 * a single GraphQL request, preventing data leakage across requests.
 */
@Injectable({ scope: Scope.REQUEST })
export class {{namePascalCase}}Loader {
  // 🏗 Dependency Injection

  constructor(private readonly {{nameCamelCase}}Service: {{namePascalCase}}Service) {}

  // 🔑 Public Fields

  public readonly byId = new DataLoader<string, {{namePascalCase}} | null>(
    async (ids: readonly string[]) => {
      // TODO: Implement batch loading logic via {{nameCamelCase}}Service.
      // Must return an array of the same length and order as `ids`.
      // Example: return this.{{nameCamelCase}}Service.findByIds(ids as string[]);
      return ids.map(() => null);
    }
  );
}
