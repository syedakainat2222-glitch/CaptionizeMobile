'use client';

import React, { useEffect, useRef } from 'react';
import type { Subtitle } from '@/lib/srt';

type MobileVideoPlayerProps = {
  videoRef: React.RefObject<HTMLVideoElement>;
  videoUrl: string;
  subtitles: Subtitle[];
  onTimeUpdate: (time: number) => void;
  activeSubtitleId: number | null;
  onLoadedMetadata: () => void;
  isPlaying: boolean;
  onPlayPause: () => void;
  subtitleFont: string;
  subtitleFontSize: number;
  subtitleColor: string;
  subtitleOutlineColor: string;
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
};

const MobileVideoPlayer = ({ 
  videoRef, 
  videoUrl, 
  subtitles, 
  onTimeUpdate, 
  activeSubtitleId, 
  onLoadedMetadata,
  isPlaying,
  onPlayPause,
  subtitleFont,
  subtitleFontSize,
  subtitleColor,
  subtitleOutlineColor,
  isBold,
  isItalic,
  isUnderline,
}: MobileVideoPlayerProps) => {
  const activeSubtitleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      onTimeUpdate(video.currentTime);
    };

    const handlePlay = () => {
      if (!isPlaying) onPlayPause();
    };

    const handlePause = () => {
      if (isPlaying) onPlayPause();
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('loadedmetadata', onLoadedMetadata);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
    };
  }, [videoRef, onTimeUpdate, onLoadedMetadata, isPlaying, onPlayPause]);

  useEffect(() => {
    if (activeSubtitleRef.current) {
      activeSubtitleRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }
  }, [activeSubtitleId]);

  const activeSubtitle = subtitles.find(s => s.id === activeSubtitleId);

  const subtitleStyle: React.CSSProperties = {
    fontFamily: subtitleFont,
    fontSize: `${subtitleFontSize}px`,
    color: subtitleColor,
    textShadow: `2px 2px 4px ${subtitleOutlineColor}`,
    fontWeight: isBold ? 'bold' : 'normal',
    fontStyle: isItalic ? 'italic' : 'normal',
    textDecoration: isUnderline ? 'underline' : 'none',
  };

  return (
    <div className="relative w-full h-full bg-black">
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full"
        playsInline
        onClick={onPlayPause}
      />
      {activeSubtitle && (
        <div 
          ref={activeSubtitleRef}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 p-2 bg-black bg-opacity-70 text-white text-center rounded-md"
          style={subtitleStyle}
        >
          {activeSubtitle.text}
        </div>
      )}
    </div>
  );
};

export default MobileVideoPlayer;