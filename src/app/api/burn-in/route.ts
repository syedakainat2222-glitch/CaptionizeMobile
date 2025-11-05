// src/app/api/burn-in/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Font mapping for Cloudinary
const CLOUDINARY_FONTS: Record<string, string> = {
  'Inter, sans-serif': 'Inter',
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
  'Exo 2, sans-serif': 'Exo_2',
  'Dosis, sans-serif': 'Dosis',
  'Helvetica, sans-serif': 'Helvetica',
  'Arial, sans-serif': 'Arial',
  'Playfair Display, serif': 'Playfair_Display',
  'Merriweather, serif': 'Merriweather',
  'Lora, serif': 'Lora',
  'PT Serif, serif': 'PT_Serif',
  'Georgia, serif': 'Georgia',
  'Pacifico, cursive': 'Pacifico',
  'Caveat, cursive': 'Caveat',
  'Dancing Script, cursive': 'Dancing_Script',
  'Source Code Pro, monospace': 'Source_Code_Pro'
};

const srtTimeToSeconds = (time: string): number => {
  const parts = time.split(':');
  const secondsAndMs = parts[2].split(',');
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const seconds = parseInt(secondsAndMs[0], 10);
  const milliseconds = parseInt(secondsAndMs[1], 10);
  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
};

// Cloudinary requires special escaping for text in overlays.
// , and / are special characters. We also need to escape ' "
const sanitizeTextForCloudinary = (text: string): string => {
  return text
    .replace(/,/g, '%2C')
    .replace(/\//g, '%2F')
    .replace(/'/g, '%27')
    .replace(/"/g, '%22');
};

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
    
    const cloudinaryFont = CLOUDINARY_FONTS[subtitleFont] || 'Arial';

    // Build a transformation with multiple text overlays
    const transformation = subtitles.map(subtitle => {
        const startOffset = srtTimeToSeconds(subtitle.startTime).toFixed(1);
        const endOffset = srtTimeToSeconds(subtitle.endTime).toFixed(1);
        
        // Use encodeURIComponent for the text itself to handle all special characters
        const encodedText = encodeURIComponent(subtitle.text);
        
        return {
            overlay: {
                font_family: cloudinaryFont,
                font_size: subtitleFontSize,
                text: encodedText,
            },
            color: 'white',
            background: 'rgba:0,0,0,0.6',
            gravity: 'south',
            y: 30,
            start_offset: startOffset,
            end_offset: endOffset
        };
    });

    const finalUrl = cloudinary.url(videoPublicId, {
      resource_type: 'video',
      transformation: transformation,
      format: 'mp4',
    });

    // As a proxy, fetch the video from the final URL and stream it back.
    const videoResponse = await fetch(finalUrl);

    if (!videoResponse.ok || !videoResponse.body) {
      throw new Error(`Failed to fetch processed video from Cloudinary. Status: ${videoResponse.status}`);
    }

    const baseName = (videoName || 'video').split('.').slice(0, -1).join('.') || 'video';
    const filename = `${baseName}-with-subtitles.mp4`;

    // Stream the video back to the client
    return new NextResponse(videoResponse.body, {
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error('=== BURN-IN PROCESS FAILED ===');
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error:', errorMessage);
    
    return NextResponse.json(
      { 
        success: false,
        error: `Failed to process video: ${errorMessage}`
      },
      { status: 500 }
    );
  }
}
