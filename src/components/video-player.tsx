'use client';

import { useEffect, useState, memo, useRef } from 'react';
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
  onLoadedMetadata 
}: VideoPlayerProps) => {
  const [vttUrl, setVttUrl] = useState<string | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const playbackRates = [0.5, 1, 1.5, 2];
  const [isMobile, setIsMobile] = useState(false);
  const hasUserInteracted = useRef(false);

  useEffect(() => {
    const mobile = typeof window !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    setIsMobile(mobile);
    
    // Add global click handler to detect user interaction
    const handleGlobalClick = () => {
      hasUserInteracted.current = true;
    };
    
    window.addEventListener('click', handleGlobalClick, { once: true });
    window.addEventListener('touchstart', handleGlobalClick, { once: true });
    
    return () => {
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('touchstart', handleGlobalClick);
    };
  }, []);

  const handlePlaybackRateChange = () => {
    const i = playbackRates.indexOf(playbackRate);
    setPlaybackRate(playbackRates[(i + 1) % playbackRates.length]);
  };

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
      
      // CRITICAL: On mobile, initially mute the video
      if (isMobile) {
        video.muted = true;
        video.playsInline = true;
        
        // Try to play muted video (allowed on mobile)
        video.play().catch(e => {
          console.log('Initial muted play failed:', e);
        });
      }
    });

    // Handle video click for mobile unmute
    const handleVideoClick = () => {
      if (isMobile && video.muted) {
        video.muted = false;
        hasUserInteracted.current = true;
      }
    };

    video.addEventListener('click', handleVideoClick);

    return () => {
      video.removeEventListener('timeupdate', onTime);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('click', handleVideoClick);
    };
  }, [videoRef, isPlaying, onPlayPause, onTimeUpdate, onLoadedMetadata, isMobile]);

  // Handle play/pause for desktop only
  useEffect(() => {
    if (isMobile) {
      // On mobile, only respond if user has interacted
      if (!hasUserInteracted.current) return;
      
      const video = videoRef.current;
      if (!video) return;
      
      // On mobile, after user interaction, we can control playback
      if (isPlaying && hasUserInteracted.current) {
        video.play().catch(err => {
          console.log('Mobile play after interaction failed:', err);
        });
      } else if (!isPlaying) {
        video.pause();
      }
    } else {
      // Desktop logic
      const video = videoRef.current;
      if (!video) return;
      
      if (isPlaying) {
        video.play().catch(err => {
          console.log('Desktop play failed:', err);
        });
      } else {
        video.pause();
      }
    }
  }, [isPlaying, videoRef, isMobile]);

  return (
    <Card className="relative w-full h-full overflow-hidden">
      <video
        ref={videoRef}
        crossOrigin="anonymous"
        playsInline
        controls={false}
        className="w-full h-full object-contain bg-black"
        // Remove key prop to prevent re-renders
      >
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