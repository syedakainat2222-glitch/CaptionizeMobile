'use client';

import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Play, Pause, Scissors, Undo, Redo, ZoomIn, ZoomOut, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Subtitle } from '@/lib/srt';
import { formatTime } from '@/lib/utils';
import VideoThumbnails from './VideoThumbnails';
import AudioWaveform from './AudioWaveform';

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
}

type TimelineEditorProps = {
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

const TimelineEditor = ({ 
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
  videoPublicId
}: TimelineEditorProps) => {
  const [zoomLevel, setZoomLevel] = useState(1); // 1 = normal, >1 = zoomed in
  const timelineRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<{subId: number, type: 'start' | 'end' | 'move', startX: number, initialStart: number, initialEnd: number} | null>(null);
  const [tempSubtitles, setTempSubtitles] = useState<Subtitle[]>(subtitles);

  useEffect(() => {
    setTempSubtitles(subtitles);
  }, [subtitles]);

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev * 1.5, 10));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev / 1.5, 1));

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
  }

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
    <div className="bg-gray-900 border border-gray-700 text-white p-4 rounded-lg mt-4 flex flex-col gap-2">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 px-2 py-1 bg-gray-800 rounded">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onPlayPause}>
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={handleZoomOut} disabled={zoomLevel <= 1}><ZoomOut className="h-5 w-5" /></Button>
          <div className="w-32 h-2 bg-gray-600 rounded-full"></div>
          <Button variant="ghost" size="icon" onClick={handleZoomIn} disabled={zoomLevel >= 10}><ZoomIn className="h-5 w-5" /></Button>
          <Button variant="ghost" className="px-3" onClick={onSplit} disabled={activeSubtitleId === null}><Scissors className="mr-2 h-4 w-4" /> Split</Button>
          <Button variant="ghost" className="px-3" onClick={onUndo} disabled={!canUndo}><Undo className="mr-2 h-4 w-4" /> Undo</Button>
          <Button variant="ghost" className="px-3" onClick={onRedo} disabled={!canRedo}><Redo className="mr-2 h-4 w-4" /> Redo</Button>
          <Button variant="ghost" className="px-3" onClick={handleDeleteClick} disabled={activeSubtitleId === null}><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>
        </div>
        <div className="text-sm font-mono bg-black px-2 py-1 rounded">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>

      {/* Timeline with Ruler and Playhead */}
      <div className="relative w-full overflow-x-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800" onClick={handleTimelineClick} ref={timelineRef}>
        <div style={{ width: `${timelineWidth}px`}} className="relative h-full">
            {/* Ruler */}
            <div className="relative h-6 text-xs text-gray-400">
              {[...Array(Math.floor(duration / 2) + 1)].map((_, i) => (
                <div key={i} style={{ left: `${(i * 2) * (20 * zoomLevel)}px` }} className="absolute top-0 flex flex-col items-start">
                  <span>{formatTime(i*2)}</span>
                  <div className="h-2 w-px bg-gray-500"/>
                </div>
              ))}
            </div>

            {/* Playhead */}
            <div style={{ left: `${(currentTime / duration) * 100}%` }} className="absolute top-0 w-0.5 h-full bg-white z-20 cursor-pointer">
                <div className="absolute top-4 -left-1.5 w-4 h-4 bg-white rounded-full border-2 border-gray-900"></div>
            </div>

            {/* Tracks Container*/}
            <div className="flex flex-col gap-y-1 pt-2 relative">
                 {/* Subtitle Track */}
                <div className="h-12 bg-transparent rounded-md relative">
                    {displaySubtitles.map(sub => {
                        const start = vttTimeToSeconds(sub.startTime);
                        const end = vttTimeToSeconds(sub.endTime);
                        const left = (start / duration) * 100;
                        const width = ((end - start) / duration) * 100;
                        return (
                            <div key={sub.id} style={{ left: `${left}%`, width: `${width}%`}} className="absolute h-full flex items-center group">
                                <div 
                                    onMouseDown={(e) => handleMouseDown(e, sub.id, 'start')} 
                                    className="absolute left-0 w-2 h-full bg-yellow-700 cursor-ew-resize rounded-l-md opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                ></div>
                                <div 
                                    onClick={(e) => { e.stopPropagation(); onSeek(start); }} 
                                    onMouseDown={(e) => handleMouseDown(e, sub.id, 'move')} 
                                    className={`bg-yellow-500 text-black text-xs h-10 flex items-center px-2 rounded cursor-pointer w-full overflow-hidden whitespace-nowrap ${sub.id === activeSubtitleId ? 'border-2 border-white' : ''}`}>
                                    {sub.text}
                                </div>
                                <div 
                                    onMouseDown={(e) => handleMouseDown(e, sub.id, 'end')} 
                                    className="absolute right-0 w-2 h-full bg-yellow-700 cursor-ew-resize rounded-r-md opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                ></div>
                            </div>
                        )
                    })}
                </div>
                <VideoThumbnails videoPublicId={videoPublicId} duration={duration} timelineWidth={timelineWidth} />
                <AudioWaveform videoPublicId={videoPublicId} />
            </div>
        </div>
      </div>
    </div>
  );
};

export default TimelineEditor;
