// src/lib/gcs.ts
import { Storage } from "@google-cloud/storage";

const storage = new Storage({
  // If running outside GCP, this env should point to your JSON key file.
  // GOOGLE_APPLICATION_CREDENTIALS can also be set at process level.
  projectId: process.env.GCP_PROJECT_ID
  // keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS, // optional if using that
});

export const RAW_VIDEO_BUCKET = process.env.GCS_RAW_BUCKET || "linuty-raw-uploads";
export const HLS_BUCKET = process.env.GCS_HLS_BUCKET || "linuty-hls-stream";

export const rawVideoBucket = storage.bucket(RAW_VIDEO_BUCKET);
export const hlsBucket = storage.bucket(HLS_BUCKET);
