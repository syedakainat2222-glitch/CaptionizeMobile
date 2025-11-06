'use client';

import { useRef, useEffect, useState, memo } from 'react';
import { Card } from '@/components/ui/card';
import type { Subtitle } from '@/lib/srt';
import { formatVtt } from '@/lib/srt';
import { cn } from '@/lib/utils';

type VideoPlayerProps = {
  videoUrl: string;
  subtitles: Subtitle[];
  onTimeUpdate: (time: number) => void;
  activeSubtitleId: number | null;
  subtitleFont: string;
  subtitleFontSize: number;
  subtitleColor: string;
};

const VideoPlayer = ({
  videoUrl,
  subtitles,
  onTimeUpdate,
  activeSubtitleId,
  subtitleFont,
  subtitleFontSize,
  subtitleColor,
}: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [vttUrl, setVttUrl] = useState<string | null>(null);

  const activeSubtitle = subtitles.find((sub) => sub.id === activeSubtitleId);

  useEffect(() => {
    let objectUrl: string | null = null;
    if (subtitles.length > 0) {
      const vttContent = formatVtt(subtitles);
      const blob = new Blob([vttContent], { type: 'text/vtt' });
      objectUrl = URL.createObjectURL(blob);
      setVttUrl(objectUrl);
    }
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [subtitles]);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const handleTimeUpdateEvent = () => {
      onTimeUpdate(videoElement.currentTime);
    };

    videoElement.addEventListener('timeupdate', handleTimeUpdateEvent);

    return () => {
      if (videoElement) {
        videoElement.removeEventListener('timeupdate', handleTimeUpdateEvent);
      }
    };
  }, [onTimeUpdate]);

  const handleLoadedMetadata = () => {
    if (videoRef.current && videoRef.current.textTracks.length > 0) {
      videoRef.current.textTracks[0].mode = 'hidden';
    }
  };

  return (
    <Card className="overflow-hidden shadow-lg relative">
      <div className="aspect-video w-full bg-black relative">
        <video
          ref={videoRef}
          key={videoUrl}
          controls
          crossOrigin="anonymous"
          className="h-full w-full"
          onLoadedMetadata={handleLoadedMetadata}
        >
          <source src={videoUrl} type="video/mp4" />
          {vttUrl && (
            <track
              label="English"
              kind="subtitles"
              srcLang="en"
              src={vttUrl}
              default
            />
          )}
          Your browser does not support the video tag.
        </video>

        {/* Custom Subtitle Overlay */}
        <div
          className={cn(
            'absolute bottom-5 md:bottom-10 left-1/2 -translate-x-1/2 w-full px-4 text-center transition-opacity duration-300',
            activeSubtitle ? 'opacity-100' : 'opacity-0'
          )}
          style={{ pointerEvents: 'none' }}
        >
          {activeSubtitle && (
            <p
              style={{
                fontFamily: subtitleFont,
                fontSize: `${subtitleFontSize}px`,
                color: subtitleColor,
                textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
              }}
            >
              {activeSubtitle.text}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
};

export default memo(VideoPlayer);
