import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { formatVtt } from '@/lib/srt';

// ========== HELPER FUNCTIONS ==========
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

// ========== MANUAL ARABIC RESHAPER (No external libraries) ==========
// Maps Arabic characters to their presentation forms based on context.
// Handles isolated, initial, medial, and final forms.
function reshapeArabic(text: string): string {
  // Return early if no Arabic characters
  if (!/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(text)) return text;

  // Character mapping tables: isolated, final, initial, medial
  // Only common Arabic letters mapped; for full coverage, extend as needed.
  const arabicMap: Record<string, [string, string, string, string]> = {
    // Alef
    '\u0627': ['\uFE8D', '\uFE8E', '\uFE8D', '\uFE8D'], // ا
    // Ba
    '\u0628': ['\uFE8F', '\uFE90', '\uFE91', '\uFE92'], // ب
    // Ta
    '\u062A': ['\uFE95', '\uFE96', '\uFE97', '\uFE98'], // ت
    // Tha
    '\u062B': ['\uFE99', '\uFE9A', '\uFE9B', '\uFE9C'], // ث
    // Jeem
    '\u062C': ['\uFE9D', '\uFE9E', '\uFE9F', '\uFEA0'], // ج
    // Ha (ḥā')
    '\u062D': ['\uFEA1', '\uFEA2', '\uFEA3', '\uFEA4'], // ح
    // Kha
    '\u062E': ['\uFEA5', '\uFEA6', '\uFEA7', '\uFEA8'], // خ
    // Dal
    '\u062F': ['\uFEA9', '\uFEAA', '\uFEA9', '\uFEA9'], // د
    // Thal
    '\u0630': ['\uFEAB', '\uFEAC', '\uFEAB', '\uFEAB'], // ذ
    // Ra
    '\u0631': ['\uFEAD', '\uFEAE', '\uFEAD', '\uFEAD'], // ر
    // Zay
    '\u0632': ['\uFEAF', '\uFEB0', '\uFEAF', '\uFEAF'], // ز
    // Seen
    '\u0633': ['\uFEB1', '\uFEB2', '\uFEB3', '\uFEB4'], // س
    // Sheen
    '\u0634': ['\uFEB5', '\uFEB6', '\uFEB7', '\uFEB8'], // ش
    // Sad
    '\u0635': ['\uFEB9', '\uFEBA', '\uFEBB', '\uFEBC'], // ص
    // Dad
    '\u0636': ['\uFEBD', '\uFEBE', '\uFEBF', '\uFEC0'], // ض
    // Ta (ṭā')
    '\u0637': ['\uFEC1', '\uFEC2', '\uFEC3', '\uFEC4'], // ط
    // Za (ẓā')
    '\u0638': ['\uFEC5', '\uFEC6', '\uFEC7', '\uFEC8'], // ظ
    // Ain
    '\u0639': ['\uFEC9', '\uFECA', '\uFECB', '\uFECC'], // ع
    // Ghain
    '\u063A': ['\uFECD', '\uFECE', '\uFECF', '\uFED0'], // غ
    // Feh (ف)
    '\u0641': ['\uFED1', '\uFED2', '\uFED3', '\uFED4'],
    // Qaf (ق)
    '\u0642': ['\uFED5', '\uFED6', '\uFED7', '\uFED8'],
    // Kaf (ك)
    '\u0643': ['\uFED9', '\uFEDA', '\uFEDB', '\uFEDC'],
    // Lam (ل)
    '\u0644': ['\uFEDD', '\uFEDE', '\uFEDF', '\uFEE0'],
    // Meem (م)
    '\u0645': ['\uFEE1', '\uFEE2', '\uFEE3', '\uFEE4'],
    // Noon (ن)
    '\u0646': ['\uFEE5', '\uFEE6', '\uFEE7', '\uFEE8'],
    // Heh (ه)
    '\u0647': ['\uFEE9', '\uFEEA', '\uFEEB', '\uFEEC'],
    // Waw (و)
    '\u0648': ['\uFEED', '\uFEEE', '\uFEED', '\uFEED'],
    // Yeh (ي)
    '\u064A': ['\uFEF1', '\uFEF2', '\uFEF3', '\uFEF4'],
    // Alef Maqsura (ى)
    '\u0649': ['\uFEEF', '\uFEF0', '\uFEEF', '\uFEEF'],
  };

  // Also add tashkeel (diacritics) – keep as is
  const result: string[] = [];
  const chars = [...text]; // handle Unicode correctly

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const mapping = arabicMap[ch];
    if (!mapping) {
      result.push(ch);
      continue;
    }
    // Determine position: previous char (i-1) and next char (i+1) are Arabic?
    const prevChar = i > 0 ? chars[i - 1] : null;
    const nextChar = i < chars.length - 1 ? chars[i + 1] : null;
    const prevIsArabic = prevChar && arabicMap[prevChar];
    const nextIsArabic = nextChar && arabicMap[nextChar];

    let form: number;
    if (!prevIsArabic && !nextIsArabic) form = 0;       // isolated
    else if (prevIsArabic && !nextIsArabic) form = 1;   // final
    else if (!prevIsArabic && nextIsArabic) form = 2;   // initial
    else form = 3;                                      // medial

    result.push(mapping[form]);
  }

  // Wrap in RTL embedding to ensure proper direction
  return '\u202B' + result.join('') + '\u202C';
}

