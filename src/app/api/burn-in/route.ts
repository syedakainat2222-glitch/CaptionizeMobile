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

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '100mb',
    },
  },
};

// Upload VTT file to Cloudinary and return its public_id
async function uploadVttToCloudinary(subtitles: Subtitle[]): Promise<string> {
  const vttContent = formatVtt(subtitles);
  
  // DEBUG: Log the VTT content
  console.log('=== VTT CONTENT BEING UPLOADED ===');
  console.log(vttContent);
  console.log('=== END VTT CONTENT ===');
  
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
  
  console.log('VTT uploaded successfully with public_id:', uploadResult.public_id);
  return uploadResult.public_id;
}

export async function POST(request: NextRequest) {
  try {
    const {
      videoPublicId,
      subtitles,
      videoName,
    } = await request.json();

    console.log('Received parameters for burn-in:', {
      videoPublicId,
      subtitlesCount: subtitles?.length,
      videoName,
    });

    if (!videoPublicId || !subtitles || !Array.isArray(subtitles)) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid parameters' },
        { status: 400 }
      );
    }

    // Upload VTT file
    const vttPublicId = await uploadVttToCloudinary(subtitles);

    // Simple transformation - Cloudinary handles basic subtitles best
    const transformation = [
      {
        overlay: {
          resource_type: 'subtitles',
          public_id: vttPublicId
        }
      },
      {
        flags: 'layer_apply',
        gravity: 'south',
        y: 30
      }
    ];

    console.log('Using transformation:', transformation);

    // Generate the URL using cloudinary.url()
    const videoUrl = cloudinary.url(videoPublicId, {
      resource_type: 'video',
      transformation: transformation,
      format: 'mp4',
      quality: 'auto',
    });

    console.log('Generated Cloudinary URL:', videoUrl);

    // Fetch the processed video
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      const errorText = await videoResponse.text();
      console.error('Cloudinary fetch failed:', {
        status: videoResponse.status,
        statusText: videoResponse.statusText,
        errorBody: errorText
      });
      throw new Error(`Failed to fetch processed video from Cloudinary. Status: ${videoResponse.status}`);
    }

    const videoArrayBuffer = await videoResponse.arrayBuffer();

    const baseName = (videoName || 'video').split('.').slice(0, -1).join('.') || 'video';
    const filename = `${baseName}-with-subtitles.mp4`;
    
    return new NextResponse(videoArrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': videoArrayBuffer.byteLength.toString(),
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