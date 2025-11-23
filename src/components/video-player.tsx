'use client';

import { useRef, useEffect, useState, memo } from 'react';
import { Card } from '@/components/ui/card';
import type { Subtitle } from '@/lib/srt';
import { formatVtt } from '@/lib/srt';

type VideoPlayerProps = {
  videoUrl: string;
  subtitles: Subtitle[];
  onTimeUpdate: (time: number) => void;
  activeSubtitleId: number | null;
  subtitleFont: string;
  subtitleFontSize: number;
  subtitleColor: string;
  subtitleBackgroundColor: string;
  subtitleOutlineColor: string;
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
};

const VideoPlayer = ({
  videoUrl,
  subtitles,
  onTimeUpdate,
}: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [vttUrl, setVttUrl] = useState<string | null>(null);

  useEffect(() => {
    if (subtitles.length > 0) {
      const vttContent = formatVtt(subtitles);
      const blob = new Blob([vttContent], { type: 'text/vtt' });
      const url = URL.createObjectURL(blob);
      setVttUrl(url);

      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setVttUrl(null);
    }
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
      videoRef.current.textTracks[0].mode = 'showing';
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
      </div>
    </Card>
  );
};

export default memo(VideoPlayer);