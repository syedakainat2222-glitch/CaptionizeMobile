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
import { getVideos, saveVideo, updateVideoSubtitles } from '@/lib/video-service';
import type { Video } from '@/lib/types';
import { Loader2 } from 'lucide-react';

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

  const fetchVideoLibrary = useCallback(async () => {
    setIsFetchingLibrary(true);
    const videos = await getVideos();
    setVideoLibrary(videos);
    setIsFetchingLibrary(false);
  }, []);

  useEffect(() => {
    fetchVideoLibrary();
  }, [fetchVideoLibrary]);
  
  const handleVideoSelect = useCallback(
    async (file: File) => {
      setVideoFile(file);
      setIsLoading(true);

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const videoDataUri = reader.result as string;
          
          // Step 1: Upload video to our server, which uploads to Cloudinary
          const uploadResponse = await fetch('/api/upload-video', {
            method: 'POST',
            body: JSON.stringify({ videoDataUri }),
            headers: { 'Content-Type': 'application/json' }
          });
          
          if (!uploadResponse.ok) {
            throw new Error('Failed to upload video.');
          }

          const { videoUrl } = await uploadResponse.json();

          if (!videoUrl) {
            throw new Error('Could not get video URL after upload.');
          }

          // Step 2: Generate subtitles using the now public video URL
          const result = await generateSubtitles({
            videoUrl,
          });

          if (!result || !result.subtitles) {
            throw new Error('Subtitle generation returned an empty result.');
          }

          const parsedSubs = parseSrt(result.subtitles);
          setSubtitles(parsedSubs);
          
          // Step 3: Save video metadata to Firestore
          const newVideo: Omit<Video, 'id' | 'createdAt' | 'updatedAt'> = {
            name: file.name,
            videoUrl: videoUrl,
            subtitles: parsedSubs,
          };

          const newVideoId = await saveVideo(newVideo);

          if (newVideoId) {
             const savedVideo = await getVideos().then(videos => videos.find(v => v.id === newVideoId));
             if (savedVideo) {
                setCurrentVideo(savedVideo);
                setSubtitles(savedVideo.subtitles);
                await fetchVideoLibrary();
             }
          }
          
          toast({
            title: 'Success!',
            description: 'Subtitles generated and video saved.',
          });

        } catch (error) {
          console.error('Processing failed:', error);
          toast({
            variant: 'destructive',
            title: 'An error occurred.',
            description:
              'Failed to process video. Please try again.',
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
    [toast, fetchVideoLibrary]
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
      await updateVideoSubtitles(currentVideo.id, newSubtitles);
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
    setIsLoading(false);
    setActiveSubtitleId(null);
    fetchVideoLibrary();
  }, [fetchVideoLibrary]);

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
