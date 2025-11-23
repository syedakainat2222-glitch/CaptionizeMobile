'use client';

import { useEffect } from 'react';

type SubtitleStylerProps = {
  subtitleFont: string;
  subtitleFontSize: number;
  subtitleColor: string;
  subtitleBackgroundColor: string;
  subtitleOutlineColor: string;
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
};

const SubtitleStyler = ({
  subtitleFont,
  subtitleFontSize,
  subtitleColor,
  subtitleBackgroundColor,
  subtitleOutlineColor,
  isBold,
  isItalic,
  isUnderline,
}: SubtitleStylerProps) => {
  useEffect(() => {
    const styleId = 'subtitle-styler';
    let styleElement = document.getElementById(styleId) as HTMLStyleElement | null;

    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }

    const createTextShadow = () => {
      if (!subtitleOutlineColor || subtitleOutlineColor === 'transparent') {
        return 'none';
      }
      const color = subtitleOutlineColor;
      return `
        -1px -1px 0 ${color},  
         1px -1px 0 ${color},
        -1px  1px 0 ${color},
         1px  1px 0 ${color}
      `;
    };

    styleElement.textContent = `
      video::cue {
        font-family: "${subtitleFont}", sans-serif !important;
        font-size: ${subtitleFontSize}px !important;
        color: ${subtitleColor} !important;
        background-color: ${subtitleBackgroundColor} !important;
        font-weight: ${isBold ? 'bold' : 'normal'} !important;
        font-style: ${isItalic ? 'italic' : 'normal'} !important;
        text-decoration: ${isUnderline ? 'underline' : 'none'} !important;
        text-shadow: ${createTextShadow()} !important;
        white-space: pre-wrap !important;
        direction: rtl !important;
      }
    `;

  }, [
    subtitleFont,
    subtitleFontSize,
    subtitleColor,
    subtitleBackgroundColor,
    subtitleOutlineColor,
    isBold,
    isItalic,
    isUnderline,
  ]);

  return null;
};

export default SubtitleStyler;