import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { formatVtt } from '@/lib/srt';

// Helper to fix colors for Cloudinary (removes # and adds rgb:)
const cleanColor = (c: string) => {
  if (!c || c === 'none' || c === 'Transparent') return null;
  return c.startsWith('#') ? `rgb:${c.slice(1)}` : c;
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

    // Calculate Coordinates: 
    // Android Drag UP = Negative Y. Cloudinary South Y = Distance from bottom.
    // So 5% (base) - (negative drag) = 25% up.
    const finalY = Math.max(0, Math.round(5 - (subtitleY || 0)));
    const finalX = subtitleX || 0;

    const subtitleLayer: any = {
      overlay: {
        resource_type: 'subtitles',
        public_id: vttUpload.public_id,
        font_family: subtitleFont ? subtitleFont.split(',')[0].trim() : 'Arial',
        font_size: subtitleFontSize || 24,
        font_weight: isBold ? 'bold' : 'normal',
        font_style: isItalic ? 'italic' : 'normal',
        text_decoration: isUnderline ? 'underline' : 'none',
      },
      color: cleanColor(subtitleColor) || 'rgb:ffffff',
      gravity: 'south',
      x: `${finalX}p`, // The 'p' tells Cloudinary to use Percentages
      y: `${finalY}p`, 
      flags: 'layer_apply'
    };

    const bg = cleanColor(subtitleBackgroundColor);
    if (bg) { subtitleLayer.background = bg; }

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
    console.error("Cloudinary Error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
