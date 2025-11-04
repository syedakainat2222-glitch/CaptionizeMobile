'use client';

import { useState, useCallback, useMemo } from 'react';
import Header from '@/components/layout/header';
import VideoUpload from '@/components/video-upload';
import EditorView from '@/components/editor-view';
import { generateSubtitlesWithSpeakerDiarization } from '@/ai/flows/speaker-diarization-for-subtitles';
import { useToast } from '@/hooks/use-toast';
import { parseSrt, type Subtitle } from '@/lib/srt';
import { aiSuggestedCorrections } from '@/ai/flows/ai-suggested-corrections';
import CorrectionDialog from '@/components/correction-dialog';

type CorrectionDialogState = {
  open: boolean;
  subtitleId: number | null;
  suggestion: string | null;
  explanation: string | null;
  isLoading: boolean;
};

export default function Home() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeSubtitleId, setActiveSubtitleId] = useState<number | null>(null);
  const { toast } = useToast();
  const [correctionDialogState, setCorrectionDialogState] =
    useState<CorrectionDialogState>({
      open: false,
      subtitleId: null,
      suggestion: null,
      explanation: null,
      isLoading: false,
    });

  const handleVideoSelect = useCallback(
    async (file: File) => {
      setVideoFile(file);
      setIsLoading(true);

      const objectUrl = URL.createObjectURL(file);
      setVideoUrl(objectUrl);

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const videoDataUri = reader.result as string;
          const result = await generateSubtitlesWithSpeakerDiarization({
            videoDataUri,
          });

          if (result && result.subtitles) {
            const parsedSubs = parseSrt(result.subtitles);
            setSubtitles(parsedSubs);
            toast({
              title: 'Success!',
              description: 'Subtitles generated successfully.',
            });
          } else {
            throw new Error('Subtitle generation returned an empty result.');
          }
        } catch (error) {
          console.error('Subtitle generation failed:', error);
          toast({
            variant: 'destructive',
            title: 'An error occurred.',
            description:
              'Failed to generate subtitles. Please try again with a different video.',
          });
          setVideoUrl(null);
          setVideoFile(null);
        } finally {
          setIsLoading(false);
        }
      };
      reader.onerror = () => {
        console.error('Failed to read file.');
        toast({
          variant: 'destructive',
          title: 'File Read Error',
          description: 'There was an error reading the selected video file.',
        });
        setIsLoading(false);
        setVideoUrl(null);
        setVideoFile(null);
      };
    },
    [toast]
  );

  const handleTimeUpdate = useCallback(
    (time: number) => {
      const srtTimeToSeconds = (srtTime: string) => {
        const [h, m, s] = srtTime.split(':');
        const [sec, ms] = s.split(',');
        return (
          parseInt(h) * 3600 +
          parseInt(m) * 60 +
          parseInt(sec) +
          parseInt(ms) / 1000
        );
      };

      const activeSub = subtitles.find(
        (sub) =>
          time >= srtTimeToSeconds(sub.startTime) &&
          time <= srtTimeToSeconds(sub.endTime)
      );
      setActiveSubtitleId(activeSub ? activeSub.id : null);
    },
    [subtitles]
  );

  const updateSubtitle = useCallback((id: number, newText: string) => {
    setSubtitles((prev) =>
      prev.map((sub) => (sub.id === id ? { ...sub, text: newText } : sub))
    );
  }, []);

  const handleSuggestCorrection = useCallback(
    async (subtitle: Subtitle) => {
      setCorrectionDialogState({
        ...correctionDialogState,
        open: true,
        isLoading: true,
        subtitleId: subtitle.id,
      });

      try {
        const contextSubtitles = subtitles.filter(
          (s) => s.id >= subtitle.id - 1 && s.id <= subtitle.id + 1
        );
        const context = contextSubtitles
          .map((s) => s.text)
          .join('\n');

        const result = await aiSuggestedCorrections({
          subtitleText: subtitle.text,
          context: context,
        });

        if (result) {
          setCorrectionDialogState({
            open: true,
            isLoading: false,
            subtitleId: subtitle.id,
            suggestion: result.suggestedCorrection,
            explanation: result.explanation,
          });
        }
      } catch (error) {
        console.error('Failed to get suggestion', error);
        toast({
          variant: 'destructive',
          title: 'Suggestion Failed',
          description: 'Could not generate a correction suggestion.',
        });
        setCorrectionDialogState({ ...correctionDialogState, open: false });
      }
    },
    [subtitles, toast, correctionDialogState]
  );

  const handleAcceptSuggestion = useCallback(() => {
    if (
      correctionDialogState.subtitleId !== null &&
      correctionDialogState.suggestion
    ) {
      updateSubtitle(
        correctionDialogState.subtitleId,
        correctionDialogState.suggestion
      );
    }
    setCorrectionDialogState({ ...correctionDialogState, open: false });
  }, [correctionDialogState, updateSubtitle]);

  const handleReset = useCallback(() => {
    setVideoFile(null);
    setVideoUrl(null);
    setSubtitles([]);
    setIsLoading(false);
    setActiveSubtitleId(null);
  }, []);

  const editorView = useMemo(
    () => (
      <EditorView
        videoUrl={videoUrl!}
        subtitles={subtitles}
        activeSubtitleId={activeSubtitleId}
        onTimeUpdate={handleTimeUpdate}
        onUpdateSubtitle={updateSubtitle}
        onSuggestCorrection={handleSuggestCorrection}
        onReset={handleReset}
      />
    ),
    [
      videoUrl,
      subtitles,
      activeSubtitleId,
      handleTimeUpdate,
      updateSubtitle,
      handleSuggestCorrection,
      handleReset,
    ]
  );
  
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        {videoUrl && !isLoading ? (
          editorView
        ) : (
          <VideoUpload onVideoSelect={handleVideoSelect} isLoading={isLoading} />
        )}
      </main>
      <CorrectionDialog
        state={correctionDialogState}
        onOpenChange={(isOpen) =>
          setCorrectionDialogState({ ...correctionDialogState, open: isOpen })
        }
        onAccept={handleAcceptSuggestion}
      />
    </div>
  );
}
