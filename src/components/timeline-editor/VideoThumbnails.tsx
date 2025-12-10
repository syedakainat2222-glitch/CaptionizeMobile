'use client';

import React, { useMemo } from 'react';

const THUMBNAIL_WIDTH = 120;
const THUMBNAIL_HEIGHT = 68;
const THUMBNAIL_INTERVAL = 2;

type VideoThumbnailsProps = {
  videoPublicId: string;
  duration: number;
  timelineWidth: number;
};

const VideoThumbnails = ({ videoPublicId, duration, timelineWidth }: VideoThumbnailsProps) => {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

  const thumbnails = useMemo(() => {
    if (!duration || !videoPublicId || !cloudName) return [];

    const count = Math.floor(duration / THUMBNAIL_INTERVAL);

    return Array.from({ length: count }, (_, i) => {
      const offset = i * THUMBNAIL_INTERVAL;
      return `https://res.cloudinary.com/${cloudName}/video/upload/so_${offset},w_${THUMBNAIL_WIDTH},h_${THUMBNAIL_HEIGHT},c_fill/${videoPublicId}.jpg`;
    });
  }, [duration, videoPublicId, cloudName]);

  if (thumbnails.length === 0) {
    return (
      <div className="h-16 bg-gray-800/50 rounded-md flex items-center justify-center text-gray-400 text-sm">
        Generating Video Thumbnails...
      </div>
    );
  }

  return (
    <div className="h-16 relative overflow-hidden rounded-md bg-gray-800/50 flex">
      {thumbnails.map((thumb, i) => (
        <img
          key={i}
          src={thumb}
          alt={`Frame ${i}`}
          style={{
            width: `${timelineWidth / thumbnails.length}px`,
            height: '100%',
            objectFit: 'cover',
          }}
        />
      ))}
    </div>
  );
};

export default React.memo(VideoThumbnails);
