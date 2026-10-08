import { Injectable } from "@nestjs/common";

/** One of nine structural `LineSink` implementations, past the cap of eight. */
@Injectable()
export class FileSinkService {
  // 🔑 Public Fields

  /** Emits one line to the file sink. */
  public readonly emit = (line: string): string => `file:${line}`;
}
