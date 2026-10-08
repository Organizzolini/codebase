import { Module } from "@nestjs/common";

/**
 * Not `@Global()`, but imported by all four other modules.
 *
 * The ambient rule counts inbound edges rather than reading decorators, so
 * this module reaches the same threshold a global one would.
 */
@Module({})
export class SettingsModule {}
