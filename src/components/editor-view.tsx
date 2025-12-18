'use client';

import React, { memo, useCallback, useState, useEffect } from 'react';
import { ArrowLeft, Download, FileText, Loader2, Languages } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import VideoPlayer from './video-player';
import SubtitleEditor from './subtitle-editor';
import SubtitleStyler from './subtitle-styler';
import StyleControls from './StyleControls';
import TimelineEditor from './timeline-editor/TimelineEditor';
import MobileVideoPlayer from './mobile/MobileVideoPlayer';
import MobileTimelineEditor from './mobile/MobileTimelineEditor';

import { Subtitle, formatSrt } from '@/lib/srt';
import { useToast } from '@/hooks/use-toast';
import type { Video } from '@/lib/types';
import TranslationDialog from '@/features/translate/TranslationDialog';
import { useDeviceOrientation } from '@/hooks/use-device-orientation';

type EditorViewProps = {
  videoRef: React.RefObject<HTMLVideoElement>;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onLoadedMetadata: () => void;
  videoUrl: string;
  videoPublicId: string;
  videoName: string;
  subtitles: Subtitle[];
  onUpdateSubtitles: (newSubtitles: Subtitle[]) => void;
  activeSubtitleId: number | null;
  onTimeUpdate: (time: number) => void;
  onUpdateSubtitle: (id: number, newText: string) => void;
  onSuggestCorrection: (subtitle: Subtitle) => void;
  onReset: () => void;
  isExporting: boolean;
  onExportVideo: () => void;
  isTranslating: boolean;
  subtitleFont: string;
  subtitleFontSize: number;
  subtitleColor: string;
  subtitleOutlineColor: string;
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  onStyleChange: (update: Partial<Video>) => void;
  onTranslate: (targetLanguage: string) => void;
  onSplit: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onDeleteSubtitle: (id: number) => void;
  onUpdateSubtitleTime: (id: number, startTime: string, endTime: string) => void;
};

