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
  if (!rgba || !rgba.startsWith('rgba')) return { color: rgba, opacity: 100 };
  const match = rgba.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
  if (!match) return { color: '#000000', opacity: 50 };
  const [, r, g, b, a] = match;
  const toHex = (c: string) => parseInt(c).toString(16).padStart(2, '0');
  return { color: `#${toHex(r)}${toHex(g)}${toHex(b)}`, opacity: Math.round(parseFloat(a) * 100) };
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoPublicId, subtitles, subtitleFont, subtitleFontSize, subtitleColor, subtitleBackgroundColor, subtitleOutlineColor, isBold, isItalic, isUnderline, playbackSpeed, cloud_name, api_key, api_secret } = body;

    cloudinary.config({
      cloud_name: cloud_name || process.env.CLOUDINARY_CLOUD_NAME,
      api_key: api_key || process.env.CLOUDINARY_API_KEY,
      api_secret: api_secret || process.env.CLOUDINARY_API_SECRET,
      secure: true
    });

    if (!videoPublicId || !subtitles) return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });

    const adjustedSubtitles = subtitles.map((sub: any) => ({
      ...sub,
      startTime: msToTime(timeToMs(sub.startTime) / (playbackSpeed || 1.0)),
      endTime: msToTime(timeToMs(sub.endTime) / (playbackSpeed || 1.0)),
    }));

    const vttUpload = await cloudinary.uploader.upload(`data:text/vtt;base64,${Buffer.from(formatVtt(adjustedSubtitles)).toString('base64')}`, {
      resource_type: 'raw',
      overwrite: true,
      public_id: `subtitles-${Date.now()}`,
    });

    let primaryFont = subtitleFont?.split(',')[0].trim() || 'Arial';
    if (primaryFont === 'Serif') primaryFont = 'Times';
    if (primaryFont === 'SansSerif') primaryFont = 'Arial';
    if (primaryFont === 'Monospace') primaryFont = 'Courier';

    const { color: bgColor, opacity: bgOpacity } = parseRgba(subtitleBackgroundColor);
    const isArabic = /[\u0600-\u06FF]/.test(subtitles[0]?.text || '');

    const transformation = [
      { effect: `accelerate:${Math.round(((playbackSpeed || 1.0) - 1) * 100)}` },
      {
        overlay: {
          font_family: primaryFont,
          font_size: Math.round(subtitleFontSize * 3.5),
          font_weight: isBold ? 'bold' : 'normal',
          font_style: isItalic ? 'italic' : 'normal',
          text_decoration: isUnderline ? 'underline' : 'none',
          public_id: `subtitles:${vttUpload.public_id}` 
        },
        color: subtitleColor,
        background: bgColor.replace('#', 'rgb:'),
        opacity: bgOpacity,
      },
      {
        gravity: 'south',
        y: Math.round(40 * 3.5),
        flags: isArabic ? ["layer_apply", "text_shaping"] : ["layer_apply"]
      }
    ];

    if (subtitleOutlineColor && subtitleOutlineColor !== 'transparent' && !isArabic) {
      const { color: outColor } = parseRgba(subtitleOutlineColor);
      (transformation[1] as any).border = `2px_solid_${outColor.replace('#', 'rgb:')}`;
    }

    const finalUrl = cloudinary.url(videoPublicId, { resource_type: 'video', transformation, format: 'mp4', quality: 'auto', sign_url: true });
    return NextResponse.json({ success: true, downloadUrl: finalUrl });

  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal Error' }, { status: 500 });
  }
}
