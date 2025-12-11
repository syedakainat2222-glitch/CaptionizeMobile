'use client'
import {cn} from '@/lib/utils'
import {Subtitle} from '@/lib/srt'
import React from "react";

interface TimelineProps {
    currentTime: number;
    duration: number;
    onSeek: (time: number) => void;
    subtitles: Subtitle[];
    activeSubtitleId: number | null;
}

export default function Timeline({currentTime, duration, onSeek, subtitles, activeSubtitleId}: TimelineProps) {
    if (duration === Infinity) return null

    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = x / rect.width;
        onSeek(duration * percentage);
    }

    return (
        <div className="w-full h-32 bg-gray-100 dark:bg-gray-800 rounded-lg p-2 relative cursor-pointer" onClick={handleSeek}>
            {/* Progress bar */}
            <div className="h-full bg-gray-200 dark:bg-gray-700 rounded">
                <div
                    className="h-full bg-blue-500 rounded"
                    style={{width: `${(currentTime / duration) * 100}%`}}
                />
            </div>

            {/* Subtitle blocks */}
            <div className="absolute inset-0 p-2">
                {subtitles.map(sub => (
                    <div
                        key={sub.id}
                        className={cn(
                            "absolute h-full top-0 bg-yellow-500/50 border-2 border-yellow-600 rounded-sm",
                            sub.id === activeSubtitleId && "bg-green-500/50 border-green-600"
                        )}
                        style={{
                            left: `${(sub.startTime / duration) * 100}%`,
                            width: `${((sub.endTime - sub.startTime) / duration) * 100}%`
                        }}
                    />
                ))}
            </div>

            {/* Current time indicator */}
            <div
                className="absolute top-0 bottom-0 w-0.5 bg-red-500"
                style={{left: `${(currentTime / duration) * 100}%`}}
            />
        </div>
    )
}
