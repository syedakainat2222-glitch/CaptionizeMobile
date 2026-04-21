import { NextRequest, NextResponse } from 'next/server';import { v2 as cloudinary } from 'cloudinary';
import { formatVtt } from '@/lib/srt';

const parseColor = (color: string) => {
  if (!color || color === 'none') return null;
  // Convert #FFFFFF to rgb:FFFFFF for Cloudinary
  return color.startsWith('#') ? `rgb:${color.slice(1)}` : color;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      videoPublicId, subtitles, subtitleFont, subtitleFontSize,
      subtitleColor, subtitleBackgroundColor, isBold, isItalic, isUnderline,
      filterName, playbackSpeed, cloud_name, api_key, api_secret,
      subtitleX, subtitleY
    } = body;

    cloudinary.config({
      cloud_name: cloud_name || process.env.CLOUDINARY_CLOUD_NAME,
      api_key: api_key || process.env.CLOUDINARY_API_KEY,
      api_secret: api_secret || process.env.CLOUDINARY_API_SECRET,
    });

    if (!videoPublicId || !subtitles) return NextResponse.json({ success: false }, { status: 400 });

    const vttContent = formatVtt(subtitles);
    const vttUpload = await cloudinary.uploader.upload(`data:text/vtt;base64,${Buffer.from(vttContent).toString('base64')}`, {
      resource_type: 'raw',
      public_id: `subtitles-${Date.now()}`,
    });

    const transformations: any[] = [];
    
    // Calculate and Clamp Coordinates (Never allow negative values)
    const finalY = Math.max(0, Math.round(5 - (subtitleY || 0)));
    const finalX = subtitleX || 0;

    const subtitleLayer: any = {
      overlay: {
        resource_type: 'subtitles',
        public_id: vttUpload.public_id,
        font_family: subtitleFont ? subtitleFont.split(',')[0].trim() : 'Arial',
        font_size: subtitleFontSize || 20,
        font_weight: isBold ? 'bold' : 'normal',
        font_style: isItalic ? 'italic' : 'normal',
        text_decoration: isUnderline ? 'underline' : 'none',
      },
      color: parseColor(subtitleColor) || 'white',
      gravity: 'south',
      x: `${finalX}p`,
      y: `${finalY}p`,
      flags: 'layer_apply'
    };

    if (subtitleBackgroundColor && subtitleBackgroundColor !== 'none') {
      subtitleLayer.background = parseColor(subtitleBackgroundColor);
    }

    transformations.push(subtitleLayer);

    const finalUrl = cloudinary.url(videoPublicId, {
      resource_type: 'video',
      transformation: transformations,
      format: 'mp4',
      sign_url: true,
      invalidate: true
    });

    return NextResponse.json({ success: true, downloadUrl: finalUrl });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
