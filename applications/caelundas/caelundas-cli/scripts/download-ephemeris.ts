import { createWriteStream, existsSync, statSync, unlinkSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EPHEMERIS_DIRECTORY = path.resolve(__dirname, "../data/ephemeris");
const BASE_URL =
  "https://raw.githubusercontent.com/aloistr/swisseph/master/ephe";
const ephemerisFilenames = [
  "seas_18.se1",
  "sepl_18.se1",
  "semo_18.se1",
] as const;

/**
 * Supported Swiss Ephemeris archive filenames downloaded for local calculations.
 */
type EphemerisFilename = (typeof ephemerisFilenames)[number];

/**
 * Downloads required ephemeris data files into the local data directory.
 */
async function downloadEphemerisFiles(): Promise<void> {
  await mkdir(EPHEMERIS_DIRECTORY, { recursive: true });

  for (const filename of ephemerisFilenames as readonly EphemerisFilename[]) {
    const destination = path.join(EPHEMERIS_DIRECTORY, filename);

    if (existsSync(destination) && statSync(destination).size > 0) {
      console.log(`⏭️ Skipping ${filename} (already exists)`);
      continue;
    }

    const url = `${BASE_URL}/${filename}`;
    console.log(`💾 Downloading ${filename}...`);
    await downloadFile(url, destination);
    console.log(`💾 Downloaded ${filename}`);
  }

  console.log("🧮 All ephemeris files ready.");
}

/**
 * Streams a remote ephemeris file to disk and removes partial files on failure.
 */
async function downloadFile(url: string, destination: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const file = createWriteStream(destination);
    https
      .get(url, (response) => {
        if (response.statusCode !== 200) {
          file.close();
          if (existsSync(destination)) unlinkSync(destination);
          reject(
            new Error(
              `❌ Failed to download ${url}: HTTP ${response.statusCode?.toString()}`,
            ),
          );
          return;
        }
        response.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve();
        });
        file.on("error", (error) => {
          file.close();
          reject(error);
        });
      })
      .on("error", (error) => {
        file.close();
        if (existsSync(destination)) unlinkSync(destination);
        reject(error);
      });
  });
}

await downloadEphemerisFiles();
