import { v2 as cloudinary } from 'cloudinary';
import { NextResponse } from 'next/server';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: Request) {
  const { videoDataUri } = await request.json();

  try {
    // Generate a unique public_id for Cloudinary
    const public_id = `captionize-video-${Date.now()}`;

    const uploadResult = await cloudinary.uploader.upload(videoDataUri, {
      resource_type: 'video',
      public_id: public_id,
      overwrite: true,
    });
    
    return NextResponse.json({ 
        videoUrl: uploadResult.secure_url,
        publicId: uploadResult.public_id 
    });

  } catch (error) {
    console.error('Upload to cloudinary failed', error);
    const errorMessage = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ error: `Upload failed: ${errorMessage}` }, { status: 500 });
  }
}
