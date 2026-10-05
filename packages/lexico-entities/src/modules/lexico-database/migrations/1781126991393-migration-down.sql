SET lock_timeout = '10s';
SET statement_timeout = '5m';

ALTER TABLE "tokens" DROP CONSTRAINT "FK_75ceaf795d390a0a045c4eccee1";

ALTER TABLE "tokens" DROP CONSTRAINT "FK_4a94e9093c0191e7f01e0a2d02e";

ALTER TABLE "tokens" DROP CONSTRAINT "FK_7b903b4a513daa0b4d4839d4cc3";

ALTER TABLE "tokens" DROP CONSTRAINT "FK_784a19cd725470a3068fc62db39";

ALTER TABLE "texts" DROP CONSTRAINT "FK_c3172aa0d3cd4c678d44dae85cd";

ALTER TABLE "texts" DROP CONSTRAINT "FK_275807c423ad9d0b569c2b9ca81";

ALTER TABLE "lines" DROP CONSTRAINT "FK_8ba479aa45ba1795a3f7e5c8d22";

ALTER TABLE "lines" DROP CONSTRAINT "FK_90ccb87cbd0fd6952e1aee42482";

ALTER TABLE "word_lexemes" DROP CONSTRAINT "FK_579999929ed6b899e769cd234ba";

ALTER TABLE "word_lexemes" DROP CONSTRAINT "FK_643892e2709e1d49641fb965b82";

ALTER TABLE "word_forms" DROP CONSTRAINT "FK_54256ad366638dd2243dcd88b25";

ALTER TABLE "word_forms" DROP CONSTRAINT "FK_f19edc2c148cc8536b7bba7afa9";

ALTER TABLE "translations" DROP CONSTRAINT "FK_03033925e968b7c9430896d55f8";

ALTER TABLE "pronunciations" DROP CONSTRAINT "FK_ccf78e53911b7c121a65192c89d";

ALTER TABLE "principal_parts" DROP CONSTRAINT "FK_95d23e3a9561dea102f7bf9325e";

ALTER TABLE "inflections" DROP CONSTRAINT "FK_ebe1d473505c1ffc72c57d57731";

ALTER TABLE "forms" DROP CONSTRAINT "FK_52ebb86789cf513c7fb44ab9a95";

COMMENT ON TABLE "tokens" IS NULL;

DROP INDEX "public"."IDX_3e996c69e86e8b258ca8703166";

DROP INDEX "public"."IDX_49d4478795971e788f76d88330";

DROP INDEX "public"."IDX_75ceaf795d390a0a045c4eccee";

DROP INDEX "public"."IDX_b7c16a9e93dbe1c7e06542fd67";

DROP INDEX "public"."IDX_784a19cd725470a3068fc62db3";

DROP TABLE "tokens";

COMMENT ON TABLE "texts" IS NULL;

DROP INDEX "public"."IDX_c3172aa0d3cd4c678d44dae85c";

DROP INDEX "public"."IDX_275807c423ad9d0b569c2b9ca8";

DROP TABLE "texts";

COMMENT ON TABLE "lines" IS NULL;

DROP INDEX "public"."IDX_b2c6fef6d09c7cd7b3c92a5664";

DROP INDEX "public"."IDX_90ccb87cbd0fd6952e1aee4248";

DROP TABLE "lines";

COMMENT ON TABLE "authors" IS NULL;

DROP TABLE "authors";

COMMENT ON TABLE "words" IS NULL;

DROP TABLE "words";

COMMENT ON TABLE "word_lexemes" IS NULL;

DROP INDEX "public"."IDX_3bfcf800c79bf43fa516db099d";

DROP INDEX "public"."IDX_579999929ed6b899e769cd234b";

DROP INDEX "public"."IDX_643892e2709e1d49641fb965b8";

DROP TABLE "word_lexemes";

COMMENT ON TABLE "word_forms" IS NULL;

DROP INDEX "public"."IDX_a3450e22c3c4ab78e8f3f817c8";

DROP INDEX "public"."IDX_54256ad366638dd2243dcd88b2";

DROP INDEX "public"."IDX_f19edc2c148cc8536b7bba7afa";

DROP TABLE "word_forms";

COMMENT ON TABLE "lexemes" IS NULL;

DROP INDEX "public"."IDX_f6fa0a0a5e197c157882f29c22";

DROP INDEX "public"."IDX_9204890678d644ba216ae116e3";

DROP TABLE "lexemes";

DROP TYPE "public"."lexemes_part_of_speech_enum";

COMMENT ON TABLE "translations" IS NULL;

DROP INDEX "public"."IDX_9bc0b8d1aa44faf6ebfde865a2";

DROP INDEX "public"."IDX_03033925e968b7c9430896d55f";

DROP INDEX "public"."IDX_39313ab7fdf2f551cde7ef9611";

DROP TABLE "translations";

DELETE FROM "public"."typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "database" = $3 AND "schema" = $4 AND "table" = $5;

COMMENT ON TABLE "pronunciations" IS NULL;

DROP INDEX "public"."IDX_81c176364b794cdcdf309a7a60";

DROP INDEX "public"."IDX_8fc53b1cbb6c5683b37f65a328";

DROP INDEX "public"."IDX_8de57efb4c40b209b2883c3d8c";

DROP INDEX "public"."IDX_ccf78e53911b7c121a65192c89";

DROP TABLE "pronunciations";

DROP TYPE "public"."pronunciations_variant_enum";

COMMENT ON TABLE "principal_parts" IS NULL;

DROP INDEX "public"."IDX_95d23e3a9561dea102f7bf9325";

DROP TABLE "principal_parts";

COMMENT ON TABLE "inflections" IS NULL;

DROP INDEX "public"."IDX_2f191c1029749f9f01b877e7f8";

DROP TABLE "inflections";

DROP TYPE "public"."inflections_conjugation_enum";

DROP TYPE "public"."inflections_case_enum";

DROP TYPE "public"."inflections_adverb_type_enum";

DROP TYPE "public"."inflections_degree_enum";

DROP TYPE "public"."inflections_gender_enum";

DROP TYPE "public"."inflections_declension_enum";

COMMENT ON TABLE "forms" IS NULL;

DROP INDEX "public"."IDX_2bc463838022e5cc652df63c4a";

DROP INDEX "public"."IDX_52ebb86789cf513c7fb44ab9a9";

DROP TABLE "forms";

DROP TYPE "public"."forms_voice_enum";

DROP TYPE "public"."forms_tense_enum";

DROP TYPE "public"."forms_person_enum";

DROP TYPE "public"."forms_mood_enum";

DROP TYPE "public"."forms_degree_enum";

DROP TYPE "public"."forms_number_enum";

DROP TYPE "public"."forms_gender_enum";

DROP TYPE "public"."forms_form_case_enum";
