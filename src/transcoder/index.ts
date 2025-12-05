import express from "express";
import { Storage } from "@google-cloud/storage";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const app = express();
app.use(express.json());

const storage = new Storage();
const RAW_BUCKET = process.env.GCS_RAW_BUCKET || "linuty-raw-uploads";
const HLS_BUCKET = process.env.GCS_HLS_BUCKET || "linuty-hls-stream";
const API_CALLBACK_URL = process.env.API_CALLBACK_URL; // your main API for updating MediaFile
const API_CALLBACK_SECRET = process.env.API_CALLBACK_SECRET;

const tmpDir = "/tmp"; // Cloud Run writable dir

function runFfmpeg(inputPath: string, outDir: string) {
  return new Promise<void>((resolve, reject) => {
    // Example: 3 renditions (240p, 480p, 720p) + master playlist
    const args = [
      "-i", inputPath,
      // 240p
      "-filter:v:0", "scale=w=426:h=240",
      "-c:a:0", "aac", "-ar:0", "48000", "-c:v:0", "h264", "-profile:v:0", "baseline",
      "-crf:0", "23", "-maxrate:0", "400k", "-bufsize:0", "800k",
      "-map", "0:v:0", "-map", "0:a:0",
      "-f", "hls",
      "-hls_time", "4", "-hls_playlist_type", "vod",
      "-hls_segment_filename", path.join(outDir, "240p_%03d.ts"),
      path.join(outDir, "240p.m3u8"),

      // 480p
      "-filter:v:1", "scale=w=854:h=480",
      "-c:a:1", "aac", "-ar:1", "48000", "-c:v:1", "h264", "-profile:v:1", "main",
      "-crf:1", "23", "-maxrate:1", "800k", "-bufsize:1", "1600k",
      "-map", "0:v:0", "-map", "0:a:0",
      "-f", "hls",
      "-hls_time", "4", "-hls_playlist_type", "vod",
      "-hls_segment_filename", path.join(outDir, "480p_%03d.ts"),
      path.join(outDir, "480p.m3u8"),

      // 720p
      "-filter:v:2", "scale=w=1280:h=720",
      "-c:a:2", "aac", "-ar:2", "48000", "-c:v:2", "h264", "-profile:v:2", "high",
      "-crf:2", "23", "-maxrate:2", "2000k", "-bufsize:2", "4000k",
      "-map", "0:v:0", "-map", "0:a:0",
      "-f", "hls",
      "-hls_time", "4", "-hls_playlist_type", "vod",
      "-hls_segment_filename", path.join(outDir, "720p_%03d.ts"),
      path.join(outDir, "720p.m3u8")
    ];

    const ff = spawn("ffmpeg", args);

    ff.stdout.on("data", data => console.log(data.toString()));
    ff.stderr.on("data", data => console.error(data.toString()));

    ff.on("close", code => {
      if (code === 0) resolve();
      else reject(new Error("ffmpeg exited with code " + code));
    });
  });
}

// Simple helper to upload all files in a directory to HLS bucket
async function uploadDirToBucket(localDir: string, bucketPathPrefix: string) {
  const bucket = storage.bucket(HLS_BUCKET);
  const files = fs.readdirSync(localDir);
  await Promise.all(
    files.map(async (fileName) => {
      const localPath = path.join(localDir, fileName);
      const remotePath = `${bucketPathPrefix}/${fileName}`;
      await bucket.upload(localPath, {
        destination: remotePath,
        resumable: false,
        contentType: fileName.endsWith(".m3u8")
          ? "application/vnd.apple.mpegurl"
          : undefined
      });
    })
  );
}

app.post("/transcode", async (req, res) => {
  try {
    const { rawObjectName, postId } = req.body;

    if (!rawObjectName || !postId) {
      return res.status(400).json({ message: "rawObjectName and postId are required" });
    }

    // Optional: basic auth via shared secret
    if (API_CALLBACK_SECRET && req.headers["x-linutyauth"] !== API_CALLBACK_SECRET) {
      return res.status(401).json({ message: "Invalid auth" });
    }

    const rawBucket = storage.bucket(RAW_BUCKET);
    const rawFile = rawBucket.file(rawObjectName);

    // Download to /tmp
    const localInputPath = path.join(tmpDir, `input-${Date.now()}.mp4`);
    await rawFile.download({ destination: localInputPath });

    const hlsOutDir = path.join(tmpDir, `hls-${Date.now()}`);
    fs.mkdirSync(hlsOutDir);

    // Run ffmpeg to generate HLS variants
    await runFfmpeg(localInputPath, hlsOutDir);

    // Create master playlist
    const masterPath = path.join(hlsOutDir, "master.m3u8");
    const masterContent = [
      "#EXTM3U",
      "#EXT-X-VERSION:3",
      "#EXT-X-STREAM-INF:BANDWIDTH=400000,RESOLUTION=426x240",
      "240p.m3u8",
      "#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=854x480",
      "480p.m3u8",
      "#EXT-X-STREAM-INF:BANDWIDTH=2000000,RESOLUTION=1280x720",
      "720p.m3u8"
    ].join("\n");
    fs.writeFileSync(masterPath, masterContent, "utf8");

    // Upload all to HLS bucket
    const bucketPrefix = `videos/${postId}`;
    await uploadDirToBucket(hlsOutDir, bucketPrefix);

    // Construct final public / CDN URL to master
    const hlsUrl = `${process.env.HLS_BASE_URL || `https://storage.googleapis.com/${HLS_BUCKET}`}/${bucketPrefix}/master.m3u8`;

    // Call back your main API to update MediaFile
    if (API_CALLBACK_URL) {
      await fetch(API_CALLBACK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-linutyauth": API_CALLBACK_SECRET || ""
        },
        body: JSON.stringify({
          postId,
          hlsUrl
        })
      });
    }

    return res.json({ ok: true, hlsUrl });
  } catch (err) {
    console.error("transcode error:", err);
    return res.status(500).json({ message: "Transcoding failed" });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log("Transcoder listening on port", port);
});
