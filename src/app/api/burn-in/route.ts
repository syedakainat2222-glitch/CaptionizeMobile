// src/app/api/burn-in/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { formatSrt, type Subtitle } from '@/lib/srt';
import { Readable } from 'stream';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// A verified mapping of CSS font-family values to the names Cloudinary's
// video transformation engine expects. This is the key to making custom fonts work.
const CLOUDINARY_FONTS: { [key: string]: string } = {
  // Sans-serif
  'Arial, sans-serif': 'Arial',
  'Helvetica, sans-serif': 'Helvetica',
  'Inter, sans-serif': 'Inter',
  'Roboto, sans-serif': 'Roboto',
  'Open Sans, sans-serif': 'Open_Sans',
  'Lato, sans-serif': 'Lato',
  'Montserrat, sans-serif': 'Montserrat',
  'Poppins, sans-serif': 'Poppins',
  'Oswald, sans-serif': 'Oswald',
  'Bebas Neue, sans-serif': 'Bebas_Neue',
  'Anton, sans-serif': 'Anton',
  'Comfortaa, sans-serif': 'Comfortaa',

  // Serif
  'Georgia, serif': 'Georgia',
  'Times New Roman, serif': 'Times_New_Roman',
  'Playfair Display, serif': 'Playfair_Display',
  'Merriweather, serif': 'Merriweather',
  'Lora, serif': 'Lora',
  
  // Monospace
  'Courier New, monospace': 'Courier',
  'Source Code Pro, monospace': 'Source_Code_Pro',

  // Cursive & Decorative
  'Pacifico, cursive': 'Pacifico',
  'Dancing Script, cursive': 'Dancing_Script',
  'Caveat, cursive': 'Caveat',
  'Lobster, cursive': 'Lobster',
  'Righteous, sans-serif': 'Righteous',
};


/**
 * Uploads subtitles as an SRT file to Cloudinary.
 * This is a robust way to handle subtitle data.
 * @param subtitles - The array of subtitle objects.
 * @returns The public_id of the uploaded SRT file.
 */
async function uploadSrtToCloudinary(subtitles: Subtitle[]): Promise<string> {
    const srtContent = formatSrt(subtitles);
    const srtBuffer = Buffer.from(srtContent, 'utf-8');
    const public_id = `subtitles/captionize-${Date.now()}`;

    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                resource_type: 'raw',
                public_id: public_id,
                format: 'srt'
            },
            (error, result) => {
                if (error) {
                    return reject(new Error(`Cloudinary SRT upload failed: ${error.message}`));
                }
                if (!result || !result.public_id) {
                    return reject(new Error('Cloudinary SRT upload failed: No result or public_id returned.'));
                }
                resolve(result.public_id);
            }
        );
        Readable.from(srtBuffer).pipe(uploadStream);
    });
}


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      videoPublicId, 
      subtitles, 
      videoName = 'video',
      subtitleFont = 'Arial, sans-serif',
      subtitleFontSize = 48
    } = body;

    if (!videoPublicId || !subtitles || !Array.isArray(subtitles)) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid parameters' },
        { status: 400 }
      );
    }

    // 1. Upload the subtitles as a single, correctly formatted SRT file.
    const srtPublicId = await uploadSrtToCloudinary(subtitles);

    // 2. Select the correct, Cloudinary-compatible font name from our verified map.
    const cloudinaryFont = CLOUDINARY_FONTS[subtitleFont as keyof typeof CLOUDINARY_FONTS] || 'Arial';

    // This logic handles complex scripts (like Arabic/Urdu). If such characters are detected,
    // we override the font to one that supports them, ensuring they don't appear as broken boxes.
    const hasComplexChars = subtitles.some(s => /[\u0600-\u06FF]/.test(s.text));
    const finalFont = hasComplexChars ? 'noto_naskh_arabic' : cloudinaryFont;
    
    // 3. Generate the video URL using the `l_subtitles` overlay method.
    // This is the most robust way to burn-in subtitles.
    const videoUrl = cloudinary.url(videoPublicId, {
        resource_type: 'video',
        transformation: [
            {
                // Apply the uploaded SRT file as a subtitle layer.
                // The font family and size are specified here directly.
                overlay: {
                    resource_type: 'subtitles',
                    public_id: srtPublicId,
                    font_family: finalFont,
                    font_size: subtitleFontSize,
                },
            },
            // Apply styling to the subtitle layer created above.
            {
              flags: "layer_apply",
              color: 'white',
              background: 'rgb:000000CC', // Semi-transparent black background
              gravity: 'south',
              y: 30, // Adjust vertical position from the bottom
            }
        ],
        format: 'mp4',
        quality: 'auto'
    });

    // 4. Fetch the generated video and stream it back to the client.
    const videoResponse = await fetch(videoUrl);
    
    if (!videoResponse.ok || !videoResponse.body) {
      throw new Error(`Failed to fetch processed video from Cloudinary. Status: ${videoResponse.status}`);
    }

    // Use the original video name to create the new filename
    const baseName = (videoName || 'video').split('.').slice(0, -1).join('.') || 'video';
    const filename = `${baseName}-with-subtitles.mp4`;

    // Correctly stream the response body back to the client
    return new NextResponse(videoResponse.body, {
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error('=== BURN-IN PROCESS FAILED ===');
    console.error('Error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: `Failed to process video: ${error instanceof Error ? error.message : 'Unknown error'}`
      },
      { status: 500 }
    );
  }
}
