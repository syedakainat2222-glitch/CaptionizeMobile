'use client';

import React, { useMemo } from 'react';

type AudioWaveformProps = {
  videoPublicId: string;
};

const AudioWaveform = ({ videoPublicId }: AudioWaveformProps) => {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

  const waveformUrl = useMemo(() => {
    if (!videoPublicId || !cloudName) return '';

    // Generate a waveform image from the video.
    // We'll make it transparent (b_transparent), a certain color (co_white),
    // and use the waveform flag.
    const waveformTransformation = 'fl_waveform,co_white,b_transparent';

    return `https://res.cloudinary.com/${cloudName}/video/upload/${waveformTransformation}/${videoPublicId}.png`;
  }, [videoPublicId, cloudName]);

  if (!waveformUrl) {
    return (
      <div className="h-20 bg-gray-800/50 rounded-md flex items-center justify-center text-gray-400 text-sm">
        Generating audio waveform...
      </div>
    );
  }

  return (
    <div className="h-20 relative bg-gray-800/50 rounded-md overflow-hidden">
      <img
        src={waveformUrl}
        alt="Audio waveform"
        className="w-full h-full object-cover"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  );
};

export default React.memo(AudioWaveform);
