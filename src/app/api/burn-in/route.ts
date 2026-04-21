import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { formatVtt } from '@/lib/srt';

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
    const body = await request.json();
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
      filterName,
      playbackSpeed,
      // BYOK Support: Keys from Android App
      cloud_name,
      api_key,
      api_secret,
      // Coordinate Support: Drag position from Android App
      subtitleX,
      subtitleY
    } = body;

    // Configure Cloudinary with keys from app or environment
    cloudinary.config({
      cloud_name: cloud_name || process.env.CLOUDINARY_CLOUD_NAME,
      api_key: api_key || process.env.CLOUDINARY_API_KEY,
      api_secret: api_secret || process.env.CLOUDINARY_API_SECRET,
    });

    if (!videoPublicId || !subtitles) {
      return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
    }

    // 1. Upload Subtitles
    const vttContent = formatVtt(subtitles);
    const vttUpload = await cloudinary.uploader.upload(`data:text/vtt;base64,${Buffer.from(vttContent).toString('base64')}`, {
      resource_type: 'raw',
      public_id: `subtitles-${Date.now()}`,
    });

    const transformations: any[] = [];

    // 2. Add Filter (Applied FIRST)
    if (filterName && filterName !== "None") {
      const effect = filterName === "B&W" ? "grayscale" : 
                     filterName === "Vintage" ? "sepia" : 
                     filterName.toLowerCase();
      transformations.push({ effect });
    }

    // 3. Add Speed
    if (playbackSpeed && playbackSpeed !== 1.0) {
      const percentage = Math.round((playbackSpeed - 1) * 100);
      transformations.push({ effect: `accelerate:${percentage}` });
    }

    // 4. Add Subtitles (Applied LAST so they are on top)
    const { color: bgColor, opacity: bgOpacity } = parseRgba(subtitleBackgroundColor);
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
      // Apply the drag coordinates from Android
      // 30 is the default margin, we add the drag delta
      x: subtitleX || 0,
      y: 30 - (subtitleY || 0), 
      flags: 'layer_apply'
    };

    if (subtitleOutlineColor && subtitleOutlineColor !== 'transparent') {
      const { color: outlineColor } = parseRgba(subtitleOutlineColor);
      subtitleLayer.border = `2px_solid_${outlineColor.replace('#', 'rgb:')}`;
    }
    transformations.push(subtitleLayer);

    // 5. Generate Final URL
    const finalUrl = cloudinary.url(videoPublicId, {
      resource_type: 'video',
      transformation: transformations,
      format: 'mp4',
      quality: 'auto',
      sign_url: true,
      invalidate: true
    });

    return NextResponse.json({ success: true, downloadUrl: finalUrl });

  } catch (error) {
    console.error('EXPORT ERROR:', error);
    return NextResponse.json({ success: false, error: 'Export Failed' }, { status: 500 });
  }
}