const EditorView = ({
  videoRef,
  isPlaying,
  currentTime,
  duration,
  onPlayPause,
  onSeek,
  onLoadedMetadata,
  videoUrl,
  videoPublicId,
  videoName,
  subtitles,
  activeSubtitleId,
  onTimeUpdate,
  onUpdateSubtitle,
  onSuggestCorrection,
  onReset,
  isExporting,
  isTranslating,
  onExportVideo,
  subtitleFont,
  subtitleFontSize,
  subtitleColor,
  subtitleOutlineColor,
  isBold,
  isItalic,
  isUnderline,
  onStyleChange,
  onTranslate,
  onSplit,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onDeleteSubtitle,
  onUpdateSubtitleTime,
}: EditorViewProps) => {
  const { toast } = useToast();
  const [isTranslationDialogOpen, setIsTranslationDialogOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<'subtitle' | 'style' | 'timeline'>('timeline');
  const { isMobile, isLandscape } = useDeviceOrientation();

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .mobile-editor-active .main-header,
      .mobile-editor-active .main-footer {
        display: none;
      }
    `;
    document.head.appendChild(style);

    if (isMobile) {
      document.body.classList.add('mobile-editor-active');
    } else {
      document.body.classList.remove('mobile-editor-active');
    }

    return () => {
      document.head.removeChild(style);
      document.body.classList.remove('mobile-editor-active');
    };
  }, [isMobile]);

  const handleExport = useCallback(
    async (format: 'srt' | 'vtt') => {
      try {
        let url = '';
        if (format === 'srt') {
          const content = formatSrt(subtitles);
          const blob = new Blob([content], { type: 'application/x-subrip' });
          url = URL.createObjectURL(blob);
        } else {
          const params = new URLSearchParams({
            subtitles: JSON.stringify(subtitles),
            font: subtitleFont,
          });
          url = `/api/vtt?${params.toString()}`;
        }

        const a = document.createElement('a');
        a.href = url;
        a.download = `${videoName.split('.')[0]}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        if (format === 'srt') URL.revokeObjectURL(url);

        toast({ title: 'Export Successful', description: `Your subtitles have been downloaded as a .${format} file.` });
      } catch {
        toast({ variant: 'destructive', title: 'Export Failed', description: 'Could not export subtitles.' });
      }
    },
    [subtitles, subtitleFont, videoName, toast]
  );

  const header = (
    <div className="sticky top-0 z-30 bg-background border-b px-1 py-0.5 flex justify-between items-center">
      <Button variant="outline" size="icon" onClick={onReset} className="h-8 w-8">
        <ArrowLeft className="h-4 w-4" />
      </Button>

      <div className="flex gap-1">
        <Button variant="outline" size="sm" onClick={() => setIsTranslationDialogOpen(true)} disabled={isTranslating || isExporting} className="h-8">
          <Languages className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8">
              <FileText className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuRadioGroup>
              <DropdownMenuRadioItem value="srt" onClick={() => handleExport('srt')}>
                SRT
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="vtt" onClick={() => handleExport('vtt')}>
                VTT
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button size="sm" onClick={onExportVideo} disabled={isExporting} className="h-8">
          {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );

  if (isMobile === null) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (isMobile && !isLandscape) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4 bg-background">
        <p className="text-lg font-medium">Please rotate your device to landscape for editing subtitles</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${isMobile ? 'h-screen' : 'h-full'}`}>
      {!isMobile && header}

      {isMobile ? (
        <div className="flex flex-col gap-1 flex-1">
          <div className="w-full aspect-video bg-black rounded-md overflow-hidden max-h-[200px]">
            <MobileVideoPlayer
              videoRef={videoRef}
              videoUrl={videoUrl}
              subtitles={subtitles}
              onTimeUpdate={onTimeUpdate}
              activeSubtitleId={activeSubtitleId}
              onLoadedMetadata={onLoadedMetadata}
              isPlaying={isPlaying}
              onPlayPause={onPlayPause}
              subtitleFont={subtitleFont}
              subtitleFontSize={subtitleFontSize}
              subtitleColor={subtitleColor}
              subtitleOutlineColor={subtitleOutlineColor}
              isBold={isBold}
              isItalic={isItalic}
              isUnderline={isUnderline}
            />
          </div>

          <div className="flex gap-1">
            <Button variant={mobileTab === 'timeline' ? 'default' : 'outline'} className="flex-1 h-8" onClick={() => setMobileTab('timeline')}>
              <span className="text-xs">Timeline</span>
            </Button>
            <Button variant={mobileTab === 'subtitle' ? 'default' : 'outline'} className="flex-1 h-8" onClick={() => setMobileTab('subtitle')}>
              <span className="text-xs">Subtitle</span>
            </Button>
            <Button variant={mobileTab === 'style' ? 'default' : 'outline'} className="flex-1 h-8" onClick={() => setMobileTab('style')}>
              <span className="text-xs">Style</span>
            </Button>
          </div>

          {mobileTab === 'subtitle' && <div className="flex-1 overflow-y-auto"><SubtitleEditor subtitles={subtitles} activeSubtitleId={activeSubtitleId} onUpdateSubtitle={onUpdateSubtitle} onSuggestCorrection={onSuggestCorrection} onDeleteSubtitle={onDeleteSubtitle} /></div>}

          {mobileTab === 'style' && (
            <div className="flex flex-col gap-2 flex-1 overflow-y-auto">
              <SubtitleStyler subtitleFont={subtitleFont} subtitleFontSize={subtitleFontSize} subtitleColor={subtitleColor} subtitleOutlineColor={subtitleOutlineColor} isBold={isBold} isItalic={isItalic} isUnderline={isUnderline} />
              <StyleControls subtitleFont={subtitleFont} subtitleFontSize={subtitleFontSize} subtitleColor={subtitleColor} subtitleOutlineColor={subtitleOutlineColor} isBold={isBold} isItalic={isItalic} isUnderline={isUnderline} onStyleChange={onStyleChange} />
            </div>
          )}

          {mobileTab === 'timeline' && (
            <div className="overflow-x-auto p-1 flex-1">
              <div className="min-w-[600px] flex gap-2 items-center">
                <MobileTimelineEditor
                  videoRef={videoRef}
                  isPlaying={isPlaying}
                  currentTime={currentTime}
                  duration={duration}
                  onPlayPause={onPlayPause}
                  onSeek={onSeek}
                  subtitles={subtitles}
                  onSplit={onSplit}
                  onUndo={onUndo}
                  onRedo={onRedo}
                  canUndo={canUndo}
                  canRedo={canRedo}
                  activeSubtitleId={activeSubtitleId}
                  onDeleteSubtitle={onDeleteSubtitle}
                  onUpdateSubtitleTime={onUpdateSubtitleTime}
                  videoPublicId={videoPublicId}
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-8 p-4 flex-1">
          <div className="flex flex-col gap-4">
            <div className="w-full aspect-video bg-black rounded-md overflow-hidden">
              <VideoPlayer videoRef={videoRef} videoUrl={videoUrl} subtitles={subtitles} onTimeUpdate={onTimeUpdate} activeSubtitleId={activeSubtitleId} onLoadedMetadata={onLoadedMetadata} isPlaying={isPlaying} onPlayPause={onPlayPause} />
            </div>

            <div className="flex flex-col gap-2">
              <SubtitleStyler subtitleFont={subtitleFont} subtitleFontSize={subtitleFontSize} subtitleColor={subtitleColor} subtitleOutlineColor={subtitleOutlineColor} isBold={isBold} isItalic={isItalic} isUnderline={isUnderline} />
              <StyleControls subtitleFont={subtitleFont} subtitleFontSize={subtitleFontSize} subtitleColor={subtitleColor} subtitleOutlineColor={subtitleOutlineColor} isBold={isBold} isItalic={isItalic} isUnderline={isUnderline} onStyleChange={onStyleChange} />
            </div>
          </div>

          <div className="overflow-y-auto">
            <SubtitleEditor subtitles={subtitles} activeSubtitleId={activeSubtitleId} onUpdateSubtitle={onUpdateSubtitle} onSuggestCorrection={onSuggestCorrection} onDeleteSubtitle={onDeleteSubtitle} />
          </div>

          <div className="col-span-2 overflow-x-auto">
            <TimelineEditor isPlaying={isPlaying} currentTime={currentTime} duration={duration} onPlayPause={onPlayPause} onSeek={onSeek} subtitles={subtitles} onSplit={onSplit} onUndo={onUndo} onRedo={onRedo} canUndo={canUndo} canRedo={canRedo} activeSubtitleId={activeSubtitleId} onDeleteSubtitle={onDeleteSubtitle} onUpdateSubtitleTime={onUpdateSubtitleTime} videoPublicId={videoPublicId} />
          </div>
        </div>
      )}

      <TranslationDialog open={isTranslationDialogOpen} onOpenChange={setIsTranslationDialogOpen} onTranslate={onTranslate} isTranslating={isTranslating} />
    </div>
  );
};

export default memo(EditorView);