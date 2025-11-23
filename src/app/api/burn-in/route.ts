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

// This function that handles VTT uploading will not be touched.
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

    // Parse the primary font name and format it for Cloudinary
    const primaryFont = subtitleFont.split(',')[0].trim();
    const cloudinaryFont = primaryFont.replace(/ /g, '_');
    let textDecoration = 'none';
    if (isUnderline) textDecoration = 'underline';

    const transformation = [
      {
        overlay: {
          resource_type: 'subtitles',
          public_id: vttPublicId,
          font_family: cloudinaryFont,
          font_size: subtitleFontSize,
          font_weight: isBold ? 'bold' : 'normal',
          font_style: isItalic ? 'italic' : 'normal',
          text_decoration: textDecoration,
        },
      },
      {
        background: subtitleBackgroundColor,
        color: subtitleColor,
      },
      {
        flags: 'layer_apply',
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
      const errorText = await videoResponse.text();
      throw new Error(`Failed to fetch processed video from Cloudinary. Status: ${videoResponse.status}, Body: ${errorText}`);
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
