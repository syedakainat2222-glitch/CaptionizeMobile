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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  onUpdateSubtitles,
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
  
  const header = (
    <div className="flex justify-between items-center p-2 mb-2 border-b flex-shrink-0">
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
            size="sm"
            onClick={() => setIsTranslationDialogOpen(true)} 
            disabled={isTranslating || isExporting}
        >
            {isTranslating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Languages className="mr-2 h-4 w-4" />}
            <span className="hidden sm:inline">Translate</span>
        </Button>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={isExporting}>
                <FileText className="mr-2 h-4 w-4" /> <span className="hidden sm:inline">Export Subtitles</span>
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
                <Button size="sm" onClick={onExportVideo} disabled={isExporting}>
                {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                <span className="hidden sm:inline">Export Video</span>
                </Button>
            </TooltipTrigger>
            <TooltipContent>
                <p>Burn subtitles into the video and download</p>
            </TooltipContent>
            </Tooltip>
        </TooltipProvider>
        </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {header}

      {/* Mobile Layout: Tabbed interface for screens smaller than 1024px */}
      <div className="lg:hidden flex flex-col flex-1 overflow-hidden">
        <VideoPlayer
            className="flex-shrink-0"
            videoRef={videoRef}
            videoUrl={videoUrl}
            subtitles={subtitles}
            onTimeUpdate={onTimeUpdate}
            activeSubtitleId={activeSubtitleId}
            onLoadedMetadata={onLoadedMetadata}
            isPlaying={isPlaying}
            onPlayPause={onPlayPause}
        />
        <Tabs defaultValue="edit" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-3 flex-shrink-0">
            <TabsTrigger value="edit">Edit</TabsTrigger>
            <TabsTrigger value="style">Style</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>
          <TabsContent value="edit" className="flex-1 overflow-y-auto p-3">
            <SubtitleEditor
              subtitles={subtitles}
              onUpdateSubtitle={onUpdateSubtitle}
              activeSubtitleId={activeSubtitleId}
              onSuggestCorrection={onSuggestCorrection}
              onDeleteSubtitle={onDeleteSubtitle}
            />
          </TabsContent>
          <TabsContent value="style" className="flex-1 overflow-y-auto p-3 space-y-4">
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
          </TabsContent>
          <TabsContent value="timeline" className="flex-1 overflow-y-auto p-3">
            <div className="overflow-x-auto">
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
          </TabsContent>
        </Tabs>
      </div>

      {/* Desktop Layout: Grid for screens 1024px and wider */}
      <div className="hidden lg:grid lg:grid-cols-2 gap-6 flex-1 p-4 overflow-hidden">
         <div className="flex flex-col gap-4">
            <div className="w-full bg-black rounded-md overflow-hidden shadow-lg">
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
        <div className="flex flex-col gap-4 overflow-hidden">
            <div className="flex-1 overflow-y-auto pr-2">
                <SubtitleEditor
                subtitles={subtitles}
                onUpdateSubtitle={onUpdateSubtitle}
                activeSubtitleId={activeSubtitleId}
                onSuggestCorrection={onSuggestCorrection}
                onDeleteSubtitle={onDeleteSubtitle}
                />
            </div>
            <div className="flex-shrink-0 overflow-x-auto pb-2">
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
