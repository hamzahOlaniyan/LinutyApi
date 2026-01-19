"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hlsBucket = exports.rawVideoBucket = exports.HLS_BUCKET = exports.RAW_VIDEO_BUCKET = void 0;
// src/lib/gcs.ts
const storage_1 = require("@google-cloud/storage");
const storage = new storage_1.Storage({
    // If running outside GCP, this env should point to your JSON key file.
    // GOOGLE_APPLICATION_CREDENTIALS can also be set at process level.
    projectId: process.env.GCP_PROJECT_ID
    // keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS, // optional if using that
});
exports.RAW_VIDEO_BUCKET = process.env.GCS_RAW_BUCKET || "linuty-raw-uploads";
exports.HLS_BUCKET = process.env.GCS_HLS_BUCKET || "linuty-hls-stream";
exports.rawVideoBucket = storage.bucket(exports.RAW_VIDEO_BUCKET);
exports.hlsBucket = storage.bucket(exports.HLS_BUCKET);
