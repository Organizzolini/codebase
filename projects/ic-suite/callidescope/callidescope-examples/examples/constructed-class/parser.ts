import { Injectable } from "@nestjs/common";

/** A class whose constructor has a body, so the constructor is a frame. */
@Injectable()
export class ParserService {
  // 🏗 Dependency Injection

  /** Splits the source once, at construction time. */
  constructor(source: string) {
    this.tokens = source.split(",");
  }

  // 🔑 Public Fields

  /** The tokens the constructor produced. */
  public readonly tokens: string[];
}
