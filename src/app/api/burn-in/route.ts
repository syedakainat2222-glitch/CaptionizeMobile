import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { formatVtt } from '@/lib/srt';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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
    
    // Destructure all needed fields, including filter/effect
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
      // Filter/effect parameters (sent from Android)
      transformation,
      raw_transformation,
      effect,
      filter,
      cloudinary_effect,
      speed,
      playbackSpeed,
    } = body;

    if (!videoPublicId || !subtitles || !Array.isArray(subtitles)) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid parameters' },
        { status: 400 }
      );
    }

    // 1. Build the subtitle overlay transformation
    const vttContent = formatVtt(subtitles);
    const vttBase64 = Buffer.from(vttContent).toString('base64');
    const vttDataUri = `data:text/vtt;base64,${vttBase64}`;

    const vttUpload = await cloudinary.uploader.upload(vttDataUri, {
      resource_type: 'raw',
      overwrite: true,
      public_id: `subtitles-${Date.now()}`,
    });

    const primaryFont = subtitleFont ? subtitleFont.split(',')[0].trim() : 'Arial';
    const textDecoration = isUnderline ? 'underline' : 'none';
    const { color: bgColor, opacity: bgOpacity } = parseRgba(subtitleBackgroundColor);

    const subtitleTransformation: any = {
      overlay: {
        resource_type: 'subtitles',
        public_id: vttUpload.public_id,
        font_family: primaryFont,
        font_size: subtitleFontSize,
        font_weight: isBold ? 'bold' : 'normal',
        font_style: isItalic ? 'italic' : 'normal',
        text_decoration: textDecoration,
      },
      color: subtitleColor,
      background: bgColor,
      opacity: bgOpacity,
      flags: 'layer_apply',
      gravity: 'south',
      y: 30,
    };

    if (subtitleOutlineColor && subtitleOutlineColor !== 'transparent') {
      const { color: outlineColor } = parseRgba(subtitleOutlineColor);
      subtitleTransformation.border = `2px_solid_${outlineColor.replace('#', 'rgb:')}`;
    }

    // 2. Build the video filter effect (if any)
    // Priority: raw_transformation > transformation > cloudinary_effect > effect/filter
    let filterEffect = '';
    if (raw_transformation && typeof raw_transformation === 'string') {
      filterEffect = raw_transformation;
    } else if (transformation && typeof transformation === 'string') {
      filterEffect = transformation;
    } else if (cloudinary_effect && typeof cloudinary_effect === 'string') {
      filterEffect = cloudinary_effect;
    } else if (effect && typeof effect === 'string' && effect !== '') {
      filterEffect = `e_${effect}`;
    } else if (filter && typeof filter === 'string' && filter !== '') {
      filterEffect = `e_${filter}`;
    }

    // Also handle speed if provided separately (not yet in transformation string)
    const finalSpeed = playbackSpeed ?? speed ?? 1.0;
    const speedEffect = finalSpeed !== 1.0 ? `sp_${finalSpeed}` : '';

    // Combine filter and speed into a single transformation string if needed
    let combinedEffect = '';
    if (filterEffect && speedEffect) {
      combinedEffect = `${filterEffect},${speedEffect}`;
    } else if (filterEffect) {
      combinedEffect = filterEffect;
    } else if (speedEffect) {
      combinedEffect = speedEffect;
    }

    // 3. Build the final transformation array for Cloudinary
    // We need to apply the filter effect BEFORE the subtitles overlay
    // so that the subtitles are rendered on top of the filtered video.
    const transformations: any[] = [];
    
    if (combinedEffect) {
      // If combinedEffect is a string like "e_grayscale" or "e_grayscale,sp_1.5"
      // Cloudinary accepts it as a raw transformation string.
      transformations.push(combinedEffect);
    }
    
    // Then apply the subtitle overlay
    transformations.push(subtitleTransformation);

    const safeFilename = videoName ? videoName.replace(/[^a-z0-9_.-]/gi, '_').split('.')[0] : 'video';
    const filename = `${safeFilename}_with_subtitles.mp4`;

    const finalUrl = cloudinary.url(videoPublicId, {
      resource_type: 'video',
      transformation: transformations,
      format: 'mp4',
      quality: 'auto',
      sign_url: true,
      attachment: filename,
    });

    console.log('Generated URL with filter:', finalUrl);

    return NextResponse.json({ success: true, downloadUrl: finalUrl });

  } catch (error) {
    console.error('=== VIDEO PROCESSING FAILED ===', error);
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 });
  }
}
