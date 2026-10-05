import { Module } from "@nestjs/common";

import { EphemerisModule } from "../ephemeris/ephemeris.module";

import { IngressesComposerService } from "./ingresses-composer.service";
import { IngressesService } from "./ingresses.service";

/**
 * NestJS module for zodiacal ingress event detection.
 * Exports {@link IngressesService} which identifies when celestial bodies enter new
 * zodiac signs, decans, or reach their sign peak longitude.
 */
@Module({
  controllers: [],
  exports: [IngressesService],
  imports: [EphemerisModule],
  providers: [IngressesComposerService, IngressesService],
})
export class IngressesModule {}
