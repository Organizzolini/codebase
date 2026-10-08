import { Module } from "@nestjs/common";

import { InputModule } from "../input/input.module";
import { InstanceDiscoveryModule } from "../instance-discovery/instance-discovery.module";
import { InstanceGroupModule } from "../instance-group/instance-group.module";
import { RenderingModule } from "../rendering/rendering.module";
import { TemplateDiscoveryModule } from "../template-discovery/template-discovery.module";

import { ConfigurationService } from "./configuration.service";

/**
 * Provides the configuration layer's one public service.
 *
 * The five modules above supply the collaborators `ConfigurationService` is
 * assembled from, and none of them is re-exported: a consumer outside this
 * package injects `ConfigurationService` and nothing else, which is what makes
 * this layer one entry point rather than a bag of services a caller has to
 * know the names of. The three sibling ic-suite toolchains publish exactly
 * this pair, and conformetry now reads as the same shape.
 */
@Module({
  controllers: [],
  exports: [ConfigurationService],
  imports: [
    InputModule,
    InstanceDiscoveryModule,
    InstanceGroupModule,
    RenderingModule,
    TemplateDiscoveryModule,
  ],
  providers: [ConfigurationService],
})
export class ConfigurationModule {}
