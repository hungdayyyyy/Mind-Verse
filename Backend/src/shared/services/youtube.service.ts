import { google } from 'googleapis';
import axios from 'axios';
import { env } from '@config/index';
import { logger } from '@config/logger';
import { NotFoundError, ValidationError } from '@shared/errors';

const youtube = google.youtube({ version: 'v3', auth: env.YOUTUBE_API_KEY });

export interface YoutubeMetadata {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  duration: number; // seconds
  description: string;
}

/** Parses ISO 8601 duration (e.g., "PT1H2M3S") into total seconds. */
function parseIso8601Duration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const [, h, m, s] = match;
  return (Number(h ?? 0) * 3600) + (Number(m ?? 0) * 60) + Number(s ?? 0);
}

/** Extracts the 11-character YouTube video ID from any standard URL format. */
export function extractYoutubeVideoId(url: string): string {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  throw new ValidationError({ formErrors: ['Invalid YouTube URL — could not extract video ID.'], fieldErrors: {} });
}

export const youtubeService = {
  /**
   * Fetches video metadata (title, thumbnail, duration, description) via the
   * YouTube Data API v3.
   * @throws NotFoundError if the video doesn't exist or is private.
   */
  async getMetadata(videoId: string): Promise<YoutubeMetadata> {
    const response = await youtube.videos.list({
      id: [videoId],
      part: ['snippet', 'contentDetails'],
    });

    const video = response.data.items?.[0];
    if (!video || !video.snippet || !video.contentDetails) {
      throw new NotFoundError('YouTube video', { videoId });
    }

    return {
      videoId,
      title: video.snippet.title ?? 'Untitled',
      thumbnailUrl:
        video.snippet.thumbnails?.high?.url ?? video.snippet.thumbnails?.default?.url ?? '',
      duration: parseIso8601Duration(video.contentDetails.duration ?? 'PT0S'),
      description: video.snippet.description ?? '',
    };
  },

  /**
   * Attempts to fetch existing closed captions for a video. Returns null if
   * no captions are available, signaling the caller to fall back to
   * downloading the audio and transcribing it via Whisper.
   *
   * Note: The official YouTube Data API `captions.download` endpoint requires
   * OAuth with video-owner permission for most videos, so in practice caption
   * retrieval for arbitrary public videos goes through a timedtext scrape or
   * a library such as `youtube-transcript`. This implementation calls out to
   * that approach; swap in your provider of choice.
   */
  async getCaptions(videoId: string): Promise<string | null> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { YoutubeTranscript } = require('youtube-transcript');
      const segments: Array<{ text: string; offset: number; duration: number }> =
        await YoutubeTranscript.fetchTranscript(videoId);
      if (!segments?.length) return null;
      return segments.map((s) => s.text).join(' ');
    } catch (err) {
      logger.info('No captions available for YouTube video, will fall back to Whisper', {
        videoId,
        error: (err as Error).message,
      });
      return null;
    }
  },

  /**
   * Downloads the audio track of a YouTube video for Whisper transcription
   * when captions are unavailable. Delegates to yt-dlp (configured via
   * YT_DLP_BINARY_PATH in the worker environment) since YouTube does not
   * provide direct audio download via its public API.
   */
  async downloadAudioBuffer(videoId: string): Promise<Buffer> {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { execFile } = require('child_process');
    const { promisify } = require('util');
    const execFileAsync = promisify(execFile);

    const tmpPath = `/tmp/yt-${videoId}-${Date.now()}.mp3`;
    await execFileAsync(process.env.YT_DLP_BINARY_PATH ?? 'yt-dlp', [
      '-x',
      '--audio-format',
      'mp3',
      '-o',
      tmpPath,
      url,
    ]);

    const fs = await import('fs/promises');
    const buffer = await fs.readFile(tmpPath);
    await fs.unlink(tmpPath).catch(() => undefined);
    return buffer;
  },
};

// Re-export axios in case downstream callers need the raw thumbnail bytes (unused here, kept for completeness).
export { axios as _axios };
