export interface Subtitle {
    id: number;
    startTime: string;
    endTime: string;
    text: string;
  }
  
  export const parseSrt = (srt: string): Subtitle[] => {
    const subtitles: Subtitle[] = [];
    
    // Remove any metadata and split by double newlines
    const cleanSrt = srt.replace(/^\uFEFF/, '').trim(); // Remove BOM if present
    const blocks = cleanSrt.split(/\n\s*\n/);
    let idCounter = 1;
  
    for (const block of blocks) {
      const lines = block.split('\n').filter(line => line.trim());
      
      if (lines.length >= 3) {
        const timeMatch = lines[1].match(/(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})/);
        
        if (timeMatch) {
          const text = lines.slice(2).join('\n').trim();
          
          subtitles.push({
            id: idCounter++,
            startTime: timeMatch[1].replace(',', '.'),
            endTime: timeMatch[2].replace(',', '.'),
            text: text
          });
        }
      }
    }
  
    return subtitles;
  };

  const containsArabic = (subtitles: Subtitle[]): boolean => {
    const arabicRegex = /[\u0600-\u06FF]/;
    return subtitles.some(sub => arabicRegex.test(sub.text));
  };
  
  export const formatVtt = (subtitles: Subtitle[], fontFamily?: string): string => {
    const formatTimestamp = (time: string): string => {
      time = time.replace(',', '.');
      const [base, ms = '000'] = time.split('.');
      const paddedMs = ms.padEnd(3, '0').substring(0, 3);
      return `${base}.${paddedMs}`;
    };
  
    const vttLines = ['WEBVTT', ''];
    const styleProperties: string[] = [];
    const isRtl = containsArabic(subtitles);

    if (fontFamily) {
      styleProperties.push(`  font-family: "${fontFamily}", sans-serif;`);
    }

    if (isRtl) {
      styleProperties.push('  direction: rtl;');
      styleProperties.push('  unicode-bidi: embed;');
    }

    if (styleProperties.length > 0) {
      vttLines.push('STYLE', '::cue {', ...styleProperties, '}', '');
    }
    
    subtitles.forEach((sub) => {
      const startTime = formatTimestamp(sub.startTime);
      const endTime = formatTimestamp(sub.endTime);
      
      vttLines.push(
        sub.id.toString(),
        `${startTime} --> ${endTime}`,
        sub.text,
        ''
      );
    });
  
    return vttLines.join('\n');
  };