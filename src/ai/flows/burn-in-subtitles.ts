'use server';

/**
 * @fileOverview A Genkit flow for burning subtitles into a video file using Cloudinary.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { v2 as cloudinary } from 'cloudinary';
import { PassThrough } from 'stream';

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Define a Zod schema for a single subtitle object
const SubtitleSchema = z.object({
  id: z.number(),
  startTime: z.string(),
  endTime: z.string(),
  text: z.string(),
});

export type Subtitle = z.infer<typeof SubtitleSchema>;

const BurnInSubtitlesInputSchema = z.object({
  videoPublicId: z.string().describe('The public ID of the video in Cloudinary.'),
  subtitles: z.array(SubtitleSchema).describe('An array of subtitle objects to burn into the video.'),
});

export type BurnInSubtitlesInput = z.infer<typeof BurnInSubtitlesInputSchema>;

const BurnInSubtitlesOutputSchema = z.object({
  videoWithSubtitlesUrl: z.string().describe('The data URI of the new video file with subtitles burned in.'),
});

export type BurnInSubtitlesOutput = z.infer<typeof BurnInSubtitlesOutputSchema>;

export async function burnInSubtitles(input: BurnInSubtitlesInput): Promise<BurnInSubtitlesOutput> {
  return burnInSubtitlesFlow(input);
}

// Helper to convert SRT time to seconds
const srtTimeToSeconds = (time: string): number => {
  const parts = time.split(':');
  const secondsParts = parts[2].split(',');
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const seconds = parseInt(secondsParts[0], 10);
  const milliseconds = parseInt(secondsParts[1], 10);
  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
};

// Helper function to stream download a file and return it as a Base64 encoded string
async function downloadAndEncode(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download video from Cloudinary: ${response.statusText}`);
  }

  // @ts-ignore
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    chunks.push(value);
  }

  const buffer = Buffer.concat(chunks);
  return buffer.toString('base64');
}

const burnInSubtitlesFlow = ai.defineFlow(
  {
    name: 'burnInSubtitlesFlow',
    inputSchema: BurnInSubtitlesInputSchema,
    outputSchema: BurnInSubtitlesOutputSchema,
  },
  async ({ videoPublicId, subtitles }) => {
    // Generate Cloudinary overlay transformations for each subtitle
    const subtitleOverlays = subtitles.map(subtitle => {
      const startOffset = srtTimeToSeconds(subtitle.startTime);
      const endOffset = srtTimeToSeconds(subtitle.endTime);

      return {
        overlay: {
          font_family: "Arial",
          font_size: 48,
          text: encodeURIComponent(subtitle.text), // ✅ safely encode subtitle text
        },
        color: "white",
        background: "rgba:0,0,0,0.5",
        gravity: "south",
        y: 20,
        start_offset: startOffset.toFixed(2),
        end_offset: endOffset.toFixed(2),
      };
    });

    // Generate the final video URL with all subtitle overlays
    const transformedVideoUrl = cloudinary.url(videoPublicId, {
      resource_type: 'video',
      transformation: subtitleOverlays,
      format: 'mp4',
    });

    console.log("Generated Cloudinary URL:", transformedVideoUrl);

    if (!transformedVideoUrl) {
      throw new Error('Failed to generate transformed video URL from Cloudinary.');
    }

    // Download the video from the generated URL and encode it to Base64
    const videoBase64 = await downloadAndEncode(transformedVideoUrl);

    // Return as a data URI
    return {
      videoWithSubtitlesUrl: `data:video/mp4;base64,${videoBase64}`,
    };
  }
);
