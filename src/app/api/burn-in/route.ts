
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

// Function to parse rgba color and return Cloudinary compatible color and opacity
const parseRgba = (rgba: string): { color: string; opacity: number } => {
    if (!rgba || !rgba.startsWith('rgba')) return { color: 'rgb:000000', opacity: 50 };
    const parts = rgba.substring(rgba.indexOf('(') + 1, rgba.lastIndexOf(')')).split(',');
    const r = parseInt(parts[0], 10);
    const g = parseInt(parts[1], 10);
    const b = parseInt(parts[2], 10);
    const a = parseFloat(parts[3]);
    const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    return {
        color: `rgb:${hex.substring(1)}`,
        opacity: Math.round(a * 100)
    };
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

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { 
        videoPublicId, subtitles, videoName, 
        subtitleFont, subtitleFontSize, subtitleColor,
        subtitleBackgroundColor, subtitleOutlineColor,
        isBold, isItalic, isUnderline
    } = await request.json();

    if (!videoPublicId || !subtitles || !Array.isArray(subtitles)) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid parameters: videoPublicId and subtitles are required.' },
        { status: 400 }
      );
    }

    const srtPublicId = await uploadSrtToCloudinary(subtitles);
    const cloudinaryFont = CLOUDINARY_FONTS[subtitleFont as keyof typeof CLOUDINARY_FONTS] || 'Arial';

    const hasComplexChars = subtitles.some(s => /[\u0600-\u06FF]/.test(s.text));
    const finalFont = hasComplexChars ? 'noto_naskh_arabic' : cloudinaryFont;
    
    const { color: boxColor, opacity: boxOpacity } = parseRgba(subtitleBackgroundColor || 'rgba(0,0,0,0.5)');
    
    // Build the transformation object conditionally
    const subtitleOverlay: any = {
        resource_type: 'subtitles',
        public_id: srtPublicId,
        font_family: finalFont,
        font_size: subtitleFontSize,
    };

    if (isBold) subtitleOverlay.font_weight = 'bold';
    if (isItalic) subtitleOverlay.font_style = 'italic';
    if (isUnderline) subtitleOverlay.text_decoration = 'underline';

    if (subtitleOutlineColor && subtitleOutlineColor !== 'transparent') {
        subtitleOverlay.border = `2px_solid_${subtitleOutlineColor.replace('#', 'rgb:')}`;
    }

    const videoUrl = cloudinary.url(videoPublicId, {
        resource_type: 'video',
        transformation: [
            { overlay: subtitleOverlay, color: subtitleColor || '#FFFFFF' },
            {
              flags: "layer_apply",
              background: boxColor,
              opacity: boxOpacity,
              gravity: 'south',
              y: 30,
            }
        ],
        format: 'mp4',
        quality: 'auto'
    });

    const videoResponse = await fetch(videoUrl);
    
    if (!videoResponse.ok) {
        console.error('Cloudinary fetch failed. Status:', videoResponse.status);
        const errorBody = await videoResponse.text();
        console.error('Cloudinary error body:', errorBody);
        throw new Error(`Failed to fetch processed video from Cloudinary. Status: ${videoResponse.status}`);
    }

    const videoStream = videoResponse.body;
    if (!videoStream) {
        throw new Error('Could not get video stream from Cloudinary response.');
    }

    const baseName = (videoName || 'video').split('.').slice(0, -1).join('.') || 'video';
    const filename = `${baseName}-with-subtitles.mp4`;
    
    return new NextResponse(videoStream, {
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error('=== BURN-IN PROCESS FAILED ===', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { success: false, error: `Failed to process video: ${errorMessage}` },
      { status: 500 }
    );
  }
}
