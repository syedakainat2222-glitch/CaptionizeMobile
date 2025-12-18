'use client';

import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Play, Pause, Scissors, Undo, Redo, ZoomIn, ZoomOut, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Subtitle } from '@/lib/srt';
import { formatTime } from '@/lib/utils';
import MobileVideoThumbnails from './MobileVideoThumbnails';
import MobileAudioWaveform from './MobileAudioWaveform';

// Helper to convert VTT time to seconds
const vttTimeToSeconds = (vttTime: string | undefined): number => {
  if (!vttTime) return 0;
  const parts = vttTime.split(':');
  if (parts.length === 3) {
    return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseFloat(parts[2]);
  }
  if (parts.length === 2) {
    return parseInt(parts[0]) * 60 + parseFloat(parts[1]);
  }
  return 0;
};

const secondsToVtt = (seconds: number): string => {
  const date = new Date(0);
  date.setSeconds(seconds);
  return date.toISOString().substr(11, 12);
};

type MobileTimelineEditorProps = {
  videoRef: React.RefObject<HTMLVideoElement>;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  subtitles: Subtitle[];
  onSplit: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  activeSubtitleId: number | null;
  onDeleteSubtitle: (id: number) => void;
  onUpdateSubtitleTime: (id: number, startTime: string, endTime: string) => void;
  videoPublicId: string;
};