// ========== MAIN EXPORT ==========
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      videoPublicId, subtitles, videoName, subtitleFont, subtitleFontSize,
      subtitleColor, subtitleBackgroundColor,
      isBold, isItalic, isUnderline, playbackSpeed,
      cloud_name, api_key, api_secret
    } = body;

    // Configure Cloudinary
    cloudinary.config({
      cloud_name: cloud_name || process.env.CLOUDINARY_CLOUD_NAME,
      api_key: api_key || process.env.CLOUDINARY_API_KEY,
      api_secret: api_secret || process.env.CLOUDINARY_API_SECRET,
      secure: true
    });

    if (!videoPublicId || !subtitles) {
      return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
    }

    // Adjust subtitles for playback speed and reshape Arabic text
    const speedMultiplier = playbackSpeed || 1.0;
    const adjustedSubtitles = subtitles.map((sub: any) => ({
      ...sub,
      text: reshapeArabic(sub.text),   // ✅ Apply reshaping here
      startTime: msToTime(timeToMs(sub.startTime) / speedMultiplier),
      endTime: msToTime(timeToMs(sub.endTime) / speedMultiplier),
    }));

    // Generate VTT content
    const vttContent = formatVtt(adjustedSubtitles);
    const vttBase64 = Buffer.from(vttContent, 'utf-8').toString('base64');
    const vttDataUri = `data:text/vtt;charset=utf-8;base64,${vttBase64}`;

    // Upload VTT: public_id WITHOUT extension, format 'vtt'
    const vttPublicId = `subtitles-${Date.now()}`;
    await cloudinary.uploader.upload(vttDataUri, {
      resource_type: 'raw',
      public_id: vttPublicId,
      format: 'vtt',
      overwrite: true,
    });

    // ========== FONT SELECTION ==========
    // Use Arial as default (reshaped text will look joined)
    let primaryFont = 'Arial';
    const requestedFont = subtitleFont ? subtitleFont.split(',')[0].trim() : '';

    switch (requestedFont) {
      case 'Cairo':
      case 'Changa':
      case 'Noto Urdu':
        // For Arabic/Urdu, Arial works perfectly after reshaping
        primaryFont = 'Arial';
        break;
      case 'Pacifico':
        primaryFont = 'Pacifico';
        break;
      case 'Dancing Script':
        primaryFont = 'Dancing Script';
        break;
      case 'Roboto':
        primaryFont = 'Roboto';
        break;
      case 'Serif':
        primaryFont = 'Times';
        break;
      case 'Monospace':
        primaryFont = 'Courier';
        break;
      default:
        primaryFont = 'Arial';
    }

    // Parse background color (if used)
    const { color: bgColor, opacity: bgOpacity } = parseRgba(subtitleBackgroundColor || 'transparent');

    // Size multiplier 2.0, position y=120 (above BBC logo)
    const scaledSize = Math.round((subtitleFontSize || 24) * 2.0);
    const yPosition = 120;

    // ✅ Build overlay WITHOUT any border/outline
    const overlayParams: any = {
      overlay: {
        resource_type: 'subtitles',
        public_id: `${vttPublicId}.vtt`,   // Append .vtt here
        font_family: primaryFont,
        font_size: scaledSize,
        font_weight: isBold ? 'bold' : 'normal',
        font_style: isItalic ? 'italic' : 'normal',
        text_decoration: isUnderline ? 'underline' : 'none',
      },
      // ✅ Fix color format: convert #HEX to rgb:HEX
      color: (subtitleColor || '#FFFFFF').replace('#', 'rgb:'),
      flags: 'layer_apply',
      gravity: 'south',
      y: yPosition,
    };

    // Add background only if not transparent
    if (bgColor && bgColor !== 'transparent' && bgOpacity > 0) {
      overlayParams.background = bgColor.replace('#', 'rgb:');
      overlayParams.opacity = bgOpacity;
    }

    // Build full transformation array (speed effect + subtitles)
    const transformations: any[] = [];
    if (speedMultiplier !== 1.0) {
      const speedPercent = Math.round((speedMultiplier - 1) * 100);
      transformations.push({ effect: `accelerate:${speedPercent}` });
    }
    transformations.push(overlayParams);

    // Generate download filename
    const safeFileName = videoName ? videoName.replace(/[^a-z0-9_.-]/gi, '_').split('.')[0] : 'video';
    const filename = `${safeFileName}_with_subtitles.mp4`;

    // Create Cloudinary URL
    const finalUrl = cloudinary.url(videoPublicId, {
      resource_type: 'video',
      transformation: transformations,
      format: 'mp4',
      quality: 'auto',
      sign_url: true,
      attachment: filename,
    });

    return NextResponse.json({ success: true, downloadUrl: finalUrl });

  } catch (error: any) {
    console.error('Subtitle burn-in error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
