import { Injectable } from "@nestjs/common";

import { SETTINGS } from "./settings";

/** A provider, which the module graph never draws — only modules are nodes. */
@Injectable()
export class CatalogService {
  /** Reports the fixture's configured name. */
  name(): string {
    return SETTINGS.name;
  }
}
