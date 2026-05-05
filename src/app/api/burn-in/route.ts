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
      subtitleColor, subtitleBackgroundColor, playbackSpeed,
      cloud_name, api_key, api_secret, isBold
    } = body;

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

    const vttContent = formatVtt(adjustedSubtitles);
    const vttPublicId = `subs-${Date.now()}.vtt`;
    
    await cloudinary.uploader.upload(`data:text/vtt;base64,${Buffer.from(vttContent).toString('base64')}`, {
      resource_type: 'raw',
      public_id: vttPublicId,
    });

    // FONT: Noto Sans Arabic is the gold standard for shaping Urdu/Arabic on Cloudinary
    let fontName = subtitleFont ? subtitleFont.split(',')[0].trim() : 'Arial';
    if (fontName === 'Noto Urdu') fontName = 'Noto Sans Arabic';
    
    // COLOR FIX: Cloudinary transformations hate '#' - they need 'rgb:XXXXXX'
    const sColor = subtitleColor.replace('#', 'rgb:');
    const { color: bgHex, opacity: bgOpacity } = parseRgba(subtitleBackgroundColor);
    const bColor = bgHex.replace('#', 'rgb:');

    const transformation: any[] = [];
    
    // 1. Add Speed Effect
    if (playbackSpeed && playbackSpeed !== 1.0) {
      transformation.push({ effect: `accelerate:${Math.round((playbackSpeed - 1) * 100)}` });
    }

    // 2. Add Subtitle Overlay (Manual Syntax for maximum compatibility)
    transformation.push({
      overlay: {
        resource_type: 'subtitles',
        public_id: `${fontName}:${vttPublicId}`
      },
      font_size: Math.round(subtitleFontSize * 0.8),
      color: sColor,
      background: bColor === 'transparent' ? undefined : bColor,
      opacity: bgOpacity,
      gravity: 'south',
      y: 80,
      flags: 'layer_apply'
    });

    const finalUrl = cloudinary.url(videoPublicId, {
      resource_type: 'video',
      transformation: transformation,
      format: 'mp4',
      sign_url: true,
    });

    return NextResponse.json({ success: true, downloadUrl: finalUrl });
  } catch (error) {
    console.error('EXPORT ERROR:', error);
    return NextResponse.json({ success: false, error: 'Internal Error' }, { status: 500 });
  }
}
