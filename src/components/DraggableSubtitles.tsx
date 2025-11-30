'use client';

import React from 'react';
import Draggable, { DraggableData, DraggableEvent } from 'react-draggable';
import type { Subtitle } from '@/lib/srt';

type DraggableSubtitlesProps = {
  subtitles: Subtitle[];
  currentTime: number;
  activeSubtitleId: number | null;
  onPositionChange: (id: number, x: number, y: number) => void;
  videoWidth: number;
  videoHeight: number;
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
    (sub) => sub.startTime <= currentTime && sub.endTime >= currentTime
  );

  const handleStop = (e: DraggableEvent, data: DraggableData) => {
    if (activeSubtitle && videoWidth > 0 && videoHeight > 0) {
      const x = Math.round((data.x / videoWidth) * 100);
      const y = Math.round((data.y / videoHeight) * 100);
      onPositionChange(activeSubtitle.id, x, y);
    }
  };

  if (!activeSubtitle) {
    return null;
  }

  const defaultX = activeSubtitle.positionX !== undefined ? (activeSubtitle.positionX / 100) * videoWidth : videoWidth / 2;
  const defaultY = activeSubtitle.positionY !== undefined ? (activeSubtitle.positionY / 100) * videoHeight : videoHeight - 50;

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
