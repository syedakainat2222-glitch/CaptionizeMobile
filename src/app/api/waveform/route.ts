'use server';

import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: Request) {
  try {
    const { videoPublicId, fgColor, bgColor } = await request.json();

    if (!videoPublicId) {
      return NextResponse.json(
        { success: false, error: 'Missing videoPublicId' },
        { status: 400 }
      );
    }

    const waveformUrl = cloudinary.url(videoPublicId, {
      resource_type: 'video',
      transformation: [
        {
          flags: 'waveform',
          color: fgColor || '#ffffff',
          background_color: bgColor || '#000000',
        },
      ],
      format: 'png',
    });

    return NextResponse.json({ success: true, waveformUrl });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: `Failed to generate waveform: ${errorMessage}` },
      { status: 500 }
    );
  }
}
