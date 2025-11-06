
import React, { memo, useCallback, useState } from 'react';
import {
  ArrowLeft,
  Download,
  FileText,
  Loader2,
  Palette,
  Bold,
  Italic,
  Underline,
  Type,
  Baseline,
  Square,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Input } from './ui/input';
import { Toggle } from './ui/toggle';
import { Slider } from './ui/slider';
import type { Video } from '@/lib/types';
import { cn } from '@/lib/utils';


const FONT_OPTIONS = [
  // Sans-serif
  'Arial, sans-serif',
  'Inter, sans-serif',
  'Roboto, sans-serif',
  'Open Sans, sans-serif',
  'Lato, sans-serif',
  'Montserrat, sans-serif',
  'Poppins, sans-serif',
  'Oswald, sans-serif',
  'Bebas Neue, sans-serif',
  'Anton, sans-serif',
  'Comfortaa, sans-serif',
  // Serif
  'Georgia, serif',
  'Times New Roman, serif',
  'Playfair Display, serif',
  'Merriweather, serif',
  'Lora, serif',
  // Monospace
  'Courier New, monospace',
  'Source Code Pro, monospace',
  // Cursive & Decorative
  'Pacifico, cursive',
  'Dancing Script, cursive',
  'Caveat, cursive',
  'Lobster, cursive',
  'Righteous, sans-serif'
];

const FONT_SIZE_OPTIONS = [24, 36, 48, 60, 72, 84, 96];

const generateColorPalette = () => {
    const baseColors = [
      { name: 'White', value: '#FFFFFF' }, { name: 'Black', value: '#000000' },
      { name: 'Yellow', value: '#FFFF00' }, { name: 'Cyan', value: '#00FFFF' },
      { name: 'Magenta', value: '#FF00FF' }, { name: 'Red', value: '#FF0000' },
      { name: 'Green', value: '#00FF00' }, { name: 'Blue', value: '#0000FF' }
    ];
    const shades = [
        { name: 'Light Gray', value: '#CCCCCC' }, { name: 'Gray', value: '#888888' },
        { name: 'Dark Gray', value: '#444444' }, { name: 'Soft Yellow', value: '#FFFFAA' },
        { name: 'Light Blue', value: '#ADD8E6' }, { name: 'Pale Green', value: '#98FB98' },
        { name: 'Light Pink', value: '#FFB6C1' }, { name: 'Orange', value: '#FFA500' }
    ];
    return [...baseColors, ...shades];
};
const COLOR_PALETTE = generateColorPalette();

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
  subtitleFontSize: number;
  subtitleColor: string;
  subtitleBackgroundColor: string;
  subtitleOutlineColor: string;
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  onStyleChange: (update: Partial<Video>) => void;
};

