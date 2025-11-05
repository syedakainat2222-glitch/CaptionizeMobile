// src/lib/cloudinary-service.ts
import { v2 as cloudinary } from 'cloudinary';
import type { Subtitle } from '@/lib/srt';
import { formatVtt } from '@/lib/srt';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const fontMap: { [key: string]: string } = {
    'Inter, sans-serif': 'Inter',
    'Roboto, sans-serif': 'Roboto',
    'Arial, sans-serif': 'Arial',
    'Helvetica, sans-serif': 'Helvetica',
    'Georgia, serif': 'Georgia',
    'Times New Roman, serif': 'Times_New_Roman',
    'Verdana, sans-serif': 'Verdana',
    'Courier New, monospace': 'Courier_New',
    'Lucida Console, monospace': 'Lucida_Console',
    'Comic Sans MS, cursive': 'Comic_Sans_MS',
};

async function uploadVttSubtitles(subtitles: Subtitle[]): Promise<string> {
  const vttContent = formatVtt(subtitles);
  const vttBuffer = Buffer.from(vttContent, 'utf-8');
  
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'raw',
        format: 'vtt',
        public_id: `subtitles/captionize-${Date.now()}`
      },
      (error, result) => {
        if (error) {
          return reject(new Error(`Cloudinary VTT upload failed: ${error.message}`));
        }
        if (!result) {
            return reject(new Error('Cloudinary VTT upload failed: No result returned.'));
        }
        resolve(result.public_id);
      }
    );
    uploadStream.end(vttBuffer);
  });
}

export async function generateSubtitledVideoUrl(
  videoPublicId: string,
  subtitles: Subtitle[],
  subtitleFont: string = 'Inter, sans-serif'
): Promise<string> {
  try {
    const subtitlePublicId = await uploadVttSubtitles(subtitles);

    const cloudinaryFont = fontMap[subtitleFont] || 'Arial';

    const transformation = [
        {
            // Position subtitles at the bottom
            gravity: "south",
            y: 50
        },
        {
            // Apply the uploaded subtitle file
            overlay: {
                resource_type: 'subtitles',
                public_id: subtitlePublicId,
                font_family: cloudinaryFont,
                font_size: 48,
            },
            // Use a semi-transparent background for readability
            background: "rgba:0,0,0,0.5",
            color: "white"
        }
    ];

    const finalVideoUrl = cloudinary.url(videoPublicId, {
      resource_type: 'video',
      transformation: transformation,
      format: 'mp4',
    });

    return finalVideoUrl;
  } catch (error) {
    console.error("Error in generateSubtitledVideoUrl:", error);
    throw new Error("Failed to generate subtitled video.");
  }
}
