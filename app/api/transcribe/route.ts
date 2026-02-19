import { NextResponse } from "next/server";
import { exec } from "child_process";
import { readFileSync, unlinkSync, existsSync, readdirSync } from "fs";
import crypto from "crypto";
import { promisify } from "util";

const execAsync = promisify(exec);

export const maxDuration = 300;

interface WhisperSegment {
  text: string;
  start: number;
  end: number;
}

interface WhisperOutput {
  text: string;
  segments: { text: string; start: number; end: number }[];
}

function isTwitterUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace("www.", "");
    return host === "twitter.com" || host === "x.com";
  } catch {
    return false;
  }
}

function cleanupFiles(...paths: string[]) {
  for (const p of paths) {
    try {
      if (existsSync(p)) unlinkSync(p);
    } catch {
      // best-effort cleanup
    }
  }
}

export async function POST(request: Request) {
  const id = crypto.randomUUID();
  const basePath = `/tmp/transcriber_${id}`;
  const wavPath = `${basePath}.wav`;
  const jsonPath = `${basePath}.json`;

  // Also track any intermediate files yt-dlp might create
  const filesToClean: string[] = [wavPath, jsonPath];

  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'url' field" },
        { status: 400 }
      );
    }

    if (!isTwitterUrl(url)) {
      return NextResponse.json(
        { error: "URL must be a Twitter/X URL (twitter.com or x.com)" },
        { status: 400 }
      );
    }

    // Download audio using yt-dlp (async, 5 min timeout)
    // Download audio as m4a first (much smaller than wav)
    const rawPath = `${basePath}.m4a`;
    filesToClean.push(rawPath);
    const ytdlpCmd = `/opt/homebrew/bin/yt-dlp --cookies-from-browser chrome -f "bestaudio[ext=m4a]/bestaudio/best" -o "${rawPath}" "${url}"`;
    console.log("[transcribe] Downloading audio...");
    try {
      await execAsync(ytdlpCmd, { timeout: 300_000, maxBuffer: 50 * 1024 * 1024 });
    } catch (dlErr: unknown) {
      const msg = dlErr instanceof Error ? dlErr.message : String(dlErr);
      console.error("[transcribe] yt-dlp error:", msg);
      return NextResponse.json(
        { error: "Failed to download video audio. Make sure the URL is a valid public X/Twitter video.", details: msg },
        { status: 500 }
      );
    }

    // Find the downloaded file (yt-dlp may name it differently)
    let downloadedFile = rawPath;
    if (!existsSync(rawPath)) {
      const tmpFiles = readdirSync("/tmp").filter(f => f.startsWith(`transcriber_${id}`));
      console.log("[transcribe] Files found:", tmpFiles);
      const audioFile = tmpFiles.find(f => /\.(m4a|mp3|webm|opus|wav|mp4|ogg)$/.test(f));
      if (audioFile) {
        downloadedFile = `/tmp/${audioFile}`;
        filesToClean.push(downloadedFile);
      } else {
        return NextResponse.json(
          { error: "Failed to download audio — no audio file found after download" },
          { status: 500 }
        );
      }
    }

    // Convert to 16kHz mono WAV (what Whisper expects, much smaller file)
    console.log("[transcribe] Converting to 16kHz mono WAV...");
    try {
      await execAsync(`/opt/homebrew/bin/ffmpeg -i "${downloadedFile}" -ar 16000 -ac 1 -c:a pcm_s16le "${wavPath}" -y`, { timeout: 120_000 });
    } catch (convErr: unknown) {
      const msg = convErr instanceof Error ? convErr.message : String(convErr);
      console.error("[transcribe] ffmpeg convert error:", msg);
      return NextResponse.json(
        { error: "Failed to convert audio format", details: msg },
        { status: 500 }
      );
    }

    if (!existsSync(wavPath)) {
      return NextResponse.json(
        { error: "Failed to download audio — WAV file not found" },
        { status: 500 }
      );
    }

    // Transcribe with Whisper (async, 10 min timeout, tiny model for speed on CPU)
    const whisperCmd = `source /tmp/whisper_env/bin/activate && whisper "${wavPath}" --model tiny --language en --output_dir /tmp --output_format json`;
    console.log("[transcribe] Running Whisper (tiny model)...");
    try {
      await execAsync(whisperCmd, {
        timeout: 900_000,
        shell: "/bin/bash",
        maxBuffer: 50 * 1024 * 1024,
      });
    } catch (whisperErr: unknown) {
      const msg = whisperErr instanceof Error ? whisperErr.message : String(whisperErr);
      console.error("[transcribe] Whisper error:", msg);
      return NextResponse.json(
        { error: "Transcription failed during processing", details: msg },
        { status: 500 }
      );
    }

    if (!existsSync(jsonPath)) {
      // Whisper names output after the input filename
      const tmpFiles = readdirSync("/tmp").filter(f => f.startsWith(`transcriber_${id}`) && f.endsWith(".json"));
      console.log("[transcribe] JSON files found:", tmpFiles);
      if (tmpFiles.length === 0) {
        return NextResponse.json(
          { error: "Transcription failed — output JSON not found" },
          { status: 500 }
        );
      }
    }

    const raw = readFileSync(jsonPath, "utf-8");
    const whisperResult: WhisperOutput = JSON.parse(raw);

    const transcript = whisperResult.text.trim();
    const segments: WhisperSegment[] = whisperResult.segments.map((seg) => ({
      text: seg.text.trim(),
      start: seg.start,
      end: seg.end,
    }));

    // Cleanup temp files
    cleanupFiles(...filesToClean);

    console.log("[transcribe] Success! Segments:", segments.length);
    return NextResponse.json({ transcript, segments });
  } catch (err: unknown) {
    cleanupFiles(...filesToClean);

    const message =
      err instanceof Error ? err.message : "An unknown error occurred";
    console.error("[transcribe] Unexpected error:", message);

    return NextResponse.json(
      { error: "Transcription failed", details: message },
      { status: 500 }
    );
  }
}