const ColorPicker = ({
    label,
    icon: Icon,
    color,
    onColorChange,
    includeTransparent = false,
}: {
    label: string,
    icon: React.ElementType,
    color: string,
    onColorChange: (color: string) => void,
    includeTransparent?: boolean,
}) => (
    <div className="flex flex-col gap-2">
        <Label className="text-sm font-medium flex items-center gap-2">
            <Icon className="h-4 w-4" /> {label}
        </Label>
        <div className="flex items-center gap-2">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="flex-1 justify-start gap-2">
                        <div className="h-4 w-4 rounded-full border relative" style={{ backgroundColor: color === 'transparent' ? 'white' : color }}>
                          {color === 'transparent' && <div className="absolute inset-0 bg-red-500 transform rotate-45" style={{ mixBlendMode: 'multiply' }}></div>}
                        </div>
                        <span className="truncate">{color}</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="max-h-60 overflow-y-auto">
                    <DropdownMenuRadioGroup value={color} onValueChange={onColorChange}>
                        {includeTransparent && <DropdownMenuRadioItem value="transparent">Transparent</DropdownMenuRadioItem>}
                        {COLOR_PALETTE.map((c) => (
                            <DropdownMenuRadioItem key={c.value} value={c.value}>
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-4 rounded-full border" style={{ backgroundColor: c.value }}></div>
                                    <span>{c.name}</span>
                                </div>
                            </DropdownMenuRadioItem>
                        ))}
                    </DropdownMenuRadioGroup>
                </DropdownMenuContent>
            </DropdownMenu>
            <Input
                type="color"
                value={color === 'transparent' ? '#000000' : color}
                onChange={(e) => onColorChange(e.target.value)}
                className="h-10 w-10 p-1"
                aria-label={`Custom ${label.toLowerCase()} color`}
            />
        </div>
    </div>
);


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
      const response = await fetch('/api/burn-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                    <Label className="text-sm font-medium flex items-center gap-2"><Type className="h-4 w-4" /> Font</Label>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="w-full justify-between">
                                <span className="truncate">{subtitleFont.split(',')[0]}</span>
                                <Palette className="h-4 w-4 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] max-h-96 overflow-y-auto">
                            <DropdownMenuRadioGroup value={subtitleFont} onValueChange={(v) => onStyleChange({ subtitleFont: v })}>
                                {FONT_OPTIONS.map((font) => (
                                    <DropdownMenuRadioItem key={font} value={font} style={{ fontFamily: font }}>
                                        {font.split(',')[0]}
                                    </DropdownMenuRadioItem>
                                ))}
                            </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                <div className="flex flex-col gap-2">
                    <Label className="text-sm font-medium flex items-center gap-2"><Baseline className="h-4 w-4" /> Size</Label>
                    <Select value={String(subtitleFontSize)} onValueChange={(v) => onStyleChange({ subtitleFontSize: Number(v) })}>
                        <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
                        <SelectContent>
                            {FONT_SIZE_OPTIONS.map((size) => (
                                <SelectItem key={size} value={String(size)}>{size}px</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ColorPicker label="Text" icon={Type} color={subtitleColor} onColorChange={(c) => onStyleChange({ subtitleColor: c })} />
                <ColorPicker label="Outline" icon={Square} color={subtitleOutlineColor} onColorChange={(c) => onStyleChange({ subtitleOutlineColor: c })} includeTransparent />
                
                <div className="flex flex-col gap-2">
                    <Label className="text-sm font-medium flex items-center gap-2"><Square className="h-4 w-4" /> Box</Label>
                    <div className='flex items-center gap-2'>
                        <Input type="color" value={subtitleBackgroundColor.slice(0, 7)} onChange={(e) => {
                            const newOpacity = subtitleBackgroundColor.split(',')[3]?.replace(')','') || '0.5';
                            onStyleChange({ subtitleBackgroundColor: `${e.target.value}${Math.round(parseFloat(newOpacity) * 255).toString(16).padStart(2,'0')}`});
                        }} className="p-1 h-10 w-10" />
                        <Slider value={[parseFloat(subtitleBackgroundColor.split(',')[3]?.replace(')','') || '0.5') * 100]} onValueChange={([val]) => {
                           const hexColor = subtitleBackgroundColor.slice(0, 7);
                           const newRgba = `rgba(${parseInt(hexColor.slice(1,3),16)},${parseInt(hexColor.slice(3,5),16)},${parseInt(hexColor.slice(5,7),16)},${val/100})`;
                           onStyleChange({ subtitleBackgroundColor: newRgba });
                        }} max={100} step={5} className="flex-1" />
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <Toggle pressed={isBold} onPressedChange={(p) => onStyleChange({ isBold: p })} aria-label="Toggle bold"><Bold className="h-4 w-4" /></Toggle>
                <Toggle pressed={isItalic} onPressedChange={(p) => onStyleChange({ isItalic: p })} aria-label="Toggle italic"><Italic className="h-4 w-4" /></Toggle>
                <Toggle pressed={isUnderline} onPressedChange={(p) => onStyleChange({ isUnderline: p })} aria-label="Toggle underline"><Underline className="h-4 w-4" /></Toggle>
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
