import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: NextRequest) {
  try {
    const { videoPublicId } = await request.json();

    if (!videoPublicId) {
      return NextResponse.json(
        { success: false, error: 'Missing videoPublicId' },
        { status: 400 }
      );
    }

    // Generate the waveform URL using Cloudinary transformations
    const waveformUrl = cloudinary.url(videoPublicId, {
      resource_type: 'video',
      transformation: [
        {
          width: 2000,
          height: 240, // Taller for better visual representation
          crop: 'scale',
        },
        {
          flags: 'waveform',
          background: 'transparent', // Transparent background
          color: '#ffffff' // White waveform peaks
        }
      ],
      format: 'png' // The output format of the waveform image
    });

    return NextResponse.json({ success: true, waveformUrl });

  } catch (error) {
    console.error('=== WAVEFORM GENERATION FAILED ===', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { success: false, error: `Failed to generate waveform: ${errorMessage}` },
      { status: 500 }
    );
  }
}
