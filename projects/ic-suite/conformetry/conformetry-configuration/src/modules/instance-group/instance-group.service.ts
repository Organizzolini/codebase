import { Injectable } from "@nestjs/common";

import type { ConformetryInstanceGroup } from "./instance-group.types.js";

/**
 * Reads an instance group's own fields, for every host that resolves one.
 *
 * `ConformetryInstanceGroup` is declared beside this, and how its `tags` are
 * read decides which host owns a group — so the reading lives here rather than
 * in either host. `@conformetry/nx` resolves project-scoped groups against the
 * project graph; a host without one leaves them alone. The two answers must be
 * complements, and nothing would fail if they stopped being: each host would
 * simply take a different set of groups to be its own, and validation would
 * quietly measure the wrong tree.
 *
 * Dependency-free on purpose. Every host reaches it through
 * `ConfigurationService`, so nothing has to be wired up to ask this question —
 * including the install-time bootstrap, which has no project graph to hand
 * anybody.
 */
@Injectable()
export class InstanceGroupService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Whether a group locates its instances inside the hosts its tags select.
   *
   * Non-empty `tags` is the whole rule. An empty array is not a selector — it
   * selects nothing and would silence the group entirely — so it reads as the
   * workspace form, the same as omitting the field.
   */
  public isProjectScoped(group: ConformetryInstanceGroup): boolean {
    return group.tags !== undefined && group.tags.length > 0;
  }
}
