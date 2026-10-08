import { Injectable } from "@nestjs/common";

import type { Form } from "@codebase/lexico-entities";

/**
 * Service for managing transient words associated with Form entities during the ingestion process.
 */
@Injectable()
export class FormsTransientWordsService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  private readonly transientWordsByForm = new WeakMap<Form, string[]>();

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Retrieves the transient words associated with a given Form entity.
   */
  getTransientWords(form: Form): string[] {
    return this.transientWordsByForm.get(form) ?? [];
  }

  /**
   * Associates a list of transient words with a given Form entity.
   */
  setTransientWords(form: Form, words: string[]): void {
    this.transientWordsByForm.set(form, words);
  }
}
