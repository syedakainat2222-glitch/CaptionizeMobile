'use client';

import React from 'react';
import Draggable from 'react-draggable';
import type { Subtitle } from '@/lib/srt';

type DraggableSubtitlesProps = {
  subtitles: Subtitle[];
  currentTime: number;
  activeSubtitleId: number | null;
  onPositionChange: (id: number, x: number, y: number) => void;
  videoWidth: number;
  videoHeight: number;
};

// Helper function to convert time string to seconds
const timeToSeconds = (time: string): number => {
  const parts = time.split(':');
  const secondsParts = parts[2].split(',');
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const seconds = parseInt(secondsParts[0], 10);
  const milliseconds = parseInt(secondsParts[1], 10);
  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
};

const DraggableSubtitles: React.FC<DraggableSubtitlesProps> = ({
  subtitles,
  currentTime,
  activeSubtitleId,
  onPositionChange,
  videoWidth,
  videoHeight,
}) => {
  const activeSubtitle = subtitles.find(
    (sub) => timeToSeconds(sub.startTime) <= currentTime && timeToSeconds(sub.endTime) >= currentTime
  );

  const handleStop = (e, data) => {
    if (activeSubtitle && videoWidth > 0 && videoHeight > 0) {
      const x = Math.round((data.x / videoWidth) * 100);
      const y = Math.round((data.y / videoHeight) * 100);
      onPositionChange(activeSubtitle.id, x, y);
    }
  };

  if (!activeSubtitle) {
    return null;
  }

  // Ensure positionX and positionY are treated as numbers
  const positionX = typeof activeSubtitle.positionX === 'number' ? activeSubtitle.positionX : 50;
  const positionY = typeof activeSubtitle.positionY === 'number' ? activeSubtitle.positionY : 100;


  const defaultX = (positionX / 100) * videoWidth;
  const defaultY = (positionY / 100) * videoHeight - 50;


  return (
    <Draggable
      bounds="parent"
      onStop={handleStop}
      defaultPosition={{x: defaultX, y: defaultY}}
      key={activeSubtitle.id}
    >
      <div
        className={`absolute text-center pointer-events-auto cursor-move ${
          activeSubtitleId === activeSubtitle.id ? 'border-2 border-blue-500' : ''
        }`}
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          color: 'white',
          padding: '8px',
          borderRadius: '6px',
          fontSize: '18px',
          left: 0,
          top: 0,
        }}
      >
        {activeSubtitle.text}
      </div>
    </Draggable>
  );
};

export default DraggableSubtitles;
