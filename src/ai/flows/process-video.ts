'use server';

import { z } from 'zod';
import { automaticSubtitleGeneration } from './automatic-subtitle-generation';
import { detectLanguage } from './detect-language';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function processVideo(input: { cloudinaryPublicId: string; languageCode?: string, videoId: string }) {
    // Validate input
    const ProcessVideoInputSchema = z.object({
        cloudinaryPublicId: z.string().min(1, "Cloudinary public ID is required"),
        languageCode: z.string().optional(),
        videoId: z.string(),
    });

    const validatedInput = ProcessVideoInputSchema.parse(input);
    
    const videoUrl = cloudinary.url(validatedInput.cloudinaryPublicId, {
        resource_type: 'video',
        secure: true,
    });

    if (!videoUrl) {
        throw new Error('Failed to generate video URL from Cloudinary.');
    }

    let languageCode = validatedInput.languageCode;
    if (!languageCode || languageCode === 'auto') {
        languageCode = await detectLanguage({ videoUrl });
    }

    // Construct the webhook URL. This is where AssemblyAI will send the result.
    const host = process.env.VERCEL_URL || 'http://localhost:3000';
    const webhookUrl = `${host}/api/webhook?video_id=${validatedInput.videoId}`;

    // Start the transcription job. This now returns immediately.
    const transcript = await automaticSubtitleGeneration({
        videoUrl,
        languageCode,
        webhookUrl,
    });

    // Return the ID of the job, not the subtitles themselves.
    return {
        transcriptId: transcript.id,
        videoUrl,
    };
}
