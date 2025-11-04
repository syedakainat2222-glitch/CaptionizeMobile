import type { FC } from 'react';
import VideoPlayer from '@/components/video-player';
import SubtitleEditor from '@/components/subtitle-editor';
import type { Subtitle } from '@/lib/srt';
import { Button } from '@/components/ui/button';
import { Download, Upload } from 'lucide-react';
import { formatSrt, formatVtt } from '@/lib/srt';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

type EditorViewProps = {
  videoUrl: string;
  subtitles: Subtitle[];
  activeSubtitleId: number | null;
  onTimeUpdate: (time: number) => void;
  onUpdateSubtitle: (id: number, text: string) => void;
  onSuggestCorrection: (subtitle: Subtitle) => void;
  onReset: () => void;
  subtitleFont: string;
  onSubtitleFontChange: (font: string) => void;
};

const EditorView: FC<EditorViewProps> = ({
  videoUrl,
  subtitles,
  activeSubtitleId,
  onTimeUpdate,
  onUpdateSubtitle,
  onSuggestCorrection,
  onReset,
  subtitleFont,
  onSubtitleFontChange,
}) => {
  const handleExport = (format: 'srt' | 'vtt') => {
    const content =
      format === 'srt' ? formatSrt(subtitles) : formatVtt(subtitles);
    const blob = new Blob([content], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `subtitles.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const FONT_OPTIONS = [
    { label: 'Inter', value: 'Inter, sans-serif' },
    { label: 'Roboto', value: 'Roboto, sans-serif' },
    { label: 'Open Sans', value: '"Open Sans", sans-serif' },
    { label: 'Lato', value: 'Lato, sans-serif' },
    { label: 'Arial', value: 'Arial, sans-serif' },
    { label: 'Helvetica', value: 'Helvetica, sans-serif' },
  ];

  return (
    <div className="container mx-auto p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Label htmlFor="font-select">Subtitle Font:</Label>
          <Select value={subtitleFont} onValueChange={onSubtitleFontChange}>
            <SelectTrigger id="font-select" className="w-[180px]">
              <SelectValue placeholder="Select font" />
            </SelectTrigger>
            <SelectContent>
              {FONT_OPTIONS.map((font) => (
                <SelectItem
                  key={font.value}
                  value={font.value}
                  style={{ fontFamily: font.value }}
                >
                  {font.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="outline" onClick={onReset}>
            <Upload className="mr-2" /> Upload New Video
          </Button>
          <Button onClick={() => handleExport('srt')}>
            <Download className="mr-2" /> Export SRT
          </Button>
          <Button onClick={() => handleExport('vtt')}>
            <Download className="mr-2" /> Export VTT
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <VideoPlayer
          videoUrl={videoUrl}
          subtitles={subtitles}
          onTimeUpdate={onTimeUpdate}
          fontFamily={subtitleFont}
        />
        <SubtitleEditor
          subtitles={subtitles}
          activeSubtitleId={activeSubtitleId}
          onUpdateSubtitle={onUpdateSubtitle}
          onSuggestCorrection={onSuggestCorrection}
        />
      </div>
    </div>
  );
};

export default EditorView;
