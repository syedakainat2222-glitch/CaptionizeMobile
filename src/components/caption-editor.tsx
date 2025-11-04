'use client';

import { useState, useCallback, useEffect } from 'react';
import VideoUpload from '@/components/video-upload';
import EditorView from '@/components/editor-view';
import { generateSubtitles } from '@/ai/flows/automatic-subtitle-generation';
import { useToast } from '@/hooks/use-toast';
import { parseSrt, type Subtitle } from '@/lib/srt';
import { aiSuggestedCorrections } from '@/ai/flows/ai-suggested-corrections';
import CorrectionDialog from '@/components/correction-dialog';
import VideoLibrary from './video-library';
import { fetchVideoLibrary, addVideo, updateVideo } from '@/lib/video-service';
import type { Video } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

type CorrectionDialogState = {
  open: boolean;
  subtitleId: number | null;
  suggestion: string | null;
  explanation: string | null;
  isLoading: boolean;
};

export default function CaptionEditor() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingLibrary, setIsFetchingLibrary] = useState(true);
  const [activeSubtitleId, setActiveSubtitleId] = useState<number | null>(null);
  const [subtitleFont, setSubtitleFont] = useState('Inter, sans-serif');
  const { toast } = useToast();
  const [videoLibrary, setVideoLibrary] = useState<Video[]>([]);

  const [correctionDialogState, setCorrectionDialogState] =
    useState<CorrectionDialogState>({
      open: false,
      subtitleId: null,
      suggestion: null,
      explanation: null,
      isLoading: false,
    });

  const loadVideoLibrary = useCallback(async () => {
    setIsFetchingLibrary(true);
    try {
      const videos = await fetchVideoLibrary();
      setVideoLibrary(videos as Video[]);
    } catch (error) {
      console.error("Failed to fetch video library:", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not load your video library.',
      });
    } finally {
      setIsFetchingLibrary(false);
    }
  }, [toast]);

  useEffect(() => {
    loadVideoLibrary();
  }, [loadVideoLibrary]);
  
  const handleVideoSelect = useCallback(
    async (file: File) => {
      setVideoFile(file);
      setIsLoading(true);

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const videoDataUri = reader.result as string;
          
          const uploadResponse = await fetch('/api/upload-video', {
            method: 'POST',
            body: JSON.stringify({ videoDataUri }),
            headers: { 'Content-Type': 'application/json' }
          });
          
          const uploadResult = await uploadResponse.json();

          if (!uploadResponse.ok) {
            throw new Error(uploadResult.error || 'Failed to upload video.');
          }

          const { videoUrl } = uploadResult;

          if (!videoUrl) {
            throw new Error('Could not get video URL after upload.');
          }

          const result = await generateSubtitles({
            videoUrl,
          });

          if (!result || !result.subtitles) {
            throw new Error('Subtitle generation returned an empty result.');
          }

          const parsedSubs = parseSrt(result.subtitles);
          
          const newVideoData = {
            name: file.name,
            videoUrl: videoUrl,
            subtitles: parsedSubs,
            updatedAt: new Date().toISOString(),
          };

          const newVideoId = await addVideo(newVideoData);
          
          const savedVideo: Video = {
             ...newVideoData,
             id: newVideoId,
             userId: '', // This will be set by the service
             createdAt: Timestamp.now(), // Firestore timestamp will be different
             updatedAt: Timestamp.fromDate(new Date(newVideoData.updatedAt))
          }
          
          setCurrentVideo(savedVideo);
          setSubtitles(savedVideo.subtitles);
          setVideoLibrary(prevLibrary => [savedVideo, ...prevLibrary].sort((a,b) => b.updatedAt.toMillis() - a.updatedAt.toMillis()));
          
          toast({
            title: 'Success!',
            description: 'Subtitles generated and video saved.',
          });

        } catch (error: any) {
          console.error('Processing failed:', error);
          toast({
            variant: 'destructive',
            title: 'An error occurred.',
            description:
              error.message || 'Failed to process video. Please try again.',
          });
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

  const updateSubtitle = useCallback(async (id: number, newText: string) => {
    const newSubtitles = subtitles.map((sub) => (sub.id === id ? { ...sub, text: newText } : sub));
    setSubtitles(newSubtitles);

    if (currentVideo) {
      const updateData = { 
        subtitles: newSubtitles,
        updatedAt: new Date().toISOString(),
      };
      await updateVideo(currentVideo.id, updateData);
      
      const updatedTimestamp = Timestamp.fromDate(new Date(updateData.updatedAt));
      setVideoLibrary(prev => prev.map(v => v.id === currentVideo.id ? {...v, subtitles: newSubtitles, updatedAt: updatedTimestamp} : v));
      
      toast({
        title: 'Saved!',
        description: 'Your subtitle changes have been saved.',
      });
    }
  }, [subtitles, currentVideo, toast]);

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
        setCorrectionDialogState({ ...correctionDialogState, open: false, isLoading: false, suggestion: null, explanation: null });
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
    setCurrentVideo(null);
    setVideoFile(null);
    setSubtitles([]);
    setActiveSubtitleId(null);
    loadVideoLibrary(); // Refresh library when returning to the list
  }, [loadVideoLibrary]);

  const handleSelectVideoFromLibrary = (video: Video) => {
    setCurrentVideo(video);
    setSubtitles(video.subtitles);
  };
  
  if (isFetchingLibrary) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      {currentVideo ? (
        <>
          <EditorView
            videoUrl={currentVideo.videoUrl}
            subtitles={subtitles}
            activeSubtitleId={activeSubtitleId}
            onTimeUpdate={handleTimeUpdate}
            onUpdateSubtitle={updateSubtitle}
            onSuggestCorrection={handleSuggestCorrection}
            onReset={handleReset}
            subtitleFont={subtitleFont}
            onSubtitleFontChange={setSubtitleFont}
          />
          <CorrectionDialog
            state={correctionDialogState}
            onOpenChange={(isOpen) =>
              setCorrectionDialogState({ ...correctionDialogState, open: isOpen })
            }
            onAccept={handleAcceptSuggestion}
          />
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center p-4">
          <div className="w-full max-w-6xl space-y-8">
            <VideoUpload onVideoSelect={handleVideoSelect} isLoading={isLoading} />
            <VideoLibrary videos={videoLibrary} onSelectVideo={handleSelectVideoFromLibrary} />
          </div>
        </div>
      )}
    </div>
  );
}
