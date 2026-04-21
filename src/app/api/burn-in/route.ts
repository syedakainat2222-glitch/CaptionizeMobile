import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { formatVtt } from '@/lib/srt';

const parseRgba = (rgba: string) => {
  if (!rgba || !rgba.startsWith('rgba')) return { color: rgba, opacity: 100 };
  const match = rgba.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
  if (!match) return { color: '#000000', opacity: 100 };
  const [, r, g, b, a] = match;
  const toHex = (c: string) => parseInt(c).toString(16).padStart(2, '0');
  return { color: `#${toHex(r)}${toHex(g)}${toHex(b)}`, opacity: Math.round(parseFloat(a) * 100) };
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      videoPublicId, subtitles, subtitleFont, subtitleFontSize,
      subtitleColor, subtitleBackgroundColor, isBold, isItalic, isUnderline,
      filterName, playbackSpeed, cloud_name, api_key, api_secret,
      subtitleX, subtitleY // These are now percentages (-100 to 100)
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
    if (filterName && filterName !== "None") {
      const effect = filterName === "B&W" ? "grayscale" : filterName === "Vintage" ? "sepia" : filterName.toLowerCase();
      transformations.push({ effect });
    }

    if (playbackSpeed && playbackSpeed !== 1.0) {
      transformations.push({ effect: `accelerate:${Math.round((playbackSpeed - 1) * 100)}` });
    }

    const { color: bgColor, opacity: bgOpacity } = parseRgba(subtitleBackgroundColor);
    
    // Calculate Y offset. In Cloudinary 'south' gravity: 
    // y: 0 is bottom. We add a base 5% margin + user's percentage.
    const finalY = Math.round(50 - (subtitleY || 0)); 

    const subtitleLayer: any = {
      overlay: {
        resource_type: 'subtitles',
        public_id: vttUpload.public_id,
        font_family: subtitleFont ? subtitleFont.split(',')[0].trim() : 'Arial',
        font_size: subtitleFontSize,
        font_weight: isBold ? 'bold' : 'normal',
        font_style: isItalic ? 'italic' : 'normal',
        text_decoration: isUnderline ? 'underline' : 'none',
      },
      color: subtitleColor,
      background: bgColor,
      opacity: bgOpacity,
      gravity: 'south',
      x: `${subtitleX || 0}p`, // 'p' suffix makes it percentage based in Cloudinary
      y: `${finalY}p`,
      flags: 'layer_apply'
    };
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
