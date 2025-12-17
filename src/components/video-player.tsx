'use client';

import { useEffect, useState, memo } from 'react';
import { Card } from '@/components/ui/card';
import type { Subtitle } from '@/lib/srt';
import { formatVtt } from '@/lib/srt';
import { Button } from '@/components/ui/button';

type VideoPlayerProps = {
  videoRef: React.RefObject<HTMLVideoElement>;
  videoUrl: string;
  subtitles: Subtitle[];
  isPlaying: boolean;
  onPlayPause: () => void;
  onTimeUpdate: (time: number) => void;
  onLoadedMetadata: () => void;
  activeSubtitleId: number | null;
};

const VideoPlayer = ({
  videoRef,
  videoUrl,
  subtitles,
  isPlaying,
  onPlayPause,
  onTimeUpdate,
  onLoadedMetadata,
}: VideoPlayerProps) => {
  const [vttUrl, setVttUrl] = useState<string | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const playbackRates = [0.5, 1, 1.5, 2];

  const handlePlaybackRateChange = () => {
    const currentIndex = playbackRates.indexOf(playbackRate);
    setPlaybackRate(playbackRates[(currentIndex + 1) % playbackRates.length]);
  };

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate, videoRef]);

  useEffect(() => {
    const vttContent = formatVtt(subtitles);
    const blob = new Blob([vttContent], { type: 'text/vtt' });
    const url = URL.createObjectURL(blob);
    setVttUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [subtitles]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTime = () => onTimeUpdate(video.currentTime);
    const onPlay = () => !isPlaying && onPlayPause();
    const onPause = () => isPlaying && onPlayPause();

    video.addEventListener('timeupdate', onTime);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('loadedmetadata', onLoadedMetadata);

    if (video.textTracks.length > 0) {
      video.textTracks[0].mode = 'showing';
    }

    return () => {
      video.removeEventListener('timeupdate', onTime);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
    };
  }, [videoRef, isPlaying, onPlayPause, onTimeUpdate, onLoadedMetadata]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    isPlaying ? video.play().catch(() => {}) : video.pause();
  }, [isPlaying, videoRef]);

  return (
    <Card className="relative aspect-video overflow-hidden bg-black">
      <video
        ref={videoRef}
        key={videoUrl}
        crossOrigin="anonymous"
        className="w-full h-full object-contain"
      >
        <source src={videoUrl} type="video/mp4" />
        {vttUrl && (
          <track
            label="Subtitles"
            kind="subtitles"
            srcLang="en"
            src={vttUrl}
            default
          />
        )}
      </video>

      <div className="absolute bottom-2 right-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePlaybackRateChange}
          className="bg-black/60 text-white"
        >
          {playbackRate}x
        </Button>
      </div>
    </Card>
  );
};

export default memo(VideoPlayer);