const MobileTimelineEditor = ({ 
  videoRef,
  isPlaying, 
  currentTime, 
  duration, 
  onPlayPause, 
  onSeek,
  subtitles,
  onSplit,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  activeSubtitleId,
  onDeleteSubtitle,
  onUpdateSubtitleTime,
  videoPublicId,
}: MobileTimelineEditorProps) => {
  const [zoomLevel, setZoomLevel] = useState(1);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<{subId: number, type: 'start' | 'end' | 'move', startX: number, initialStart: number, initialEnd: number} | null>(null);
  const [tempSubtitles, setTempSubtitles] = useState<Subtitle[]>(subtitles);

  useEffect(() => {
    setTempSubtitles(subtitles);
  }, [subtitles]);

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev * 1.5, 5));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev / 1.5, 0.5));

  const timelineWidth = useMemo(() => duration * 20 * zoomLevel, [duration, zoomLevel]);

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (timelineRef.current) {
      const rect = timelineRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const time = (clickX / timelineWidth) * duration;
      onSeek(time);
    }
  };

  const handleDeleteClick = () => {
    if (activeSubtitleId !== null) {
      onDeleteSubtitle(activeSubtitleId);
    }
  };

  const handlePlayPauseClick = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent, subId: number, type: 'start' | 'end' | 'move') => {
    e.stopPropagation();
    const sub = subtitles.find(s => s.id === subId);
    if (sub && timelineRef.current) {
      setDragging({
        subId,
        type,
        startX: e.clientX,
        initialStart: vttTimeToSeconds(sub.startTime),
        initialEnd: vttTimeToSeconds(sub.endTime),
      });
    }
  };

  const handleMouseUp = useCallback(() => {
    if (dragging) {
      const sub = tempSubtitles.find(s => s.id === dragging.subId);
      if (sub) {
        onUpdateSubtitleTime(sub.id, sub.startTime, sub.endTime);
      }
      setDragging(null);
    }
  }, [dragging, tempSubtitles, onUpdateSubtitleTime]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging || !timelineRef.current) return;

    const timelineRect = timelineRef.current.getBoundingClientRect();
    const deltaX = e.clientX - dragging.startX;
    const deltaTime = (deltaX / timelineWidth) * duration;

    setTempSubtitles(currentSubs => currentSubs.map(sub => {
      if (sub.id === dragging.subId) {
        let newStartSec = vttTimeToSeconds(sub.startTime);
        let newEndSec = vttTimeToSeconds(sub.endTime);

        if (dragging.type === 'start') {
          newStartSec = Math.max(0, dragging.initialStart + deltaTime);
          if (newStartSec >= newEndSec) newStartSec = newEndSec - 0.1;
        } else if (dragging.type === 'end') {
          newEndSec = Math.min(duration, dragging.initialEnd + deltaTime);
          if (newEndSec <= newStartSec) newEndSec = newStartSec + 0.1;
        } else if (dragging.type === 'move') {
          const subDuration = dragging.initialEnd - dragging.initialStart;
          newStartSec = Math.max(0, dragging.initialStart + deltaTime);
          newEndSec = Math.min(duration, newStartSec + subDuration);
          if (newEndSec - newStartSec < subDuration - 0.01) {
            newStartSec = newEndSec - subDuration;
          }
        }
        return { ...sub, startTime: secondsToVtt(newStartSec), endTime: secondsToVtt(newEndSec) };
      }
      return sub;
    }));
  }, [dragging, timelineWidth, duration]);

  useEffect(() => {
    if (dragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, handleMouseMove, handleMouseUp]);

  const displaySubtitles = dragging ? tempSubtitles : subtitles;

  return (
    <div className="bg-gray-900 border border-gray-700 text-white p-2 rounded-lg flex flex-col gap-1">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 px-1 py-0.5 bg-gray-800 rounded">
        <div className="flex items-center gap-1">
          <button
            className="p-1.5 rounded-md hover:bg-gray-700 transition-colors"
            onClick={handlePlayPauseClick}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <Button variant="ghost" size="icon" onClick={handleZoomOut} disabled={zoomLevel <= 0.5} className="h-7 w-7">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleZoomIn} disabled={zoomLevel >= 5} className="h-7 w-7">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="ghost" className="px-2 py-1 h-7" onClick={onSplit} disabled={activeSubtitleId === null}>
            <Scissors className="mr-1 h-3 w-3" /> <span className="text-xs">Split</span>
          </Button>
          <Button variant="ghost" className="px-2 py-1 h-7" onClick={onUndo} disabled={!canUndo}>
            <Undo className="mr-1 h-3 w-3" /> <span className="text-xs">Undo</span>
          </Button>
          <Button variant="ghost" className="px-2 py-1 h-7" onClick={onRedo} disabled={!canRedo}>
            <Redo className="mr-1 h-3 w-3" /> <span className="text-xs">Redo</span>
          </Button>
          <Button variant="ghost" className="px-2 py-1 h-7" onClick={handleDeleteClick} disabled={activeSubtitleId === null}>
            <Trash2 className="mr-1 h-3 w-3" /> <span className="text-xs">Delete</span>
          </Button>
        </div>
        <div className="text-xs font-mono bg-black px-1.5 py-0.5 rounded">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>

      {/* Timeline with Ruler and Playhead */}
      <div 
        className="relative w-full overflow-x-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800" 
        onClick={handleTimelineClick} 
        ref={timelineRef}
      >
        <div style={{ width: `${timelineWidth}px` }} className="relative h-full">
          {/* Ruler */}
          <div className="relative h-5 text-xs text-gray-400">
            {[...Array(Math.floor(duration / 2) + 1)].map((_, i) => (
              <div key={i} style={{ left: `${(i * 2) * (20 * zoomLevel)}px` }} className="absolute top-0 flex flex-col items-start">
                <span className="text-xxs">{formatTime(i*2)}</span>
                <div className="h-2 w-px bg-gray-500"/>
              </div>
            ))}
          </div>

          {/* Playhead */}
          <div style={{ left: `${(currentTime / duration) * 100}%` }} className="absolute top-0 w-0.5 h-full bg-white z-20 cursor-pointer">
            <div className="absolute top-3 -left-1 w-3 h-3 bg-white rounded-full border border-gray-900"></div>
          </div>

          {/* Tracks Container*/}
          <div className="flex flex-col gap-y-1 pt-1 relative">
            {/* Subtitle Track */}
            <div className="h-10 bg-transparent rounded-md relative">
              {displaySubtitles.map(sub => {
                const start = vttTimeToSeconds(sub.startTime);
                const end = vttTimeToSeconds(sub.endTime);
                const left = (start / duration) * 100;
                const width = ((end - start) / duration) * 100;
                return (
                  <div key={sub.id} style={{ left: `${left}%`, width: `${width}%` }} className="absolute h-full flex items-center group">
                    <div 
                      onMouseDown={(e) => handleMouseDown(e, sub.id, 'start')} 
                      className="absolute left-0 w-2 h-full bg-yellow-700 cursor-ew-resize rounded-l-md opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    ></div>
                    <div 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        onSeek(start); 
                      }} 
                      onMouseDown={(e) => handleMouseDown(e, sub.id, 'move')} 
                      className={`bg-yellow-500 text-black text-xs h-8 flex items-center px-1.5 rounded cursor-pointer w-full overflow-hidden whitespace-nowrap ${sub.id === activeSubtitleId ? 'border-2 border-white' : ''}`}
                    >
                      {sub.text}
                    </div>
                    <div 
                      onMouseDown={(e) => handleMouseDown(e, sub.id, 'end')} 
                      className="absolute right-0 w-2 h-full bg-yellow-700 cursor-ew-resize rounded-r-md opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    ></div>
                  </div>
                );
              })}
            </div>
            <MobileVideoThumbnails videoPublicId={videoPublicId} duration={duration} timelineWidth={timelineWidth} />
            <MobileAudioWaveform videoPublicId={videoPublicId} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileTimelineEditor;
