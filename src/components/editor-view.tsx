import { FC, useState } from 'react';
import VideoPlayer from '@/components/video-player';
import SubtitleEditor from '@/components/subtitle-editor';
import type { Subtitle } from '@/lib/srt';
import { Button } from '@/components/ui/button';
import { Download, Upload, ArrowLeft, Loader2, Video, Film } from 'lucide-react';
import { formatSrt, formatVtt } from '@/lib/srt';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import SubtitleStyler from './subtitle-styler';
import { useToast } from '@/hooks/use-toast';


type EditorViewProps = {
  videoUrl: string;
  videoPublicId?: string;
  videoName: string;
  subtitles: Subtitle[];
  activeSubtitleId: number | null;
  onTimeUpdate: (time: number) => void;
  onUpdateSubtitle: (id: number, text: string) => void;
  onSuggestCorrection: (subtitle: Subtitle) => void;
  onReset: () => void;
  subtitleFont: string;
  onSubtitleFontChange: (font: string) => void;
};

const FONT_OPTIONS = [
  // Sans-serif
  { label: 'Inter', value: 'Inter, sans-serif' },
  { label: 'Roboto', value: 'Roboto, sans-serif' },
  { label: 'Open Sans', value: '"Open Sans", sans-serif' },
  { label: 'Lato', value: 'Lato, sans-serif' },
  { label: 'Montserrat', value: 'Montserrat, sans-serif' },
  { label: 'Poppins', value: 'Poppins, sans-serif' },
  { label: 'Nunito', value: 'Nunito, sans-serif' },
  { label: 'Raleway', value: 'Raleway, sans-serif' },
  { label: 'Source Sans 3', value: '"Source Sans 3", sans-serif' },
  { label: 'Ubuntu', value: 'Ubuntu, sans-serif' },
  { label: 'Oswald', value: 'Oswald, sans-serif' },
  { label: 'Exo 2', value: '"Exo 2", sans-serif' },
  { label: 'Dosis', value: 'Dosis, sans-serif' },
  { label: 'Helvetica', value: 'Helvetica, sans-serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },

  // Serif
  { label: 'Playfair Display', value: '"Playfair Display", serif' },
  { label: 'Merriweather', value: 'Merriweather, serif' },
  { label: 'Lora', value: 'Lora, serif' },
  { label: 'PT Serif', value: '"PT Serif", serif' },
  { label: 'Georgia', value: 'Georgia, serif' },

  // Display & Handwriting
  { label: 'Pacifico', value: 'Pacifico, cursive' },
  { label: 'Caveat', value: 'Caveat, cursive' },
  { label: 'Dancing Script', value: '"Dancing Script", cursive' },

  // Monospace
  { label: 'Source Code Pro', value: '"Source Code Pro", monospace' },
];

const EditorView: FC<EditorViewProps> = ({
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
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

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

  const downloadFile = (url: string, filename: string) => {
    try {
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      // For blob URLs, we might want to revoke them, but for data URIs, this is not needed.
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    } catch (error) {
       console.error('Failed to download file:', error);
       toast({
         variant: 'destructive',
         title: 'Download Failed',
         description: 'Could not download the processed video file.'
       })
    }
  }


  const handleExportVideoWithSubtitles = async () => {
    if (!videoPublicId) {
       toast({
         variant: 'destructive',
         title: 'Export Failed',
         description: 'Video public ID is missing. Cannot process video.',
       });
       return;
    }

    setIsExporting(true);
    toast({
      title: 'Starting Video Export',
      description: 'Your video is being processed with subtitles. This may take a few minutes.'
    });

    try {
      const response = await fetch('/api/burn-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoPublicId, subtitles }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to start video processing.');
      }
      
      toast({
        title: 'Processing Complete!',
        description: 'Your video is now being downloaded.'
      });

      const processedFilename = `${videoName.split('.')[0]}-with-subtitles.mp4`;
      downloadFile(result.videoWithSubtitlesUrl, processedFilename);

    } catch (error) {
      console.error('Failed to export video with subtitles:', error);
       const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: errorMessage,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadOriginal = () => {
    downloadFile(videoUrl, videoName);
  }


  return (
    <div className="container mx-auto p-4">
      <SubtitleStyler fontFamily={subtitleFont} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
           <Button variant="outline" size="icon" onClick={onReset}>
            <ArrowLeft />
          </Button>
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
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="secondary" onClick={onReset}>
            <Upload className="mr-2" /> Upload New Video
          </Button>
          <Button onClick={handleDownloadOriginal} variant="outline">
            <Download className="mr-2" /> Download Video
          </Button>
          <Button onClick={() => handleExport('srt')} variant="outline">
            <Download className="mr-2" /> Export SRT
          </Button>
          <Button onClick={() => handleExport('vtt')} variant="outline">
            <Download className="mr-2" /> Export VTT
          </Button>
          <Button onClick={handleExportVideoWithSubtitles} disabled={isExporting || !videoPublicId}>
            {isExporting ? (
                <Loader2 className="mr-2 animate-spin" />
            ) : (
                <Film className="mr-2" />
            )}
            Export Video with Subtitles
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <VideoPlayer
          videoUrl={videoUrl}
          subtitles={subtitles}
          onTimeUpdate={onTimeUpdate}
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
