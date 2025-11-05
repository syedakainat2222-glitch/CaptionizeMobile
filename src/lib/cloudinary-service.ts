// src/lib/cloudinary-service.ts
import { v2 as cloudinary } from 'cloudinary';
import type { Subtitle } from '@/lib/srt';
import { formatVtt } from '@/lib/srt';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Maps the font-family from the UI to the font name Cloudinary expects.
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

/**
 * Uploads an array of subtitles as a single VTT file to Cloudinary.
 * @param subtitles The array of subtitle objects.
 * @returns The public_id of the uploaded VTT file.
 */
async function uploadVttSubtitles(subtitles: Subtitle[]): Promise<string> {
  const vttContent = formatVtt(subtitles);
  const vttBuffer = Buffer.from(vttContent, 'utf-8');
  
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'raw', // Subtitle files are treated as 'raw' files
        format: 'vtt',
        // Store subtitles in a dedicated folder for organization
        public_id: `subtitles/captionize-${Date.now()}` 
      },
      (error, result) => {
        if (error) {
          return reject(new Error(`Cloudinary VTT upload failed: ${error.message}`));
        }
        if (!result || !result.public_id) {
            return reject(new Error('Cloudinary VTT upload failed: No result or public_id returned.'));
        }
        resolve(result.public_id);
      }
    );
    uploadStream.end(vttBuffer);
  });
}

/**
 * Generates a Cloudinary URL for a video with burned-in subtitles.
 * This function uses the robust VTT file overlay method to avoid long URLs.
 *
 * @param videoPublicId The public ID of the video in Cloudinary.
 * @param subtitles An array of all subtitles to burn into the video.
 * @param subtitleFont The font family string selected in the UI.
 * @returns A URL to the transformed video.
 */
export async function generateSubtitledVideoUrl(
  videoPublicId: string,
  subtitles: Subtitle[],
  subtitleFont: string = 'Inter, sans-serif'
): Promise<string> {
  try {
    // 1. Upload all subtitles as a single VTT file.
    const subtitlePublicId = await uploadVttSubtitles(subtitles);

    // 2. Map the UI font to a Cloudinary-compatible font name. Default to Arial.
    const cloudinaryFont = fontMap[subtitleFont] || 'Arial';

    // 3. Build the transformation using the `l_subtitles` overlay method.
    // This creates a short, stable URL.
    const transformation = [
        {
            // Apply the uploaded subtitle file using its public_id.
            // This is the core of the fix.
            overlay: `subtitles:${subtitlePublicId}`,
            // Style the subtitles.
            gravity: "south",
            y: 50,
            font_family: cloudinaryFont,
            font_size: 48,
            color: "white",
            background: "rgba:00000080", // Semi-transparent black background
        }
    ];

    // 4. Generate the final, short video URL.
    const finalVideoUrl = cloudinary.url(videoPublicId, {
      resource_type: 'video',
      transformation: transformation,
      format: 'mp4',
    });

    return finalVideoUrl;
  } catch (error) {
    console.error("Error in generateSubtitledVideoUrl:", error);
    // Re-throw the error to be caught by the API route.
    throw new Error("Failed to generate subtitled video.");
  }
}
