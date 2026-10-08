import { Module } from "@nestjs/common";

import { PartOfSpeechFormsService } from "./part-of-speech-forms.service";
import { PartOfSpeechService } from "./part-of-speech.service";

/**
 * TODO: Document the partOfSpeech module.
 */
@Module({
  controllers: [],
  exports: [PartOfSpeechService],
  imports: [],
  providers: [PartOfSpeechFormsService, PartOfSpeechService],
})
export class PartOfSpeechModule {}
