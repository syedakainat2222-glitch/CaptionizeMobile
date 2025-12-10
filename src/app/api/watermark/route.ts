
import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const toUrlSafeBase64 = (url: string) => {
    return Buffer.from(url).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
}

export async function POST(request: NextRequest) {
  try {
    const {
      videoPublicId,
      imageUrl,
      position, // e.g., 'north_east', 'south_west'
      scale, // e.g., 0.2 for 20% of video width
      opacity, // e.g., 80 for 80% opacity
    } = await request.json();

    if (!videoPublicId || !imageUrl || !position) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters for watermarking' },
        { status: 400 }
      );
    }

    const transformation = [
      {
        overlay: `fetch:${toUrlSafeBase64(imageUrl)}`,
        width: `(w * ${scale || 0.2})`,
        gravity: position,
        opacity: opacity || 80,
        x: 20, // Default padding
        y: 20, // Default padding
      },
    ];

    const watermarkedUrl = cloudinary.url(videoPublicId, {
      resource_type: 'video',
      transformation: transformation,
      sign_url: true,
    });

    return NextResponse.json({
      success: true,
      watermarkedUrl: watermarkedUrl,
    });

  } catch (error) {
    console.error('=== WATERMARKING FAILED ===', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { success: false, error: `Failed to apply watermark: ${errorMessage}` },
      { status: 500 }
    );
  }
}
