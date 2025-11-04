'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';

type SubtitleStylerProps = {
  fontFamily: string;
};

const SubtitleStyler = ({ fontFamily }: SubtitleStylerProps) => {
  const styleContent = `
    ::cue {
      font-family: ${fontFamily} !important;
      /* You can add more global subtitle styles here if needed */
    }
  `;

  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.id = 'subtitle-styler';
    styleElement.innerHTML = styleContent;
    
    const existingStyle = document.getElementById('subtitle-styler');
    if (existingStyle) {
      existingStyle.innerHTML = styleContent;
    } else {
      document.head.appendChild(styleElement);
    }

    return () => {
        const styleToRemove = document.getElementById('subtitle-styler');
        if (styleToRemove) {
            // styleToRemove.remove();
        }
    }
  }, [fontFamily, styleContent]);

  return null;
};

export default SubtitleStyler;
