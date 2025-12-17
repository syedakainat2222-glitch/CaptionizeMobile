'use client';

import React, { memo, useCallback, useState } from 'react';
import {
  ArrowLeft,
  Download,
  FileText,
  Loader2,
  Languages,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import VideoPlayer from './video-player';
import SubtitleEditor from './subtitle-editor';
import { Subtitle, formatSrt } from '@/lib/srt';
import { useToast } from '@/hooks/use-toast';
import type { Video } from '@/lib/types';
import TranslationDialog from '@/features/translate/TranslationDialog';
import StyleControls from './StyleControls';
import SubtitleStyler from './subtitle-styler';
import TimelineEditor from './timeline-editor/TimelineEditor';

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
  onUpdateSubtitleTime: (
    id: number,
    startTime: string,
    endTime: string
  ) => void;
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
  const [isTranslating, setIsTranslating] = useState(false);
  const [isTranslationDialogOpen, setIsTranslationDialogOpen] =
    useState(false);

  const handleExport = useCallback(
    async (format: 'srt' | 'vtt') => {
      try {
        let url = '';

        if (format === 'srt') {
          const content = formatSrt(subtitles);
          const blob = new Blob([content], {
            type: 'application/x-subrip',
          });
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

        if (format === 'srt') {
          URL.revokeObjectURL(url);
        }

        toast({
          title: 'Export Successful',
          description: `Your subtitles have been downloaded as a .${format} file.`,
        });
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Export Failed',
          description: 'Could not export subtitles.',
        });
      }
    },
    [subtitles, videoName, subtitleFont, toast]
  );

  const handleTranslateClick = async (targetLanguage: string) => {
    setIsTranslating(true);
    setIsTranslationDialogOpen(false);
    try {
      await onTranslate(targetLanguage);
    } finally {
      setIsTranslating(false);
    }
  };

  const header = (
    <div className="sticky top-0 z-30 bg-background border-b flex items-center justify-between px-2 py-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" onClick={onReset}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Back</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsTranslationDialogOpen(true)}
          disabled={isTranslating || isExporting}
        >
          {isTranslating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Languages className="h-4 w-4" />
          )}
          <span className="hidden sm:inline ml-1">Translate</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={isExporting}>
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Subtitles</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuRadioGroup>
              <DropdownMenuRadioItem
                value="srt"
                onClick={() => handleExport('srt')}
              >
                SRT
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem
                value="vtt"
                onClick={() => handleExport('vtt')}
              >
                VTT
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          size="sm"
          onClick={onExportVideo}
          disabled={isExporting}
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          <span className="hidden sm:inline ml-1">Export</span>
        </Button>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto flex flex-col h-full">
      {header}

      {/* MOBILE */}
      <div className="lg:hidden flex flex-col gap-4 px-2 py-3">
        <div className="w-full aspect-video rounded-md overflow-hidden bg-black">
          <VideoPlayer
            videoRef={videoRef}
            videoUrl={videoUrl}
            subtitles={subtitles}
            onTimeUpdate={onTimeUpdate}
            activeSubtitleId={activeSubtitleId}
            onLoadedMetadata={onLoadedMetadata}
            isPlaying={isPlaying}
            onPlayPause={onPlayPause}
          />
        </div>

        <SubtitleEditor
          subtitles={subtitles}
          onUpdateSubtitle={onUpdateSubtitle}
          activeSubtitleId={activeSubtitleId}
          onSuggestCorrection={onSuggestCorrection}
          onDeleteSubtitle={onDeleteSubtitle}
        />

        <SubtitleStyler
          subtitleFont={subtitleFont}
          subtitleFontSize={subtitleFontSize}
          subtitleColor={subtitleColor}
          subtitleOutlineColor={subtitleOutlineColor}
          isBold={isBold}
          isItalic={isItalic}
          isUnderline={isUnderline}
        />

        <StyleControls
          subtitleFont={subtitleFont}
          subtitleFontSize={subtitleFontSize}
          subtitleColor={subtitleColor}
          subtitleOutlineColor={subtitleOutlineColor}
          isBold={isBold}
          isItalic={isItalic}
          isUnderline={isUnderline}
          onStyleChange={onStyleChange}
        />

        <div className="overflow-x-auto max-h-[140px]">
          <TimelineEditor
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

      {/* DESKTOP */}
      <div className="hidden lg:grid lg:grid-cols-2 gap-8 flex-1 p-4">
        <div className="flex flex-col gap-4">
          <VideoPlayer
            videoRef={videoRef}
            videoUrl={videoUrl}
            subtitles={subtitles}
            onTimeUpdate={onTimeUpdate}
            activeSubtitleId={activeSubtitleId}
            onLoadedMetadata={onLoadedMetadata}
            isPlaying={isPlaying}
            onPlayPause={onPlayPause}
          />

          <SubtitleStyler
            subtitleFont={subtitleFont}
            subtitleFontSize={subtitleFontSize}
            subtitleColor={subtitleColor}
            subtitleOutlineColor={subtitleOutlineColor}
            isBold={isBold}
            isItalic={isItalic}
            isUnderline={isUnderline}
          />

          <StyleControls
            subtitleFont={subtitleFont}
            subtitleFontSize={subtitleFontSize}
            subtitleColor={subtitleColor}
            subtitleOutlineColor={subtitleOutlineColor}
            isBold={isBold}
            isItalic={isItalic}
            isUnderline={isUnderline}
            onStyleChange={onStyleChange}
          />
        </div>

        <div className="overflow-y-auto">
          <SubtitleEditor
            subtitles={subtitles}
            onUpdateSubtitle={onUpdateSubtitle}
            activeSubtitleId={activeSubtitleId}
            onSuggestCorrection={onSuggestCorrection}
            onDeleteSubtitle={onDeleteSubtitle}
          />
        </div>

        <div className="lg:col-span-2 overflow-x-auto">
          <TimelineEditor
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

      <TranslationDialog
        open={isTranslationDialogOpen}
        onOpenChange={setIsTranslationDialogOpen}
        onTranslate={handleTranslateClick}
        isTranslating={isTranslating}
      />
    </div>
  );
};

export default memo(EditorView);
