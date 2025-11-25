'use client';

import { useEffect, useState, memo } from 'react';
import { Card } from '@/components/ui/card';
import type { Subtitle } from '@/lib/srt';
import { formatVtt } from '@/lib/srt';

type VideoPlayerProps = {
  videoRef: React.RefObject<HTMLVideoElement>;
  videoUrl: string;
  subtitles: Subtitle[];
  isPlaying: boolean;
  onPlayPause: () => void; // To sync state with parent
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

  useEffect(() => {
    const vttContent = formatVtt(subtitles);
    const blob = new Blob([vttContent], { type: 'text/vtt' });
    const url = URL.createObjectURL(blob);
    setVttUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [subtitles]);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const handleTimeUpdate = () => onTimeUpdate(videoElement.currentTime);
    const handlePlay = () => !isPlaying && onPlayPause();
    const handlePause = () => isPlaying && onPlayPause();

    videoElement.addEventListener('timeupdate', handleTimeUpdate);
    videoElement.addEventListener('play', handlePlay);
    videoElement.addEventListener('pause', handlePause);
    videoElement.addEventListener('loadedmetadata', onLoadedMetadata);
    
    if (videoElement.textTracks.length > 0) {
        videoElement.textTracks[0].mode = 'showing';
    }

    return () => {
      videoElement.removeEventListener('timeupdate', handleTimeUpdate);
      videoElement.removeEventListener('play', handlePlay);
      videoElement.removeEventListener('pause', handlePause);
      videoElement.removeEventListener('loadedmetadata', onLoadedMetadata);
    };
  }, [videoRef, onTimeUpdate, onLoadedMetadata, isPlaying, onPlayPause]);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    if (isPlaying) {
        videoElement.play().catch(error => {
            // Handle interruption errors gracefully, often they are benign
            if (error.name === 'AbortError') {
                console.log('Video play was interrupted, most likely by a pause call.');
            } else {
                console.error('Error playing video:', error);
            }
        });
    } else {
        videoElement.pause();
    }
  }, [isPlaying, videoRef]);

  return (
    <Card className="overflow-hidden shadow-lg relative aspect-video">
      <div className="w-full h-full bg-black">
        <video
          ref={videoRef}
          key={videoUrl} 
          crossOrigin="anonymous"
          className="h-full w-full"
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
          Your browser does not support the video tag.
        </video>
      </div>
    </Card>
  );
};

export default memo(VideoPlayer);
