import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { Widget } from "./widget.entity";

import type { Repository } from "typeorm";

/** A provider of the kind a suite hands in: it injects a repository. */
@Injectable()
export class SampleWidgetsService {
  constructor(
    @InjectRepository(Widget)
    private readonly widgets: Repository<Widget>,
  ) {}

  /** Saves a widget named `displayName`. */
  async add(displayName: string): Promise<Widget> {
    return this.widgets.save(this.widgets.create({ displayName }));
  }
}
