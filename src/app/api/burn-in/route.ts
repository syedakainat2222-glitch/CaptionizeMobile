
// src/app/api/burn-in/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { formatVtt, type Subtitle } from '@/lib/srt';
import { Readable } from 'stream';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// IMPORTANT: Set the body size limit for this route
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '100mb', // Set the desired limit here
    },
  },
};

// Mapping of CSS fonts to Cloudinary fonts
const CLOUDINARY_FONTS: { [key: string]: string } = {
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
  'Georgia, serif': 'Georgia',
  'Times New Roman, serif': 'Times_New_Roman',
  'Playfair Display, serif': 'Playfair_Display',
  'Merriweather, serif': 'Merriweather',
  'Lora, serif': 'Lora',
  'Courier New, monospace': 'Courier',
  'Source Code Pro, monospace': 'Source_Code_Pro',
  'Pacifico, cursive': 'Pacifico',
  'Dancing Script, cursive': 'Dancing_Script',
  'Caveat, cursive': 'Caveat',
  'Lobster, cursive': 'Lobster',
  'Righteous, sans-serif': 'Righteous',
};

// Parse rgba color to Cloudinary format
const parseRgba = (rgba: string): string => {
    if (!rgba || !rgba.startsWith('rgba')) return 'rgb:00000080';
    const parts = rgba.substring(rgba.indexOf('(') + 1, rgba.lastIndexOf(')')).split(',');
    const r = parseInt(parts[0], 10);
    const g = parseInt(parts[1], 10);
    const b = parseInt(parts[2], 10);
    const a = parseFloat(parts[3]);
    const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    return `rgb:${hex.substring(1)}${Math.round(a * 100)}`;
};

// Upload VTT file to Cloudinary and return its public_id
async function uploadVttToCloudinary(subtitles: Subtitle[]): Promise<string> {
  const vttContent = formatVtt(subtitles);
  const vttBuffer = Buffer.from(vttContent, 'utf-8');
  const public_id = `subtitles/captionize-${Date.now()}`;

  const uploadResult = await new Promise<{ public_id?: string; error?: any }>((resolve) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { resource_type: 'raw', public_id, format: 'vtt' },
      (error, result) => {
        if (error) resolve({ error });
        else resolve(result || {});
      }
    );
    Readable.from(vttBuffer).pipe(uploadStream);
  });

  if (uploadResult.error) {
    throw new Error(`Cloudinary VTT upload failed: ${uploadResult.error.message}`);
  }
  if (!uploadResult.public_id) {
    throw new Error('Cloudinary VTT upload failed: no public_id returned.');
  }
  return uploadResult.public_id;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const {
      videoPublicId,
      subtitles,
      videoName,
      subtitleFont,
      subtitleFontSize,
      subtitleColor,
      subtitleBackgroundColor,
      subtitleOutlineColor,
      isBold,
      isItalic,
      isUnderline,
    } = await request.json();

    if (!videoPublicId || !subtitles || !Array.isArray(subtitles)) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid parameters' },
        { status: 400 }
      );
    }

    const vttPublicId = await uploadVttToCloudinary(subtitles);
    await delay(3000); // Give Cloudinary time to process VTT

    const cloudinaryFont = CLOUDINARY_FONTS[subtitleFont as keyof typeof CLOUDINARY_FONTS] || 'Arial';
    const finalFont = subtitles.some(s => /[\u0600-\u06FF]/.test(s.text)) ? 'noto_naskh_arabic' : cloudinaryFont;

    const transformation = [
      {
        overlay: {
          resource_type: 'subtitles',
          public_id: vttPublicId,
          font_family: finalFont,
          font_size: subtitleFontSize,
          font_weight: isBold ? 'bold' : 'normal',
          font_style: isItalic ? 'italic' : 'normal',
          text_decoration: isUnderline ? 'underline' : 'none',
        },
        color: subtitleColor,
        background: parseRgba(subtitleBackgroundColor),
        border: subtitleOutlineColor && subtitleOutlineColor !== 'transparent' ? `2px_solid_${subtitleOutlineColor.replace('#','rgb:')}` : undefined,
        gravity: 'south',
        y: 30,
      },
    ];

    const videoUrl = cloudinary.url(videoPublicId, {
        resource_type: 'video',
        transformation: transformation,
        format: 'mp4',
        quality: 'auto',
    });

    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      const errorBody = await videoResponse.text();
      console.error('Cloudinary fetch failed:', videoResponse.status, errorBody);
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
