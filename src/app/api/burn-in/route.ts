
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

// Font mapping for Cloudinary
// This map correctly associates the UI font family with the name Cloudinary expects.
// "noto_naskh_arabic" is used for scripts that need it, like Urdu.
const CLOUDINARY_FONTS: { [key: string]: string } = {
  'Inter, sans-serif': 'Arial',
  'Roboto, sans-serif': 'Roboto',
  'Open Sans, sans-serif': 'Open_Sans',
  'Lato, sans-serif': 'Lato',
  'Montserrat, sans-serif': 'Montserrat',
  'Poppins, sans-serif': 'Poppins',
  'Nunito, sans-serif': 'Nunito',
  'Raleway, sans-serif': 'Raleway',
  'Source Sans 3, sans-serif': 'Source_Sans_Pro',
  'Ubuntu, sans-serif': 'Ubuntu',
  'Oswald, sans-serif': 'Oswald',
  'Exo 2, sans-serif': 'Exo',
  'Dosis, sans-serif': 'Dosis',
  'Helvetica, sans-serif': 'Arial',
  'Arial, sans-serif': 'Arial',
  'Playfair Display, serif': 'Playfair_Display',
  'Merriweather, serif': 'Merriweather',
  'Lora, serif': 'Lora',
  'PT Serif, serif': 'PT_Serif',
  'Georgia, serif': 'Georgia',
  'Pacifico, cursive': 'Pacifico',
  'Caveat, cursive': 'Caveat',
  'Dancing Script, cursive': 'Dancing_Script',
  'Source Code Pro, monospace': 'Courier'
};


/**
 * Uploads subtitles as an SRT file to Cloudinary.
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

    console.log('=== NEW BURN-IN PROCESS STARTED (SRT Method) ===');

    if (!videoPublicId || !subtitles || !Array.isArray(subtitles)) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid parameters' },
        { status: 400 }
      );
    }

    // 1. Upload the subtitles as an SRT file to Cloudinary
    const srtPublicId = await uploadSrtToCloudinary(subtitles);
    console.log('Uploaded SRT to Cloudinary with public_id:', srtPublicId);

    // 2. Map the font and create the text style for Cloudinary
    // Fallback to Arial if the font isn't in our map.
    const cloudinaryFont = CLOUDINARY_FONTS[subtitleFont as keyof typeof CLOUDINARY_FONTS] || 'Arial';

    // A special check for Urdu or other languages that require a specific font.
    const hasComplexChars = subtitles.some(s => /[\u0600-\u06FF]/.test(s.text));
    const finalFont = hasComplexChars ? 'noto_naskh_arabic' : cloudinaryFont;
    console.log(`Using font: ${finalFont} (original: ${cloudinaryFont}, complex chars: ${hasComplexChars})`);


    // 3. Generate the video URL with the subtitles layered on top
    const videoUrl = cloudinary.url(videoPublicId, {
        resource_type: 'video',
        transformation: [
            {
                overlay: `subtitles:${srtPublicId.replace(/\//g, ':')}`,
                font_family: finalFont,
                font_size: subtitleFontSize,
            },
            // Apply styling to the subtitle layer
            {
              flags: "layer_apply",
              color: 'white',
              background: 'rgb:000000CC', // Semi-transparent black background
              gravity: 'south',
              y: 30,
            }
        ],
        format: 'mp4',
        quality: 'auto'
    });

    console.log('Generated final video URL:', videoUrl);
    
    // 4. Fetch the generated video and stream it back to the client
    const videoResponse = await fetch(videoUrl);
    
    if (!videoResponse.ok || !videoResponse.body) {
      throw new Error(`Failed to fetch processed video from Cloudinary. Status: ${videoResponse.status}`);
    }

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
