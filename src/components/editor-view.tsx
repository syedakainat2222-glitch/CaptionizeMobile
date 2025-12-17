'use client';

import React, { memo, useState } from 'react';
import {
  ArrowLeft,
  Download,
  FileText,
  Loader2,
  Languages,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import VideoPlayer from './video-player';
import SubtitleEditor from './subtitle-editor';
import StyleControls from './StyleControls';
import SubtitleStyler from './subtitle-styler';
import TimelineEditor from './timeline-editor/TimelineEditor';
import TranslationDialog from '@/features/translate/TranslationDialog';
import { Subtitle, formatSrt } from '@/lib/srt';
import { useToast } from '@/hooks/use-toast';
import type { Video } from '@/lib/types';

type Tab = 'subtitles' | 'style' | 'timeline';

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
  onUpdateSubtitles: (s: Subtitle[]) => void;
  activeSubtitleId: number | null;
  onTimeUpdate: (t: number) => void;
  onUpdateSubtitle: (id: number, text: string) => void;
  onSuggestCorrection: (s: Subtitle) => void;
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
  onStyleChange: (u: Partial<Video>) => void;
  onTranslate: (l: string) => void;
  onSplit: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onDeleteSubtitle: (id: number) => void;
  onUpdateSubtitleTime: (
    id: number,
    start: string,
    end: string
  ) => void;
};

const EditorView = (props: EditorViewProps) => {
  const {
    videoRef,
    videoUrl,
    subtitles,
    activeSubtitleId,
  } = props;

  const { toast } = useToast();
  const [mobileTab, setMobileTab] = useState<Tab>('subtitles');
  const [isTranslationDialogOpen, setIsTranslationDialogOpen] =
    useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  const handleExport = async (format: 'srt' | 'vtt') => {
    try {
      let url = '';
      if (format === 'srt') {
        const blob = new Blob(
          [formatSrt(props.subtitles)],
          { type: 'application/x-subrip' }
        );
        url = URL.createObjectURL(blob);
      } else {
        url = `/api/vtt?subtitles=${encodeURIComponent(
          JSON.stringify(props.subtitles)
        )}&font=${props.subtitleFont}`;
      }

      const a = document.createElement('a');
      a.href = url;
      a.download = `${props.videoName.split('.')[0]}.${format}`;
      a.click();

      toast({ title: 'Exported successfully' });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Export failed',
      });
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* HEADER */}
      <div className="sticky top-0 z-40 bg-background border-b flex items-center justify-between p-2">
        <Button size="icon" variant="outline" onClick={props.onReset}>
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsTranslationDialogOpen(true)}
            disabled={isTranslating}
          >
            <Languages className="h-4 w-4" />
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => handleExport('srt')}
          >
            <FileText className="h-4 w-4" />
          </Button>

          <Button
            size="sm"
            onClick={props.onExportVideo}
            disabled={props.isExporting}
          >
            {props.isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* MOBILE */}
      <div className="lg:hidden flex flex-col gap-2 p-2">
        {/* VIDEO */}
        <div className="w-full aspect-video bg-black rounded overflow-hidden touch-auto">
          <VideoPlayer {...props} />
        </div>

        {/* TABS */}
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant={mobileTab === 'subtitles' ? 'default' : 'outline'}
            onClick={() => setMobileTab('subtitles')}
          >
            Subtitles
          </Button>
          <Button
            variant={mobileTab === 'style' ? 'default' : 'outline'}
            onClick={() => setMobileTab('style')}
          >
            Style
          </Button>
          <Button
            variant={mobileTab === 'timeline' ? 'default' : 'outline'}
            onClick={() => setMobileTab('timeline')}
          >
            Timeline
          </Button>
        </div>

        {/* PANELS */}
        <div className="flex-1 overflow-y-auto">
          {mobileTab === 'subtitles' && (
            <SubtitleEditor
              subtitles={subtitles}
              activeSubtitleId={activeSubtitleId}
              onUpdateSubtitle={props.onUpdateSubtitle}
              onSuggestCorrection={props.onSuggestCorrection}
              onDeleteSubtitle={props.onDeleteSubtitle}
            />
          )}

          {mobileTab === 'style' && (
            <>
              <SubtitleStyler {...props} />
              <StyleControls {...props} />
            </>
          )}

          {mobileTab === 'timeline' && (
            <TimelineEditor {...props} />
          )}
        </div>
      </div>

      {/* DESKTOP — UNTOUCHED */}
      <div className="hidden lg:flex flex-1">
        {/* your existing desktop layout stays here */}
      </div>

      <TranslationDialog
        open={isTranslationDialogOpen}
        onOpenChange={setIsTranslationDialogOpen}
        onTranslate={props.onTranslate}
        isTranslating={isTranslating}
      />
    </div>
  );
};

export default memo(EditorView);
