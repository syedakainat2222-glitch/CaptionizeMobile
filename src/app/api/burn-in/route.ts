import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { formatVtt } from '@/lib/srt';

// ========== 1. MANUAL ARABIC RESHAPER (Fixes Boxes & Joining) ==========
// This function manually joins Arabic letters so they don't look like separate sticks.
function reshapeArabic(text: string): string {
    const charMap: Record<string, [string, string, string, string]> = {
        '\u0627': ['\uFE8D', '\uFE8E', '\uFE8D', '\uFE8E'], // Alef
        '\u0628': ['\uFE8F', '\uFE90', '\uFE91', '\uFE92'], // Ba
        '\u062A': ['\uFE95', '\uFE96', '\uFE97', '\uFE98'], // Ta
        '\u062C': ['\uFE9D', '\uFE9E', '\uFE9F', '\uFEA0'], // Jeem
        '\u062D': ['\uFEA1', '\uFEA2', '\uFEA3', '\uFEA4'], // Ha
        '\u062E': ['\uFEA5', '\uFEA6', '\uFEA7', '\uFEA8'], // Kha
        '\u062F': ['\uFEA9', '\uFEAA', '\uFEA9', '\uFEAA'], // Dal
        '\u0631': ['\uFEAD', '\uFEAE', '\uFEAD', '\uFEAE'], // Ra
        '\u0633': ['\uFEB1', '\uFEB2', '\uFEB3', '\uFEB4'], // Seen
        '\u0634': ['\uFEB5', '\uFEB6', '\uFEB7', '\uFEB8'], // Sheen
        '\u0635': ['\uFEB9', '\uFEBA', '\uFEBB', '\uFEBC'], // Sad
        '\u0637': ['\uFEC1', '\uFEC2', '\uFEC3', '\uFEC4'], // Taa
        '\u0639': ['\uFEC9', '\uFECA', '\uFECB', '\uFECC'], // Ain
        '\u0641': ['\uFED1', '\uFED2', '\uFED3', '\uFED4'], // Fa
        '\u0642': ['\uFED5', '\uFED6', '\uFED7', '\uFED8'], // Qaf
        '\u0643': ['\uFED9', '\uFEDA', '\uFEDB', '\uFEDC'], // Kaf
        '\u0644': ['\uFEDD', '\uFEDE', '\uFEDF', '\uFEE0'], // Lam
        '\u0645': ['\uFEE1', '\uFEE2', '\uFEE3', '\uFEE4'], // Meem
        '\u0646': ['\uFEE5', '\uFEE6', '\uFEE7', '\uFEE8'], // Noon
        '\u0647': ['\uFEE9', '\uFEEA', '\uFEEB', '\uFEEC'], // Heh
        '\u0648': ['\uFEED', '\uFEEE', '\uFEED', '\uFEEE'], // Waw
        '\u064A': ['\uFEF1', '\uFEF2', '\uFEF3', '\uFEF4'], // Yeh
    };

    if (!/[\u0600-\u06FF]/.test(text)) return text;

    let output = "";
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        const forms = charMap[ch];
        if (!forms) { output += ch; continue; }
        const prev = text[i - 1], next = text[i + 1];
        if (prev && charMap[prev] && next && charMap[next]) output += forms[3]; // Medial
        else if (prev && charMap[prev]) output += forms[1]; // Final
        else if (next && charMap[next]) output += forms[2]; // Initial
        else output += forms[0]; // Isolated
    }
    return "\u202B" + output + "\u202C"; // Add RTL direction markers
}

// ========== 2. HELPERS (Timing) ==========
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

// ========== 3. MAIN API EXPORT ==========
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoPublicId, subtitles, subtitleFontSize, subtitleColor, playbackSpeed, cloud_name, api_key, api_secret } = body;

    cloudinary.config({ cloud_name, api_key, api_secret, secure: true });

    if (!videoPublicId || !subtitles) return NextResponse.json({ success: false }, { status: 400 });

    const speedMultiplier = playbackSpeed || 1.0;

    // Reshape text so Arabic letters join correctly and boxes disappear
    const adjustedSubtitles = subtitles.map((sub: any) => ({
      ...sub,
      text: reshapeArabic(sub.text),
      startTime: msToTime(timeToMs(sub.startTime) / speedMultiplier),
      endTime: msToTime(timeToMs(sub.endTime) / speedMultiplier),
    }));

    const vttContent = formatVtt(adjustedSubtitles);
    const vttPublicId = `subtitles-${Date.now()}`;
    
    await cloudinary.uploader.upload(`data:text/vtt;base64,${Buffer.from(vttContent).toString('base64')}`, {
      resource_type: 'raw',
      public_id: vttPublicId,
    });

    // FIX: Convert #FFFFFF to rgb:FFFFFF to prevent 400 Broken Video error
    const cleanColor = (subtitleColor || "#FFFFFF").replace("#", "rgb:");

    const transformationParams: any = {
      overlay: {
        resource_type: 'subtitles',
        public_id: `${vttPublicId}.vtt`,
        font_family: 'Arial', // Arial works perfectly once text is reshaped
        font_size: Math.round((subtitleFontSize || 18) * 2.2),
      },
      color: cleanColor,
      flags: 'layer_apply',
      gravity: 'south',
      y: 80,
    };

    const finalUrl = cloudinary.url(videoPublicId, {
      resource_type: 'video',
      transformation: [
        { effect: `accelerate:${Math.round((speedMultiplier - 1) * 100)}` },
        transformationParams
      ],
      format: 'mp4',
      sign_url: true, 
    });

    return NextResponse.json({ success: true, downloadUrl: finalUrl });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal Error' }, { status: 500 });
  }
}
