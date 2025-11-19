'use server';

import { flow } from '@genkit-ai/core';
import { z } from 'zod';
import { v2 as cloudinary } from 'cloudinary';
import { automaticSubtitleGeneration } from './automatic-subtitle-generation';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const ProcessVideoInputSchema = z.object({
  cloudinaryPublicId: z.string().describe('The public ID of the video on Cloudinary.'),
  languageCode: z.string().optional().describe('The language of the video.'),
});

export const ProcessVideoOutputSchema = z.object({
  videoUrl: z.string().describe('The public URL of the processed video.'),
  publicId: z.string().describe('The public ID of the video on Cloudinary.'),
  subtitles: z.string().describe('The generated subtitles in SRT format.'),
});

export const processVideo = flow(
  {
    name: 'processVideo',
    inputSchema: ProcessVideoInputSchema,
    outputSchema: ProcessVideoOutputSchema,
  },
  async (input) => {
    // 1. Get video URL from Cloudinary
    const videoUrl = cloudinary.url(input.cloudinaryPublicId, {
      resource_type: 'video',
      // An eager transformation to create a downloadable mp3 can speed up AssemblyAI
      // but for simplicity we will use the direct video url.
    });

    if (!videoUrl) {
      throw new Error(`Could not get video URL for publicId: ${input.cloudinaryPublicId}`);
    }

    // 2. Generate subtitles using AssemblyAI
    const subtitlesSrt = await automaticSubtitleGeneration({
      videoUrl: videoUrl,
      languageCode: input.languageCode,
    });

    // 3. Return all necessary data
    return {
      videoUrl: videoUrl,
      publicId: input.cloudinaryPublicId,
      subtitles: subtitlesSrt,
    };
  }
);
