import React, { memo, useCallback, useState } from 'react';
import {
  ArrowLeft,
  Download,
  FileText,
  Loader2,
  Palette,
  Scaling,
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
import { Subtitle } from '@/lib/srt';
import { useToast } from '@/hooks/use-toast';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

const FONT_OPTIONS = [
  'Inter, sans-serif',
  'Roboto, sans-serif',
  'Arial, sans-serif',
  'Helvetica, sans-serif',
  'Georgia, serif',
  'Times New Roman, serif',
  'Verdana, sans-serif',
  'Courier New, monospace',
  'Lucida Console, monospace',
  'Comic Sans MS, cursive',
];

const FONT_SIZE_OPTIONS = Array.from({ length: 16 }, (_, i) => i + 1);

type EditorViewProps = {
  videoUrl: string;
  videoPublicId: string;
  videoName: string;
  subtitles: Subtitle[];
  activeSubtitleId: number | null;
  onTimeUpdate: (time: number) => void;
  onUpdateSubtitle: (id: number, newText: string) => void;
  onSuggestCorrection: (subtitle: Subtitle) => void;
  onReset: () => void;
  subtitleFont: string;
  onSubtitleFontChange: (font: string) => void;
  subtitleFontSize: number;
  onSubtitleFontSizeChange: (size: number) => void;
};

const EditorView = ({
  videoUrl,
  videoPublicId,
  videoName,
  subtitles,
  activeSubtitleId,
  onTimeUpdate,
  onUpdateSubtitle,
  onSuggestCorrection,
  onReset,
  subtitleFont,
  onSubtitleFontChange,
  subtitleFontSize,
  onSubtitleFontSizeChange,
}: EditorViewProps) => {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

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
      description:
        'Your video with subtitles is being prepared. This may take a few minutes.',
    });

    try {
      const response = await fetch('/api/burn-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoPublicId,
          subtitles,
          videoName,
          subtitleFont,
          subtitleFontSize,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || 'Failed to start the export process.'
        );
      }
      
      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'video-with-subtitles.mp4'; // Default fallback
      
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
        description:
          error.message ||
          'Could not export the video with subtitles. Please try again.',
      });
    } finally {
      setIsExporting(false);
    }
  }, [videoPublicId, subtitles, videoName, subtitleFont, subtitleFontSize, toast]);

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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <FileText className="mr-2 h-4 w-4" /> Export Subtitles
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuRadioGroup>
                  <DropdownMenuRadioItem
                    value="srt"
                    onClick={() => handleExport('srt')}
                  >
                    SRT (.srt)
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem
                    value="vtt"
                    onClick={() => handleExport('vtt')}
                  >
                    VTT (.vtt)
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleExportVideoWithSubtitles}
                    disabled={isExporting}
                  >
                    {isExporting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
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
        />
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium">Font</Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span>{subtitleFont.split(',')[0]}</span>
                  <Palette className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                <DropdownMenuRadioGroup
                  value={subtitleFont}
                  onValueChange={onSubtitleFontChange}
                >
                  {FONT_OPTIONS.map((font) => (
                    <DropdownMenuRadioItem
                      key={font}
                      value={font}
                      style={{ fontFamily: font }}
                    >
                      {font.split(',')[0]}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium">Size</Label>
            <Select
              value={String(subtitleFontSize)}
              onValueChange={(value) => onSubtitleFontSizeChange(Number(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select size" />
              </SelectTrigger>
              <SelectContent>
                {FONT_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <div>
        <SubtitleEditor
          subtitles={subtitles}
          onUpdateSubtitle={onUpdateSubtitle}
          activeSubtitleId={activeSubtitleId}
          onSuggestCorrection={onSuggestCorrection}
        />
      </div>
    </div>
  );
};

export default memo(EditorView);