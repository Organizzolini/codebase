import { Injectable } from "@nestjs/common";

/** One of nine structural `LineSink` implementations, past the cap of eight. */
@Injectable()
export class ApiSinkService {
  // 🔑 Public Fields

  /** Emits one line to the api sink. */
  public readonly emit = (line: string): string => `api:${line}`;
}
