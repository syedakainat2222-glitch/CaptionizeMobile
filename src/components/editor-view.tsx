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
import { parseSrt, Subtitle } from '@/lib/srt';
import { useToast } from '@/hooks/use-toast';
import type { Video } from '@/lib/types';
import TranslationDialog from '@/features/translate/TranslationDialog';
import StyleControls from './StyleControls';

type EditorViewProps = {
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
};

const EditorView = ({
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
}: EditorViewProps) => {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isTranslationDialogOpen, setIsTranslationDialogOpen] = useState(false);

  const handleExport = useCallback(async (format: 'srt' | 'vtt') => {
    let content = '';
    let mimeType = '';
    let fileExtension = '';

    if (format === 'srt') {
      const { formatSrt } = await import('@/lib/srt');
      content = formatSrt(subtitles);
      mimeType = 'application/x-subrip';
      fileExtension = 'srt';
    } else {
      const { formatVtt } = await import('@/lib/srt');
      content = formatVtt(subtitles);
      mimeType = 'text/vtt';
      fileExtension = 'vtt';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${videoName.split('.')[0]}.${fileExtension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Export Successful',
      description: `Your subtitles have been downloaded as a .${fileExtension} file.`,
    });
  }, [subtitles, videoName, toast]);

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
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.indexOf('application/json') !== -1) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'The server returned an error.');
        } else {
          const errorText = await response.text();
          console.error("Server returned non-JSON response:", errorText);
          throw new Error('The server returned an unexpected response. Please check the server logs.');
        }
      }

      const blob = await response.blob();
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
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: error.message || 'Could not export the video with subtitles. Please try again.',
      });
    } finally {
      setIsExporting(false);
    }
  }, [videoPublicId, subtitles, videoName, subtitleFont, subtitleFontSize, subtitleColor, subtitleBackgroundColor, subtitleOutlineColor, isBold, isItalic, isUnderline, toast]);

  const handleTranslate = async (targetLanguage: string) => {
    setIsTranslating(true);
    setIsTranslationDialogOpen(false);
    toast({ title: 'Translating subtitles...' });

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subtitles, targetLanguage }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Translation failed');
      }

      const { subtitles: newSubtitles } = await response.json();
      onUpdateSubtitles(newSubtitles);

      toast({
        title: 'Translation Complete',
        description: `Subtitles have been translated to ${targetLanguage}.`,
      });
    } catch (error: any) {
      console.error('Translation failed:', error);
      toast({
        variant: 'destructive',
        title: 'Translation Failed',
        description: error.message || 'Could not translate subtitles.',
      });
    } finally {
      setIsTranslating(false);
    }
  };


  return (
    <div className="container mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 p-4 flex-1">
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
            <Button variant="outline" onClick={() => setIsTranslationDialogOpen(true)} disabled={isTranslating}>
              <Languages className="mr-2 h-4 w-4" />
              Translate
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
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
          videoUrl={videoUrl}
          subtitles={subtitles}
          onTimeUpdate={onTimeUpdate}
          activeSubtitleId={activeSubtitleId}
          subtitleFont={subtitleFont}
          subtitleFontSize={subtitleFontSize}
          subtitleColor={subtitleColor}
          subtitleBackgroundColor={subtitleBackgroundColor}
          subtitleOutlineColor={subtitleOutlineColor}
          isBold={isBold}
          isItalic={isItalic}
          isUnderline={isUnderline}
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
        />
      </div>
      <TranslationDialog
        open={isTranslationDialogOpen}
        onOpenChange={setIsTranslationDialogOpen}
        onTranslate={handleTranslate}
        isTranslating={isTranslating}
      />
    </div>
  );
};

export default memo(EditorView);
