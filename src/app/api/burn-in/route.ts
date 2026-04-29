import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// Helper to convert SRT time string (00:00:00,000) to milliseconds
const timeToMs = (timeStr: string) => {
  const [h, m, s_ms] = timeStr.split(':');
  const [s, ms] = s_ms.split(',');
  return parseInt(h) * 3600000 + parseInt(m) * 60000 + parseInt(s) * 1000 + parseInt(ms);
};

// Helper to convert milliseconds back to SRT time string
const msToTime = (totalMs: number) => {
  const h = Math.floor(totalMs / 3600000);
  const m = Math.floor((totalMs % 3600000) / 60000);
  const s = Math.floor((totalMs % 60000) / 1000);
  const ms = Math.floor(totalMs % 1000);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
};

const parseRgba = (rgba: string) => {
  if (!rgba || !rgba.startsWith('rgba')) {
    return { color: rgba || '#FFFFFF', opacity: 100 };
  }
  const match = rgba.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
  if (!match) return { color: '#000000', opacity: 50 };
  const [, r, g, b, a] = match;
  const toHex = (c: string) => parseInt(c).toString(16).padStart(2, '0');
  const color = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  const opacity = Math.round(parseFloat(a) * 100);
  return { color, opacity };
};

// Simple VTT formatter
const formatVttSimple = (subtitles: any[]): string => {
  let vtt = 'WEBVTT\n\n';
  for (const sub of subtitles) {
    vtt += `${sub.startTime} --> ${sub.endTime}\n`;
    vtt += `${sub.text}\n\n`;
  }
  return vtt;
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
      isBold,
      isItalic,
      playbackSpeed,
      cloud_name,
      api_key,
      api_secret
    } = body;

    // Log received parameters (without sensitive data)
    console.log('=== REQUEST PARAMS ===');
    console.log('videoPublicId:', videoPublicId);
    console.log('subtitleFont:', subtitleFont);
    console.log('subtitleFontSize:', subtitleFontSize);
    console.log('playbackSpeed:', playbackSpeed);
    console.log('subtitles count:', subtitles?.length);

    // Configure Cloudinary
    cloudinary.config({
      cloud_name: cloud_name || process.env.CLOUDINARY_CLOUD_NAME,
      api_key: api_key || process.env.CLOUDINARY_API_KEY,
      api_secret: api_secret || process.env.CLOUDINARY_API_SECRET,
      secure: true
    });

    // Verify configuration
    console.log('Cloudinary configured with cloud_name:', cloudinary.config().cloud_name);

    if (!videoPublicId || !subtitles || !Array.isArray(subtitles)) {
      return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
    }

    // TEST: Verify video exists first
    try {
      const videoInfo = await cloudinary.api.resource(videoPublicId, { resource_type: 'video' });
      console.log('Video found:', videoInfo.public_id, 'Format:', videoInfo.format);
    } catch (videoError: any) {
      console.error('VIDEO NOT FOUND:', videoError.message);
      return NextResponse.json({ 
        success: false, 
        error: `Video not found: ${videoPublicId}`,
        details: videoError.message
      }, { status: 404 });
    }

    // Apply playback speed adjustment
    const speedMultiplier = playbackSpeed || 1.0;
    const adjustedSubtitles = subtitles.map((sub: any) => ({
      text: sub.text,
      startTime: msToTime(timeToMs(sub.startTime) / speedMultiplier),
      endTime: msToTime(timeToMs(sub.endTime) / speedMultiplier),
    }));

    // Generate and upload VTT file
    const vttContent = formatVttSimple(adjustedSubtitles);
    console.log('VTT content preview:', vttContent.substring(0, 200));
    
    const vttBase64 = Buffer.from(vttContent, 'utf-8').toString('base64');
    const vttDataUri = `data:text/vtt;charset=utf-8;base64,${vttBase64}`;

    let vttUpload;
    try {
      vttUpload = await cloudinary.uploader.upload(vttDataUri, {
        resource_type: 'raw',
        overwrite: true,
        public_id: `subtitles-${Date.now()}.vtt`,
        content_type: 'text/vtt; charset=utf-8',
      });
      console.log('VTT uploaded successfully:', vttUpload.public_id);
    } catch (vttError: any) {
      console.error('VTT upload failed:', vttError.message);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to upload subtitles',
        details: vttError.message
      }, { status: 500 });
    }

    // Font mapping
    let cloudinaryFont = 'Arial';
    const requestedFont = subtitleFont || 'Arial';
    
    switch (requestedFont) {
      case 'Cairo':
        cloudinaryFont = 'google:Cairo';
        break;
      case 'Changa':
        cloudinaryFont = 'google:Changa';
        break;
      case 'Noto Urdu':
        cloudinaryFont = 'google:Noto Sans Arabic';
        break;
      case 'Pacifico':
        cloudinaryFont = 'google:Pacifico';
        break;
      default:
        cloudinaryFont = 'Arial';
        break;
    }

    console.log(`Font mapping: ${requestedFont} -> ${cloudinaryFont}`);

    // Parse colors
    const { color: bgColor, opacity: bgOpacity } = parseRgba(subtitleBackgroundColor || 'transparent');
    
    // Scale font size
    const baseFontSize = subtitleFontSize || 24;
    const scaledSize = Math.round(baseFontSize * 2.0);
    const verticalPosition = 100;

    // Build the overlay WITHOUT border
    const overlayConfig = {
      overlay: {
        resource_type: 'subtitles',
        public_id: vttUpload.public_id,
        font_family: cloudinaryFont,
        font_size: scaledSize,
        font_weight: isBold ? 'bold' : 'normal',
        font_style: isItalic ? 'italic' : 'normal',
      },
      color: subtitleColor || '#FFFFFF',
      background: bgColor,
      opacity: bgOpacity,
      flags: 'layer_apply',
      gravity: 'south',
      y: verticalPosition,
    };

    // Build transformation - START SIMPLE FIRST
    // Let's try WITHOUT speed effect first to isolate issues
    const transformations: any[] = [overlayConfig];
    
    // Only add speed if not 1.0
    if (speedMultiplier !== 1.0) {
      const speedPercent = Math.round((speedMultiplier - 1) * 100);
      transformations.unshift({ effect: `accelerate:${speedPercent}` });
    }

    // Generate safe filename
    const safeFilename = videoName 
      ? videoName.replace(/[^a-z0-9_.-]/gi, '_').split('.')[0] 
      : 'video';
    const filename = `${safeFilename}_with_subtitles.mp4`;

    // Generate URL using different approach - direct transformation string
    let finalUrl;
    try {
      // Convert transformations to Cloudinary URL format
      const transformationString = transformations.map(t => {
        if (t.overlay) {
          // Handle overlay transformation
          const overlay = t.overlay;
          return `l_${overlay.public_id},co_${t.color.replace('#', '')},b_${overlay.background?.replace('#', '')},o_${t.opacity},fl_layer_apply,g_south,y_${t.y},f_${overlay.font_family.replace(':', '_')},fs_${overlay.font_size},fw_${overlay.font_weight}`;
        } else if (t.effect) {
          // Handle effect
          return `e_${t.effect}`;
        }
        return '';
      }).join('/');
      
      // Build URL manually for debugging
      finalUrl = `https://res.cloudinary.com/${cloudinary.config().cloud_name}/video/upload/${transformationString}/${videoPublicId}.mp4?attachment=${encodeURIComponent(filename)}`;
      
      console.log('Generated URL:', finalUrl);
      
      // Verify URL is accessible
      const urlCheck = await fetch(finalUrl, { method: 'HEAD' });
      console.log('URL check status:', urlCheck.status);
      
      if (!urlCheck.ok) {
        console.warn('URL not accessible, trying alternative approach');
        
        // Fallback: Use cloudinary.url method
        finalUrl = cloudinary.url(videoPublicId, {
          resource_type: 'video',
          transformation: transformations,
          format: 'mp4',
          quality: 'auto',
          sign_url: true,
          attachment: filename,
        });
        
        console.log('Fallback URL:', finalUrl);
      }
      
    } catch (urlError: any) {
      console.error('URL generation error:', urlError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to generate video URL',
        details: urlError.message
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      downloadUrl: finalUrl,
      debug: {
        font: cloudinaryFont,
        fontSize: scaledSize,
        position: verticalPosition,
        vttPublicId: vttUpload.public_id
      }
    });

  } catch (error: any) {
    console.error('=== VIDEO PROCESSING FAILED ===', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Internal Error',
      stack: error.stack
    }, { status: 500 });
  }
}
