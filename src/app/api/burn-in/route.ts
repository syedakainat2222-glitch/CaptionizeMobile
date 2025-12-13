import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { formatVtt } from '@/lib/srt';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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

    const primaryFont = subtitleFont ? subtitleFont.split(',')[0].trim() : 'Arial';
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
    
    const safeFilename = videoName ? videoName.replace(/[^a-z0-9_.-]/gi, '_').split('.')[0] : 'video';
    const filename = `${safeFilename}_with_subtitles.mp4`;

    const finalUrl = cloudinary.url(videoPublicId, {
      resource_type: 'video',
      transformation: [transformationParams],
      format: 'mp4',
      quality: 'auto',
      sign_url: true, // Generate a short-lived, secure URL
      attachment: filename, // Tell browser to download with this filename
    });

    // Return the URL for the client to handle the download
    return NextResponse.json({ success: true, downloadUrl: finalUrl });

  } catch (error) {
    console.error('=== VIDEO PROCESSING FAILED ===', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { success: false, error: `Failed to process video: ${errorMessage}` },
      { status: 500 }
    );
  }
}