import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";

/**
 * Reports on the Postgres connection every caelundas repository shares.
 * The calendar events themselves are read and written by
 * `CalendarEventsService`.
 */
@Injectable()
export class CaelundasDatabaseService {
  // 🏗 Dependency Injection

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Whether the connection to the database is currently open. */
  isConnected(): boolean {
    return this.dataSource.isInitialized;
  }
}
