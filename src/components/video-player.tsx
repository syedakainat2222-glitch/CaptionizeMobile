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

const VideoPlayer = ({ videoRef, videoUrl, subtitles, isPlaying, onPlayPause, onTimeUpdate, onLoadedMetadata }: VideoPlayerProps) => {
  const [vttUrl, setVttUrl] = useState<string | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const playbackRates = [0.5, 1, 1.5, 2];

  const handlePlaybackRateChange = () => {
    const i = playbackRates.indexOf(playbackRate);
    setPlaybackRate(playbackRates[(i + 1) % playbackRates.length]);
  };

  const isMobile = typeof window !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = playbackRate;
  }, [playbackRate, videoRef]);

  useEffect(() => {
    const vtt = formatVtt(subtitles);
    const blob = new Blob([vtt], { type: 'text/vtt' });
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
    video.addEventListener('loadedmetadata', () => {
      onLoadedMetadata();
      if (video.textTracks.length > 0) video.textTracks[0].mode = 'showing';
    });

    return () => {
      video.removeEventListener('timeupdate', onTime);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
    };
  }, [videoRef, isPlaying, onPlayPause, onTimeUpdate, onLoadedMetadata]);

  useEffect(() => {
    if (isMobile) return; // skip auto-play on mobile
    const video = videoRef.current;
    if (!video) return;
    isPlaying ? video.play().catch(() => {}) : video.pause();
  }, [isPlaying, videoRef, isMobile]);

  return (
    <Card className="relative w-full h-full overflow-hidden">
      <video ref={videoRef} key={videoUrl} crossOrigin="anonymous" playsInline controls={false} className="w-full h-full object-contain bg-black">
        <source src={videoUrl} type="video/mp4" />
        {vttUrl && <track kind="subtitles" srcLang="en" src={vttUrl} default />}
      </video>

      {!isMobile && (
        <div className="absolute bottom-2 right-2">
          <Button variant="outline" size="sm" onClick={handlePlaybackRateChange} className="bg-black/60 text-white">
            {playbackRate}x
          </Button>
        </div>
      )}
    </Card>
  );
};

export default memo(VideoPlayer);
