'use client';

import { useRef, useEffect, useState, memo } from 'react';
import { Card } from '@/components/ui/card';
import type { Subtitle } from '@/lib/srt';
import { formatVtt } from '@/lib/srt';

type VideoPlayerProps = {
  videoUrl: string;
  subtitles: Subtitle[];
  onTimeUpdate: (time: number) => void;
  fontFamily?: string;
};

const VideoPlayer = ({ videoUrl, subtitles, onTimeUpdate, fontFamily }: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [vttUrl, setVttUrl] = useState<string | null>(null);

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
  
  useEffect(() => {
    const styleId = 'subtitle-style';
    let styleElement = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }
    
    // Using a class on the video parent and the ::cue selector
    // to style the subtitles.
    const videoParent = videoRef.current?.parentElement;
    if (videoParent) {
      videoParent.classList.add('custom-cues');
    }
    
    styleElement.textContent = `
      .custom-cues::cue {
        font-family: ${fontFamily || 'inherit'} !important;
      }
    `;

    return () => {
       if (videoParent) {
         videoParent.classList.remove('custom-cues');
       }
    }

  }, [fontFamily]);

  return (
    <Card className="overflow-hidden shadow-lg">
      <div className="aspect-video w-full bg-black">
        <video
          ref={videoRef}
          key={videoUrl}
          controls
          crossOrigin="anonymous"
          className="h-full w-full"
          onLoadedMetadata={() => {
            if (videoRef.current && videoRef.current.textTracks[0]) {
              videoRef.current.textTracks[0].mode = 'showing';
            }
          }}
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
