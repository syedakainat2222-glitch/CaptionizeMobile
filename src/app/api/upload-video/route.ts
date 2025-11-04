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
    const uploadResult = await cloudinary.uploader.upload(videoDataUri, {
      resource_type: 'video',
    });
    return NextResponse.json({ videoUrl: uploadResult.secure_url });
  } catch (error) {
    console.error('Upload to cloudinary failed', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
