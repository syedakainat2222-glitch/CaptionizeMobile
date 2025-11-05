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
const CLOUDINARY_FONTS = {
  'Inter, sans-serif': 'Arial',
  'Roboto, sans-serif': 'Arial',
  'Open Sans, sans-serif': 'Arial',
  'Lato, sans-serif': 'Arial',
  'Montserrat, sans-serif': 'Arial',
  'Poppins, sans-serif': 'Arial',
  'Nunito, sans-serif': 'Arial',
  'Raleway, sans-serif': 'Arial',
  'Source Sans 3, sans-serif': 'Arial',
  'Ubuntu, sans-serif': 'Arial',
  'Oswald, sans-serif': 'Arial',
  'Exo 2, sans-serif': 'Arial',
  'Dosis, sans-serif': 'Arial',
  'Helvetica, sans-serif': 'Arial',
  'Arial, sans-serif': 'Arial',
  'Playfair Display, serif': 'Times_New_Roman',
  'Merriweather, serif': 'Times_New_Roman',
  'Lora, serif': 'Times_New_Roman',
  'PT Serif, serif': 'Times_New_Roman',
  'Georgia, serif': 'Georgia',
  'Pacifico, cursive': 'Arial',
  'Caveat, cursive': 'Arial',
  'Dancing Script, cursive': 'Arial',
  'Source Code Pro, monospace': 'Courier_New'
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
    const cloudinaryFont = CLOUDINARY_FONTS[subtitleFont as keyof typeof CLOUDINARY_FONTS] || 'Arial';
    const textStyle = `${cloudinaryFont}_${subtitleFontSize}_bold`;

    // 3. Generate the video URL with the subtitles layered on top
    const videoUrl = cloudinary.url(videoPublicId, {
        resource_type: 'video',
        transformation: [
            {
                overlay: {
                    resource_type: 'subtitles',
                    public_id: srtPublicId,
                    text_style: textStyle
                },
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
