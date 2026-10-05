// ♟️ Constants
import tzLookup from "@photostructure/tz-lookup";
import moment from "moment-timezone";
import { z } from "zod";

/**
 * Earliest supported date for ephemeris calculations, based on NASA JPL DE431 data.
 */
export const minimumDate = "1900-01-01";

/**
 * Latest supported date for ephemeris calculations, based on NASA JPL DE431 data.
 */
export const maximumDate = "2100-12-31";

/**
 * Zod schema for validating and transforming user input for ephemeris calculations.
 *
 * Validates geographic coordinates and date ranges, automatically determines timezone
 * based on location, and transforms string dates into timezone-aware Moment objects.
 *
 * **Validation rules:**
 * 1. Latitude must be between -90 and 90
 * 2. Longitude must be between -180 and 180
 * 3. Start date must be \>= {@link minimumDate}
 * 4. Start date must be \<= {@link maximumDate}
 * 5. End date must be \>= {@link minimumDate}
 * 6. End date must be \<= {@link maximumDate}
 * 7. End date must be strictly after start date.
 *
 * **Default values:**
 * - Location: Philadelphia, PA (39.949309°N, 75.17169°W)
 * - Date range: Previous month to next month (2-month window centered on today).
 *
 * @see {@link https://github.com/photostructure/tz-lookup} for timezone lookup algorithm
 * @see {@link https://zod.dev} for Zod schema documentation
 */
export const inputSchema = z
  .object({
    endDate: z
      .string()
      .optional()
      .default(moment().add(1, "month").format("YYYY-MM-DD")),
    latitude: z.coerce.number().min(-90).max(90).optional().default(39.949_309),
    longitude: z.coerce
      .number()
      .min(-180)
      .max(180)
      .optional()
      .default(-75.171_69),
    startDate: z
      .string()
      .optional()
      .default(moment().subtract(1, "month").format("YYYY-MM-DD")),
  })
  .transform((data) => {
    const timezone = tzLookup(data.latitude, data.longitude);

    return {
      end: moment.tz(data.endDate, timezone),
      latitude: data.latitude,
      longitude: data.longitude,
      start: moment.tz(data.startDate, timezone),
      timezone,
    };
  })
  .refine((data) => data.start.format("YYYY-MM-DD") >= minimumDate, {
    message: `Start date must be on or after ${minimumDate}`,
  })
  .refine((data) => data.start.format("YYYY-MM-DD") <= maximumDate, {
    message: `Start date must be on or before ${maximumDate}`,
  })
  .refine((data) => data.end.format("YYYY-MM-DD") >= minimumDate, {
    message: `End date must be on or after ${minimumDate}`,
  })
  .refine((data) => data.end.format("YYYY-MM-DD") <= maximumDate, {
    message: `End date must be on or before ${maximumDate}`,
  })
  .refine((data) => data.end.isAfter(data.start), {
    message: "End date must be after start date",
  });
