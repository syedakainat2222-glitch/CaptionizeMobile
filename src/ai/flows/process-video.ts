'use server';

import { flow } from '@genkit-ai/core';
import { z } from 'zod';
import { automaticSubtitleGeneration } from './automatic-subtitle-generation';
import { uploadToCloudinary } from '@/lib/cloudinary';

export const processVideo = flow({
  name: 'processVideo',
  inputSchema: z.object({
    videoDataUri: z.string(),
    languageCode: z.string().optional(),
  }),
  outputSchema: z.object({
    videoUrl: z.string(),
    publicId: z.string(),
    subtitles: z.string(),
  }),
}, async (input) => {
  const { videoDataUri, languageCode } = input;

  // 1. Upload the video to Cloudinary
  const cloudinaryResult = await uploadToCloudinary(videoDataUri, 'video');

  if (!cloudinaryResult) {
    throw new Error('Failed to upload video to Cloudinary');
  }

  // 2. Generate subtitles from the video URL
  const subtitles = await automaticSubtitleGeneration({
    videoUrl: cloudinaryResult.secure_url,
    languageCode,
  });

  return {
    videoUrl: cloudinaryResult.secure_url,
    publicId: cloudinaryResult.public_id,
    subtitles,
  };
});
