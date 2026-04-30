import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { formatVtt } from '@/lib/srt';

// ========== 1. ADVANCED ARABIC RESHAPER (Fixes Joining & Missing Words) ==========
const arabicCharMap: Record<string, [string, string, string, string]> = {
    '\u0621': ['\uFE80', '\uFE80', '\uFE80', '\uFE80'], // Hamza
    '\u0622': ['\uFE81', '\uFE82', '\uFE81', '\uFE82'], // Alef with madda
    '\u0623': ['\uFE83', '\uFE84', '\uFE83', '\uFE84'], // Alef with hamza above
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
    '\u0629': ['\uFE93', '\uFE94', '\uFE93', '\uFE94'], // Ta Marbuta
};

function reshapeArabic(text: string): string {
    if (!/[\u0600-\u06FF]/.test(text)) return text;
    let output = "";
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        const forms = arabicCharMap[ch];
        if (!forms) { output += ch; continue; }
        const prev = text[i - 1], next = text[i + 1];
        if (prev && arabicCharMap[prev] && next && arabicCharMap[next]) output += forms[3];
        else if (prev && arabicCharMap[prev]) output += forms[1];
        else if (next && arabicCharMap[next]) output += forms[2];
        else output += forms[0];
    }
    return "\u202B" + output + "\u202C";
}

// ========== 2. TIMING HELPERS ==========
const timeToMs = (t: string) => {
    const [h, m, s_ms] = t.split(':');
    const [s, ms] = s_ms.split(',');
    return parseInt(h) * 3600000 + parseInt(m) * 60000 + parseInt(s) * 1000 + parseInt(ms);
};
const msToTime = (ms: number) => {
    const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000), mss = Math.floor(ms % 1000);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${mss.toString().padStart(3, '0')}`;
};

// ========== 3. MAIN API ==========
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { videoPublicId, subtitles, subtitleFont, subtitleFontSize, subtitleColor, playbackSpeed, cloud_name, api_key, api_secret } = body;

        cloudinary.config({ cloud_name, api_key, api_secret, secure: true });

        const speedMultiplier = playbackSpeed || 1.0;
        const processedSubs = subtitles.map((s: any) => ({
            ...s,
            text: reshapeArabic(s.text),
            startTime: msToTime(timeToMs(s.startTime) / speedMultiplier),
            endTime: msToTime(timeToMs(s.endTime) / speedMultiplier),
        }));

        const vttUpload = await cloudinary.uploader.upload(`data:text/vtt;base64,${Buffer.from(formatVtt(processedSubs)).toString('base64')}`, {
            resource_type: 'raw', public_id: `subtitles-${Date.now()}`, format: 'vtt'
        });

        // --- CUSTOM FONT MAPPING (Uses the file your app uploaded) ---
        let primaryFont = 'Arial';
        const requested = subtitleFont ? subtitleFont.split(',')[0].trim() : '';
        
        if (requested === 'Cairo') primaryFont = 'cairo-bold'; // References uploaded cairo.ttf
        else if (requested === 'Changa') primaryFont = 'changa-bold';
        else if (requested === 'Noto Urdu') primaryFont = 'noto-urdu';
        else primaryFont = 'Arial';

        const finalUrl = cloudinary.url(videoPublicId, {
            resource_type: 'video',
            transformation: [
                { effect: `accelerate:${Math.round((speedMultiplier - 1) * 100)}` },
                {
                    overlay: { resource_type: 'subtitles', public_id: `${vttUpload.public_id}.vtt`, font_family: primaryFont, font_size: Math.round(subtitleFontSize * 2.2) },
                    color: (subtitleColor || "#FFFFFF").replace("#", "rgb:"),
                    gravity: 'south', y: 120, flags: 'layer_apply'
                }
            ],
            format: 'mp4', sign_url: true
        });

        return NextResponse.json({ success: true, downloadUrl: finalUrl });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
