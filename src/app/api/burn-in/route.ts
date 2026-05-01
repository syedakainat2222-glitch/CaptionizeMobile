import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { formatVtt } from '@/lib/srt';

const timeToMs = (timeStr: string) => {
  const [h, m, s_ms] = timeStr.split(':');
  const [s, ms] = s_ms.split(',');
  return parseInt(h) * 3600000 + parseInt(m) * 60000 + parseInt(s) * 1000 + parseInt(ms);
};

const msToTime = (totalMs: number) => {
  const h = Math.floor(totalMs / 3600000);
  const m = Math.floor((totalMs % 3600000) / 60000);
  const s = Math.floor((totalMs % 60000) / 1000);
  const ms = Math.floor(totalMs % 1000);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
};

const parseRgba = (rgba: string) => {
  if (!rgba || !rgba.startsWith('rgba')) {
    return { color: rgba, opacity: 100 };
  }
  const match = rgba.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
  if (!match) return { color: '#000000', opacity: 100 };
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
      videoPublicId, subtitles, videoName, subtitleFont,
      subtitleFontSize, subtitleColor, subtitleBackgroundColor,
      subtitleOutlineColor, isBold, isItalic, isUnderline,
      playbackSpeed, cloud_name, api_key, api_secret
    } = body;

    cloudinary.config({
      cloud_name: cloud_name || process.env.CLOUDINARY_CLOUD_NAME,
      api_key: api_key || process.env.CLOUDINARY_API_KEY,
      api_secret: api_secret || process.env.CLOUDINARY_API_SECRET,
      secure: true
    });

    const speedMultiplier = playbackSpeed || 1.0;
    const adjustedSubtitles = subtitles.map((sub: any) => ({
      ...sub,
      startTime: msToTime(timeToMs(sub.startTime) / speedMultiplier),
      endTime: msToTime(timeToMs(sub.endTime) / speedMultiplier),
    }));

    const vttContent = formatVtt(adjustedSubtitles);
    const vttBase64 = Buffer.from(vttContent).toString('base64');
    const vttUpload = await cloudinary.uploader.upload(`data:text/vtt;base64,${vttBase64}`, {
      resource_type: 'raw',
      overwrite: true,
      public_id: `subtitles-${Date.now()}`,
    });

    // --- FONT MAPPING ---
    let fontName = subtitleFont ? subtitleFont.split(',')[0].trim() : 'Arial';
    if (fontName === 'Serif') fontName = 'Times';
    else if (fontName === 'SansSerif') fontName = 'Arial';
    else if (fontName === 'Monospace') fontName = 'Courier';
    else if (fontName === 'Noto Urdu') fontName = 'Noto Nastaliq Urdu';

    const { color: bgColor, opacity: bgOpacity } = parseRgba(subtitleBackgroundColor);
    const scaledSize = Math.round(subtitleFontSize * 3.5);
    const scaledY = Math.round(45 * 3.5);

    // Build transformation array
    const transformations: any[] = [];

    // 1. Add Speed only if it's not normal speed
    if (speedMultiplier !== 1.0) {
      const speedEffectValue = Math.round((speedMultiplier - 1) * 100);
      transformations.push({ effect: `accelerate:${speedEffectValue}` });
    }

    // 2. Add Subtitles
    const subParams: any = {
      overlay: {
        resource_type: 'subtitles',
        public_id: vttUpload.public_id,
        font_family: fontName,
        font_size: scaledSize,
        font_weight: isBold ? 'bold' : 'normal',
        font_style: isItalic ? 'italic' : 'normal',
        text_decoration: isUnderline ? 'underline' : 'none',
      },
      color: subtitleColor,
      background: bgColor,
      opacity: bgOpacity,
      gravity: 'south',
      y: scaledY,
      flags: 'layer_apply'
    };

    // Cloudinary video subtitles don't support "border" (outline) as easily as images.
    // However, we can use a small shadow to simulate it if border fails.
    if (subtitleOutlineColor && subtitleOutlineColor !== 'transparent') {
        const { color: outColor } = parseRgba(subtitleOutlineColor);
        subParams.effect = `shadow:100:0:0_${outColor.replace('#', 'rgb:')}`;
    }

    transformations.push(subParams);

    const finalUrl = cloudinary.url(videoPublicId, {
      resource_type: 'video',
      transformation: transformations,
      format: 'mp4',
      quality: 'auto',
      sign_url: true,
      attachment: `${videoName || 'video'}_processed.mp4`,
    });

    return NextResponse.json({ success: true, downloadUrl: finalUrl });

  } catch (error) {
    console.error("Cloudinary Error:", error);
    return NextResponse.json({ success: false, error: 'Internal Error' }, { status: 500 });
  }
}
