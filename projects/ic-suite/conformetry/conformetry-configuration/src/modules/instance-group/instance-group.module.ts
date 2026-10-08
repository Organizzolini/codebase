import { Module } from "@nestjs/common";

import { InstanceGroupService } from "./instance-group.service";

/**
 * Provides the reading of an instance group's own fields.
 *
 * Its own module rather than a service inside `ConfigurationModule`, because
 * both sides of this package need it: the facade answers `isProjectScoped` for
 * the hosts, and instance discovery asks it which groups are its own. With the
 * answer living in `ConfigurationModule`, discovery importing that module and
 * the facade importing discovery would close a module cycle — and an import
 * cycle here crashes the Nx plugin worker rather than merely reading badly.
 */
@Module({
  controllers: [],
  exports: [InstanceGroupService],
  imports: [],
  providers: [InstanceGroupService],
})
export class InstanceGroupModule {}
