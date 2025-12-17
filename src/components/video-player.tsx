'use client';

import { useEffect, useState, memo } from 'react';
import type { Subtitle } from '@/lib/srt';
import { formatVtt } from '@/lib/srt';

type Props = {
  videoRef: React.RefObject<HTMLVideoElement>;
  videoUrl: string;
  subtitles: Subtitle[];
  isPlaying: boolean;
  onPlayPause: () => void;
  onTimeUpdate: (t: number) => void;
  onLoadedMetadata: () => void;
};

const VideoPlayer = ({
  videoRef,
  videoUrl,
  subtitles,
  isPlaying,
  onPlayPause,
  onTimeUpdate,
  onLoadedMetadata,
}: Props) => {
  const [vttUrl, setVttUrl] = useState<string>();

  useEffect(() => {
    const blob = new Blob([formatVtt(subtitles)], {
      type: 'text/vtt',
    });
    const url = URL.createObjectURL(blob);
    setVttUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [subtitles]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTime = () => onTimeUpdate(video.currentTime);
    video.addEventListener('timeupdate', onTime);
    video.addEventListener('loadedmetadata', onLoadedMetadata);

    return () => {
      video.removeEventListener('timeupdate', onTime);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
    };
  }, [videoRef, onTimeUpdate, onLoadedMetadata]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    isPlaying ? video.play().catch(() => {}) : video.pause();
  }, [isPlaying, videoRef]);

  return (
    <video
      ref={videoRef}
      src={videoUrl}
      className="w-full h-full object-contain touch-auto"
      controls
      playsInline
      preload="metadata"
    >
      {vttUrl && (
        <track
          kind="subtitles"
          src={vttUrl}
          srcLang="en"
          default
        />
      )}
    </video>
  );
};

export default memo(VideoPlayer);
