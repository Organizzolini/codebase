import { Module } from "@nestjs/common";

import { RenderingModule } from "../rendering/rendering.module";

import { TemplateDiscoveryService } from "./template-discovery.service";

/**
 * Provides template discovery: reading template folders and rendering their
 * files against an instance.
 *
 * Imports `RenderingModule` rather than substituting locally, so discovery
 * renders a template exactly as generation did.
 */
@Module({
  controllers: [],
  exports: [TemplateDiscoveryService],
  imports: [RenderingModule],
  providers: [TemplateDiscoveryService],
})
export class TemplateDiscoveryModule {}
