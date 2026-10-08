import { Injectable } from "@nestjs/common";

/** One of nine structural `LineSink` implementations, past the cap of eight. */
@Injectable()
export class DatabaseSinkService {
  // 🔑 Public Fields

  /** Emits one line to the database sink. */
  public readonly emit = (line: string): string => `database:${line}`;
}
