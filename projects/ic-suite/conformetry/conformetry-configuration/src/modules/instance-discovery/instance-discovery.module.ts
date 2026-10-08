import { Module } from "@nestjs/common";

import { InstanceGroupModule } from "../instance-group/instance-group.module";
import { RenderingModule } from "../rendering/rendering.module";
import { TemplateDiscoveryModule } from "../template-discovery/template-discovery.module";

import { InstanceDiscoveryLocatingService } from "./instance-discovery-locating.service";
import { InstanceDiscoveryMatchingService } from "./instance-discovery-matching.service";
import { InstanceDiscoveryService } from "./instance-discovery.service";

/**
 * Provides instance discovery: finding generated code, and deciding what
 * explains it.
 *
 * Re-exports `TemplateDiscoveryModule`, because every answer this module gives
 * is stated in terms of a `TemplateDefinition` — a caller that can match
 * instances but cannot read a template folder has half an API.
 */
@Module({
  controllers: [],
  exports: [
    InstanceDiscoveryLocatingService,
    InstanceDiscoveryMatchingService,
    InstanceDiscoveryService,
    TemplateDiscoveryModule,
  ],
  imports: [InstanceGroupModule, RenderingModule, TemplateDiscoveryModule],
  providers: [
    InstanceDiscoveryLocatingService,
    InstanceDiscoveryMatchingService,
    InstanceDiscoveryService,
  ],
})
export class InstanceDiscoveryModule {}
