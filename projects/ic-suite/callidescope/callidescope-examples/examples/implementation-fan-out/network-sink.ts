import { Injectable } from "@nestjs/common";

/** One of nine structural `LineSink` implementations, past the cap of eight. */
@Injectable()
export class NetworkSinkService {
  // 🔑 Public Fields

  /** Emits one line to the network sink. */
  public readonly emit = (line: string): string => `network:${line}`;
}
