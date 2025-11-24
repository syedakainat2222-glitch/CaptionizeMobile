import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { formatVtt, type Subtitle } from '@/lib/srt';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

const parseRgba = (rgba: string) => {
  if (!rgba || !rgba.startsWith('rgba')) {
    return { color: rgba, opacity: 100 };
  }
  const match = rgba.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
  if (!match) return { color: '#000000', opacity: 50 };
  const [, r, g, b, a] = match;
  const toHex = (c: string) => parseInt(c).toString(16).padStart(2, '0');
  const color = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  const opacity = Math.round(parseFloat(a) * 100);
  return { color, opacity };
};

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

    const vttContent = formatVtt(subtitles);
    const vttBase64 = Buffer.from(vttContent).toString('base64');
    const vttDataUri = `data:text/vtt;base64,${vttBase64}`;

    const vttUpload = await cloudinary.uploader.upload(vttDataUri, {
      resource_type: 'raw',
      overwrite: true,
      public_id: `subtitles-${Date.now()}`,
    });

    const primaryFont = subtitleFont.split(',')[0].trim().replace(/ /g, '_');
    const textDecoration = isUnderline ? 'underline' : 'none';
    const { color: bgColor, opacity: bgOpacity } = parseRgba(subtitleBackgroundColor);

    const transformationParams: any = {
      overlay: {
        resource_type: 'subtitles',
        public_id: vttUpload.public_id,
        font_family: primaryFont,
        font_size: subtitleFontSize,
        font_weight: isBold ? 'bold' : 'normal',
        font_style: isItalic ? 'italic' : 'normal',
        text_decoration: textDecoration,
      },
      color: subtitleColor,
      background: bgColor,
      opacity: bgOpacity,
      flags: 'layer_apply',
      gravity: 'south',
      y: 30,
    };

    if (subtitleOutlineColor && subtitleOutlineColor !== 'transparent') {
      const { color: outlineColor } = parseRgba(subtitleOutlineColor);
      transformationParams.border = `2px_solid_${outlineColor.replace('#', 'rgb:')}`;
    }

    const transformation = [transformationParams];

    const videoUrl = cloudinary.url(videoPublicId, {
      resource_type: 'video',
      transformation: transformation,
      format: 'mp4',
      quality: 'auto',
    });

    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      const errorText = await videoResponse.text();
      console.error('Cloudinary URL failed:', videoUrl);
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