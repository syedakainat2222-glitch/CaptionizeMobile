'use client';

import React, { useMemo } from 'react';

const THUMBNAIL_INTERVAL = 2;

type VideoThumbnailsProps = {
  videoPublicId: string;
  duration: number;
  timelineWidth: number;
  currentTime: number;
};

const VideoThumbnails = ({
  videoPublicId,
  duration,
  timelineWidth,
  currentTime,
}: VideoThumbnailsProps) => {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

  const thumbnails = useMemo(() => {
    if (!duration || !videoPublicId || !cloudName) return [];
    const count = Math.floor(duration / THUMBNAIL_INTERVAL);

    return Array.from({ length: count }, (_, i) => {
      const offset = i * THUMBNAIL_INTERVAL;
      return `https://res.cloudinary.com/${cloudName}/video/upload/so_${offset}/${videoPublicId}.jpg`;
    });
  }, [duration, videoPublicId, cloudName]);

  const playheadLeft = (currentTime / duration) * timelineWidth;

  return (
    <div className="relative h-16 overflow-hidden rounded-md bg-gray-800/50">
      <div className="flex h-full">
        {thumbnails.map((thumb, i) => (
          <img
            key={i}
            src={thumb}
            alt=""
            style={{ width: `${timelineWidth / thumbnails.length}px` }}
            className="h-full object-cover"
          />
        ))}
      </div>

      {/* SHARED PLAYHEAD */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
        style={{ left: playheadLeft }}
      />
    </div>
  );
};

export default React.memo(VideoThumbnails);
