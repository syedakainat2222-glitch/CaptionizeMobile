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
  subtitleFont: string;
  subtitleFontSize: number;
  subtitleColor: string;
  subtitleBackgroundColor: string;
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
  onUpdateSubtitles,
  activeSubtitleId,
  onTimeUpdate,
  onUpdateSubtitle,
  onSuggestCorrection,
  onReset,
  subtitleFont,
  subtitleFontSize,
  subtitleColor,
  subtitleBackgroundColor,
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
  const [isExporting, setIsExporting] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isTranslationDialogOpen, setIsTranslationDialogOpen] = useState(false);

  const handleExport = useCallback(async (format: 'srt' | 'vtt') => {
    try {
      const subtitlesParam = encodeURIComponent(JSON.stringify(subtitles));
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

      if (format === 'srt') {
        URL.revokeObjectURL(url);
      }

      toast({
        title: 'Export Successful',
        description: `Your subtitles have been downloaded as a .${format} file.`,
      });

    } catch (error) {
      console.error('Export failed:', error);
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: 'Could not export subtitles. Please try again.',
      });
    }
  }, [subtitles, videoName, subtitleFont, toast]);


  const handleExportVideoWithSubtitles = useCallback(async () => {
    setIsExporting(true);
    toast({
      title: 'Starting Export...',
      description: 'Your video with subtitles is being prepared. This may take a few minutes.',
    });

    try {
      const payload = {
        videoPublicId,
        subtitles,
        videoName,
        subtitleFont,
        subtitleFontSize,
        subtitleColor,
        subtitleBackgroundColor,
        subtitleOutlineColor,
        isBold,
        isItalic,
        isUnderline,
      };

      const response = await fetch('/api/burn-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
          const errorText = await response.text();
          console.error("Server returned non-JSON response:", errorText);
          throw new Error(`Failed to process video. Status: ${response.status}`);
      }

      const blob = await response.blob();
      
      if (blob.size === 0) {
        throw new Error('Received empty video file from server.');
      }

      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'video-with-subtitles.mp4';
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
        if (filenameMatch && filenameMatch.length > 1) {
          filename = filenameMatch[1];
        }
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Export Complete!',
        description: `"${filename}" has been downloaded successfully.`,
      });
    } catch (error: any) {
      console.error('Export failed:', error);
  
      let errorMessage = 'Could not export the video with subtitles. Please try again.';
      if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: errorMessage,
      });
    } finally {
      setIsExporting(false);
    }
  }, [videoPublicId, subtitles, videoName, subtitleFont, subtitleFontSize, subtitleColor, subtitleBackgroundColor, subtitleOutlineColor, isBold, isItalic, isUnderline, toast]);

  const handleTranslateClick = async (targetLanguage: string) => {
    setIsTranslating(true);
    setIsTranslationDialogOpen(false);
    try {
      await onTranslate(targetLanguage);
    } catch (error) {
      console.error('Translation failed:', error);
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div className="container mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 p-4 flex-1">
       <SubtitleStyler
        subtitleFont={subtitleFont}
        subtitleFontSize={subtitleFontSize}
        subtitleColor={subtitleColor}
        subtitleBackgroundColor={subtitleBackgroundColor}
        subtitleOutlineColor={subtitleOutlineColor}
        isBold={isBold}
        isItalic={isItalic}
        isUnderline={isUnderline}
      />
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={onReset}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Back to Upload</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsTranslationDialogOpen(true)} 
              disabled={isTranslating || isExporting}
            >
              {isTranslating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Languages className="mr-2 h-4 w-4" />}
              Translate
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={isExporting}>
                  <FileText className="mr-2 h-4 w-4" /> Export Subtitles
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuRadioGroup>
                  <DropdownMenuRadioItem value="srt" onClick={() => handleExport('srt')}>
                    SRT (.srt)
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="vtt" onClick={() => handleExport('vtt')}>
                    VTT (.vtt)
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={handleExportVideoWithSubtitles} disabled={isExporting}>
                    {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                    Export Video
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Burn subtitles into the video and download</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        <VideoPlayer
          videoRef={videoRef}
          videoUrl={videoUrl}
          subtitles={subtitles}
          onTimeUpdate={onTimeUpdate}
          activeSubtitleId={activeSubtitleId}
          onLoadedMetadata={onLoadedMetadata}
        />
        <StyleControls
            subtitleFont={subtitleFont}
            subtitleFontSize={subtitleFontSize}
            subtitleColor={subtitleColor}
            subtitleBackgroundColor={subtitleBackgroundColor}
            subtitleOutlineColor={subtitleOutlineColor}
            isBold={isBold}
            isItalic={isItalic}
            isUnderline={isUnderline}
            onStyleChange={onStyleChange}
        />
      </div>
      <div>
        <SubtitleEditor
          subtitles={subtitles}
          onUpdateSubtitle={onUpdateSubtitle}
          activeSubtitleId={activeSubtitleId}
          onSuggestCorrection={onSuggestCorrection}
          onDeleteSubtitle={onDeleteSubtitle}
        />
      </div>
      <div className="lg:col-span-2">
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
        />
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