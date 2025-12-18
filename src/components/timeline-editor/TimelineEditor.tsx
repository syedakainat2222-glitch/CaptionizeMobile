'use client';

import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Play, Pause, Scissors, Undo, Redo, ZoomIn, ZoomOut, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Subtitle } from '@/lib/srt';
import { formatTime } from '@/lib/utils';
import VideoThumbnails from './VideoThumbnails';
import AudioWaveform from './AudioWaveform';

const vttTimeToSeconds = (vttTime?: string): number => {
  if (!vttTime) return 0;
  const parts = vttTime.split(':');
  if (parts.length === 3) return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseFloat(parts[2]);
  if (parts.length === 2) return parseInt(parts[0]) * 60 + parseFloat(parts[1]);
  return 0;
};

const secondsToVtt = (seconds: number): string => {
  const date = new Date(0);
  date.setSeconds(seconds);
  return date.toISOString().substr(11, 12);
};

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
  videoPublicId,
}: TimelineEditorProps) => {
  const [zoomLevel, setZoomLevel] = useState(1);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<{
    subId: number;
    type: 'start' | 'end' | 'move';
    startX: number;
    initialStart: number;
    initialEnd: number;
  } | null>(null);
  const [tempSubtitles, setTempSubtitles] = useState<Subtitle[]>(subtitles);

  useEffect(() => setTempSubtitles(subtitles), [subtitles]);

  const timelineWidth = useMemo(() => duration * 20 * zoomLevel, [duration, zoomLevel]);

  const handleZoomIn = () => setZoomLevel(z => Math.min(z * 1.5, 10));
  const handleZoomOut = () => setZoomLevel(z => Math.max(z / 1.5, 1));

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = (x / timelineWidth) * duration;
    onSeek(Math.max(0, Math.min(duration, time)));
  };

  const handleMouseDown = (e: React.MouseEvent, subId: number, type: 'start' | 'end' | 'move') => {
    e.stopPropagation();
    const sub = subtitles.find(s => s.id === subId);
    if (!sub) return;
    setDragging({
      subId,
      type,
      startX: e.clientX,
      initialStart: vttTimeToSeconds(sub.startTime),
      initialEnd: vttTimeToSeconds(sub.endTime),
    });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging) return;
    const deltaX = e.clientX - dragging.startX;
    const deltaTime = (deltaX / timelineWidth) * duration;

    setTempSubtitles(subs =>
      subs.map(sub => {
        if (sub.id !== dragging.subId) return sub;
        let start = vttTimeToSeconds(sub.startTime);
        let end = vttTimeToSeconds(sub.endTime);

        if (dragging.type === 'start') {
          start = Math.max(0, dragging.initialStart + deltaTime);
          if (start >= end) start = end - 0.1;
        }
        if (dragging.type === 'end') {
          end = Math.min(duration, dragging.initialEnd + deltaTime);
          if (end <= start) end = start + 0.1;
        }
        if (dragging.type === 'move') {
          const len = dragging.initialEnd - dragging.initialStart;
          start = Math.max(0, dragging.initialStart + deltaTime);
          end = Math.min(duration, start + len);
        }

        return { ...sub, startTime: secondsToVtt(start), endTime: secondsToVtt(end) };
      })
    );
  }, [dragging, timelineWidth, duration]);

  const handleMouseUp = useCallback(() => {
    if (!dragging) return;
    const sub = tempSubtitles.find(s => s.id === dragging.subId);
    if (sub) onUpdateSubtitleTime(sub.id, sub.startTime, sub.endTime);
    setDragging(null);
  }, [dragging, tempSubtitles, onUpdateSubtitleTime]);

  useEffect(() => {
    if (dragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, handleMouseMove, handleMouseUp]);

  const displaySubtitles = dragging ? tempSubtitles : subtitles;

  return (
    <div className="bg-gray-900 border border-gray-700 text-white p-4 rounded-lg mt-4 flex flex-col gap-2">
      <div className="flex items-center justify-between px-2 py-1 bg-gray-800 rounded">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onPlayPause}>
            {isPlaying ? <Pause /> : <Play />}
          </Button>
          <Button variant="ghost" size="icon" onClick={handleZoomOut}><ZoomOut /></Button>
          <Button variant="ghost" size="icon" onClick={handleZoomIn}><ZoomIn /></Button>
          <Button variant="ghost" onClick={onSplit} disabled={!activeSubtitleId}>
            <Scissors className="mr-2 h-4 w-4" /> Split
          </Button>
          <Button variant="ghost" onClick={onUndo} disabled={!canUndo}>
            <Undo className="mr-2 h-4 w-4" /> Undo
          </Button>
          <Button variant="ghost" onClick={onRedo} disabled={!canRedo}>
            <Redo className="mr-2 h-4 w-4" /> Redo
          </Button>
          <Button variant="ghost" onClick={() => activeSubtitleId && onDeleteSubtitle(activeSubtitleId)} disabled={!activeSubtitleId}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </Button>
        </div>
        <div className="text-sm font-mono bg-black px-2 py-1 rounded">{formatTime(currentTime)} / {formatTime(duration)}</div>
      </div>

      <div ref={timelineRef} onClick={handleTimelineClick} className="relative w-full overflow-x-auto">
        <div style={{ width: timelineWidth }} className="relative">
          <div className="absolute top-0 h-full w-0.5 bg-white z-30" style={{ left: `${(currentTime / duration) * 100}%` }} />
          <div className="flex flex-col gap-2 pt-6">
            <div className="relative h-12">
              {displaySubtitles.map(sub => {
                const start = vttTimeToSeconds(sub.startTime);
                const end = vttTimeToSeconds(sub.endTime);
                const left = (start / duration) * 100;
                const width = ((end - start) / duration) * 100;
                return (
                  <div key={sub.id} className="absolute h-full" style={{ left: `${left}%`, width: `${width}%` }}>
                    <div onMouseDown={e => handleMouseDown(e, sub.id, 'move')} className={`h-full px-2 text-xs flex items-center bg-yellow-500 text-black rounded ${sub.id === activeSubtitleId ? 'border-2 border-white' : ''}`}>
                      {sub.text}
                    </div>
                  </div>
                );
              })}
            </div>

            <VideoThumbnails videoPublicId={videoPublicId} duration={duration} timelineWidth={timelineWidth} />
            <AudioWaveform videoPublicId={videoPublicId} duration={duration} timelineWidth={timelineWidth} currentTime={currentTime} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelineEditor;
