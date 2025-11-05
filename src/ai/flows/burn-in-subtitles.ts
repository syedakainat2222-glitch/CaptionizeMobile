'use server';

/**
 * @fileOverview A helper for burning subtitles into a video file using Cloudinary.
 */

import { v2 as cloudinary } from 'cloudinary';
import { z } from 'zod';

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
  videoWithSubtitlesUrl: z.string().describe('The public URL of the new video file with subtitles burned in.'),
});

export type BurnInSubtitlesOutput = z.infer<typeof BurnInSubtitlesOutputSchema>;

// Helper to convert SRT time to seconds.
const srtTimeToSeconds = (time: string): number => {
    const parts = time.split(':');
    const secondsAndMs = parts[2].split(',');
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parseInt(secondsAndMs[0], 10);
    const milliseconds = parseInt(secondsAndMs[1], 10);
    return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
};


// Main function to burn subtitles
async function burnInSubtitlesFlow({
  videoPublicId,
  subtitles,
}: BurnInSubtitlesInput): Promise<BurnInSubtitlesOutput> {

  // Create an array of transformation objects for each subtitle
  const subtitleOverlays = subtitles.map(subtitle => {
    const startOffset = srtTimeToSeconds(subtitle.startTime).toFixed(2);
    const endOffset = srtTimeToSeconds(subtitle.endTime).toFixed(2);

    // Sanitize text for Cloudinary overlay.
    // See: https://support.cloudinary.com/hc/en-us/articles/202521512-How-to-add-a-text-overlay-on-an-image
    const sanitizedText = subtitle.text
      .replace(/,/g, '%2C')  // Escape commas
      .replace(/\//g, '%2F') // Escape slashes
      .replace(/\?/g, '%3F') // Escape question marks
      .replace(/&/g, '%26')  // Escape ampersands
      .replace(/#/g, '%23')  // Escape hashes
      .replace(/\\/g, '%5C') // Escape backslashes
      .replace(/%/g, '%25')  // Escape percent signs
      .replace(/'/g, '%27')  // Escape single quotes
      .replace(/"/g, '%22'); // Escape double quotes
      

    return {
      overlay: {
        font_family: 'Arial',
        font_size: 48,
        text: encodeURIComponent(sanitizedText),
      },
      color: 'white',
      background: 'rgba:0,0,0,0.5',
      gravity: 'south',
      y: 50,
      start_offset: startOffset,
      end_offset: endOffset,
    };
  });

  // Generate the URL with the transformation layers
  const transformedVideoUrl = cloudinary.url(videoPublicId, {
    resource_type: 'video',
    transformation: subtitleOverlays,
    format: 'mp4',
    secure: true, // Force HTTPS URL
  });

  console.log('Generated Cloudinary URL:', transformedVideoUrl);

  if (!transformedVideoUrl) {
    throw new Error('Failed to generate transformed video URL from Cloudinary.');
  }

  return { videoWithSubtitlesUrl: transformedVideoUrl };
}

// Exported wrapper for Next.js server route
export async function burnInSubtitles(
  input: BurnInSubtitlesInput
): Promise<BurnInSubtitlesOutput> {
  return burnInSubtitlesFlow(input);
}
