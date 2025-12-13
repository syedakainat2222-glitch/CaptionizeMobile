'use server';

import { z } from 'zod';
import { automaticSubtitleGeneration } from './automatic-subtitle-generation';
import { detectLanguage } from './detect-language';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function processVideo(input: { cloudinaryPublicId: string; languageCode?: string }) {
    // Validate input
    const ProcessVideoInputSchema = z.object({
        cloudinaryPublicId: z.string().min(1, "Cloudinary public ID is required"),
        languageCode: z.string().optional(),
    });

    const validatedInput = ProcessVideoInputSchema.parse(input);
    
    // Debug log to check the public ID
    console.log('Cloudinary Public ID:', validatedInput.cloudinaryPublicId);
    
    const videoUrl = cloudinary.url(validatedInput.cloudinaryPublicId, {
        resource_type: 'video',
        secure: true, // Always use secure URLs
    });

    console.log('Generated Cloudinary URL:', videoUrl);

    if (!videoUrl) {
        throw new Error('Failed to generate video URL from Cloudinary.');
    }

    let languageCode = validatedInput.languageCode;
    if (!languageCode || languageCode === 'auto') {
        languageCode = await detectLanguage({ videoUrl });
    }

    const subtitles = await automaticSubtitleGeneration({
        videoUrl,
        languageCode,
    });

    return {
        subtitles,
        videoUrl, // Return the videoUrl so you can save it to Firestore
    };
}