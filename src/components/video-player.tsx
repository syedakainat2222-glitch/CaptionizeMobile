'use client';

import { useEffect, useState, memo } from 'react';
import { Card } from '@/components/ui/card';
import type { Subtitle } from '@/lib/srt';
import { formatVtt } from '@/lib/srt';

type VideoPlayerProps = {
  videoRef: React.RefObject<HTMLVideoElement>;
  videoUrl: string;
  subtitles: Subtitle[];
  onTimeUpdate: (time: number) => void;
  onLoadedMetadata: () => void;
  activeSubtitleId: number | null; // This prop is maintained for potential future use, e.g., highlighting
};

const VideoPlayer = ({
  videoRef,
  videoUrl,
  subtitles,
  onTimeUpdate,
  onLoadedMetadata,
}: VideoPlayerProps) => {
  const [vttUrl, setVttUrl] = useState<string | null>(null);

  useEffect(() => {
    // Create a VTT blob URL from the subtitles
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

    // Event listener for time updates
    const handleTimeUpdate = () => onTimeUpdate(videoElement.currentTime);
    videoElement.addEventListener('timeupdate', handleTimeUpdate);

    // Set track mode when metadata is loaded
    const handleMetadata = () => {
      if (videoElement.textTracks.length > 0) {
        videoElement.textTracks[0].mode = 'showing';
      }
      onLoadedMetadata();
    };
    videoElement.addEventListener('loadedmetadata', handleMetadata);

    return () => {
      // Cleanup listeners
      videoElement.removeEventListener('timeupdate', handleTimeUpdate);
      videoElement.removeEventListener('loadedmetadata', handleMetadata);
    };
  }, [videoRef, onTimeUpdate, onLoadedMetadata]);

  return (
    <Card className="overflow-hidden shadow-lg relative aspect-video">
      <div className="w-full h-full bg-black">
        <video
          ref={videoRef}
          key={videoUrl} // Re-mounts the component when videoUrl changes
          crossOrigin="anonymous"
          className="h-full w-full"
          // The `controls` attribute is removed to allow for custom controls via the timeline
        >
          <source src={videoUrl} type="video/mp4" />
          {vttUrl && (
            <track
              label="Subtitles"
              kind="subtitles"
              srcLang="en" // Language can be made dynamic in the future
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