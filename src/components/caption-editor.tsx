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
import { Timestamp } from 'firebase/firestore';
import { useUser } from '@/hooks/use-user';

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
  const { user, loading: userLoading } = useUser();

  const [correctionDialogState, setCorrectionDialogState] =
    useState<CorrectionDialogState>({
      open: false,
      subtitleId: null,
      suggestion: null,
      explanation: null,
      isLoading: false,
    });

  const fetchVideoLibrary = useCallback(async () => {
    if (!user) return;
    setIsFetchingLibrary(true);
    try {
      const videos = await getVideos(user.uid);
      setVideoLibrary(videos);
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
  }, [toast, user]);

  useEffect(() => {
    if (user) {
      fetchVideoLibrary();
    }
  }, [user, fetchVideoLibrary]);
  
  const handleVideoSelect = useCallback(
    async (file: File) => {
      if (!user) {
        toast({
          variant: 'destructive',
          title: 'Authentication Error',
          description: 'You must be signed in to upload a video.',
        });
        return;
      }
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
          };

          const newVideoId = await saveVideo(user.uid, newVideoData);

          if (newVideoId) {
             const now = Timestamp.now();
             const savedVideo: Video = {
               ...newVideoData,
               id: newVideoId,
               userId: user.uid,
               createdAt: now,
               updatedAt: now,
             }
             setCurrentVideo(savedVideo);
             setSubtitles(savedVideo.subtitles);
             setVideoLibrary(prevLibrary => [savedVideo, ...prevLibrary]);
          } else {
            throw new Error('Failed to save video to database.');
          }
          
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
    [toast, user]
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

    if (currentVideo && user) {
      await updateVideoSubtitles(user.uid, currentVideo.id, newSubtitles);
      // Optimistically update the video library state
      setVideoLibrary(prev => prev.map(v => v.id === currentVideo.id ? {...v, subtitles: newSubtitles, updatedAt: Timestamp.now()} : v));
      toast({
        title: 'Saved!',
        description: 'Your subtitle changes have been saved.',
      });
    }
  }, [subtitles, currentVideo, toast, user]);

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
    fetchVideoLibrary(); // Refresh library when returning to the list
  }, [fetchVideoLibrary]);

  const handleSelectVideoFromLibrary = (video: Video) => {
    setCurrentVideo(video);
    setSubtitles(video.subtitles);
  };
  
  if (isFetchingLibrary || userLoading) {
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
