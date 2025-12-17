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
import SubtitleStyler from './subtitle-styler';
import StyleControls from './StyleControls';
import TimelineEditor from './timeline-editor/TimelineEditor';

import { Subtitle, formatSrt } from '@/lib/srt';
import { useToast } from '@/hooks/use-toast';
import type { Video } from '@/lib/types';
import TranslationDialog from '@/features/translate/TranslationDialog';

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
  const [isTranslationDialogOpen, setIsTranslationDialogOpen] = useState(false);

  // mobile tab state
  const [mobileTab, setMobileTab] = useState<'subtitle' | 'style' | 'timeline'>('subtitle');

  const handleExport = useCallback(async (format: 'srt' | 'vtt') => {
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

      toast({
        title: 'Export Successful',
        description: `Your subtitles have been downloaded as a .${format} file.`,
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: 'Could not export subtitles.',
      });
    }
  }, [subtitles, subtitleFont, videoName, toast]);

  const header = (
    <div className="sticky top-0 z-30 bg-background border-b px-2 py-2 flex justify-between items-center">
      <Button variant="outline" size="icon" onClick={onReset}>
        <ArrowLeft className="h-5 w-5" />
      </Button>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsTranslationDialogOpen(true)}
          disabled={isTranslating || isExporting}
        >
          <Languages className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
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

        <Button size="sm" onClick={onExportVideo} disabled={isExporting}>
          {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {header}

      {/* ================= MOBILE ================= */}
      <div className="lg:hidden flex flex-col gap-3 p-2">
        {/* VIDEO — ALWAYS MOUNTED */}
        <div className="w-full aspect-video bg-black rounded-md overflow-hidden">
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

        {/* MOBILE TABS */}
        <div className="flex gap-2">
          <Button
            variant={mobileTab === 'subtitle' ? 'default' : 'outline'}
            className="flex-1"
            onClick={() => setMobileTab('subtitle')}
          >
            Subtitle
          </Button>
          <Button
            variant={mobileTab === 'style' ? 'default' : 'outline'}
            className="flex-1"
            onClick={() => setMobileTab('style')}
          >
            Style
          </Button>
          <Button
            variant={mobileTab === 'timeline' ? 'default' : 'outline'}
            className="flex-1"
            onClick={() => setMobileTab('timeline')}
          >
            Timeline
          </Button>
        </div>

        {/* MOBILE PANELS */}
        {mobileTab === 'subtitle' && (
          <SubtitleEditor
            subtitles={subtitles}
            activeSubtitleId={activeSubtitleId}
            onUpdateSubtitle={onUpdateSubtitle}
            onSuggestCorrection={onSuggestCorrection}
            onDeleteSubtitle={onDeleteSubtitle}
          />
        )}

        {mobileTab === 'style' && (
          <>
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
          </>
        )}

        {mobileTab === 'timeline' && (
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
        )}
      </div>

      {/* ================= DESKTOP (ORIGINAL) ================= */}
      <div className="hidden lg:grid lg:grid-cols-2 gap-8 p-4 flex-1">
        <div className="flex flex-col gap-4">
          <div className="w-full aspect-video bg-black rounded-md overflow-hidden">
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
            activeSubtitleId={activeSubtitleId}
            onUpdateSubtitle={onUpdateSubtitle}
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
        onTranslate={onTranslate}
        isTranslating={isTranslating}
      />
    </div>
  );
};

export default memo(EditorView);
