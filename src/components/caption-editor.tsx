'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import VideoUpload from '@/components/video-upload';
import EditorView from '@/components/editor-view';
import { useToast } from '@/hooks/use-toast';
import { parseSrt, type Subtitle } from '@/lib/srt';
import CorrectionDialog from '@/components/correction-dialog';
import VideoLibrary from './video-library';
import { fetchVideoLibrary, addVideo, updateVideo, deleteVideo } from '@/lib/video-service';
import type { Video } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

// Custom hook for managing undo/redo state
const useHistory = <T extends unknown>(initialState: T) => {
  const [state, setState] = useState({ past: [] as T[], present: initialState, future: [] as T[] });

  const set = useCallback((newState: T) => {
    setState(currentState => ({
      past: [...currentState.past, currentState.present],
      present: newState,
      future: [],
    }));
  }, []);

  const undo = useCallback(() => {
    setState(currentState => {
      if (currentState.past.length === 0) return currentState;
      const newPresent = currentState.past[currentState.past.length - 1];
      const newPast = currentState.past.slice(0, currentState.past.length - 1);
      return {
        past: newPast,
        present: newPresent,
        future: [currentState.present, ...currentState.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState(currentState => {
      if (currentState.future.length === 0) return currentState;
      const newPresent = currentState.future[0];
      const newFuture = currentState.future.slice(1);
      return {
        past: [...currentState.past, currentState.present],
        present: newPresent,
        future: newFuture,
      };
    });
  }, []);

  return { state: state.present, set, undo, redo, canUndo: state.past.length > 0, canRedo: state.future.length > 0 };
};

type CorrectionDialogState = {
  open: boolean;
  subtitleId: number | null;
  suggestion: string | null;
  explanation: string | null;
  isLoading: boolean;
};

const toDate = (timestamp: Timestamp | Date | undefined | null): Date => {
  if (!timestamp) {
    return new Date();
  }
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  return new Date(timestamp);
};

export default function CaptionEditor() {
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const { state: subtitles, set: setSubtitles, undo: undoSubtitles, redo: redoSubtitles, canUndo, canRedo } = useHistory<Subtitle[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isFetchingLibrary, setIsFetchingLibrary] = useState(true);
  const [activeSubtitleId, setActiveSubtitleId] = useState<number | null>(null);

  // New state for player control
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const [subtitleFont, setSubtitleFont] = useState('Arial, sans-serif');
  const [subtitleFontSize, setSubtitleFontSize] = useState(48);
  const [subtitleColor, setSubtitleColor] = useState('#FFFFFF');
  const [subtitleBackgroundColor, setSubtitleBackgroundColor] = useState('rgba(0,0,0,0.5)');
  const [subtitleOutlineColor, setSubtitleOutlineColor] = useState('transparent');
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);

  const { toast } = useToast();
  const [videoLibrary, setVideoLibrary] = useState<Video[]>([]);
  const [language, setLanguage] = useState<string>('auto');

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
  }, [toast]);

  useEffect(() => {
    loadVideoLibrary();
  }, [loadVideoLibrary]);

  useEffect(() => {
    if (currentVideo) {
      setSubtitles(currentVideo.subtitles);
      setSubtitleFont(currentVideo.subtitleFont || 'Arial, sans-serif');
      setSubtitleFontSize(currentVideo.subtitleFontSize || 48);
      setSubtitleColor(currentVideo.subtitleColor || '#FFFFFF');
      setSubtitleBackgroundColor(currentVideo.subtitleBackgroundColor || 'rgba(0,0,0,0.5)');
      setSubtitleOutlineColor(currentVideo.subtitleOutlineColor || 'transparent');
      setIsBold(currentVideo.isBold || false);
      setIsItalic(currentVideo.isItalic || false);
      setIsUnderline(currentVideo.isUnderline || false);
    } else {
      setSubtitles([]);
      setSubtitleFont('Arial, sans-serif');
      setSubtitleFontSize(48);
      setSubtitleColor('#FFFFFF');
      setSubtitleBackgroundColor('rgba(0,0,0,0.5)');
      setSubtitleOutlineColor('transparent');
      setIsBold(false);
      setIsItalic(false);
      setIsUnderline(false);
    }
  }, [currentVideo, setSubtitles]);
  
  const handleVideoSelect = useCallback(
    async (result: { publicId: string; fileName: string; secureUrl: string }) => {
      setIsLoading(true);

      try {
        const response = await fetch('/api/process', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cloudinaryPublicId: result.publicId,
            languageCode: language === 'auto' ? undefined : language,
          }),
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const flowResult = await response.json();

        if (!flowResult || !flowResult.subtitles || !flowResult.videoUrl) {
          throw new Error('Video processing returned an incomplete result. Missing subtitles or videoUrl.');
        }

        const parsedSubs = parseSrt(flowResult.subtitles);
        
        const newVideoData: Omit<Video, 'id' | 'createdAt'> = {
          name: result.fileName,
          videoUrl: flowResult.videoUrl,
          publicId: result.publicId,
          userId: 'dev-user',
          subtitles: parsedSubs,
          subtitleFont: 'Arial, sans-serif',
          subtitleFontSize: 48,
          subtitleColor: '#FFFFFF',
          subtitleBackgroundColor: 'rgba(0,0,0,0.5)',
          subtitleOutlineColor: 'transparent',
          isBold: false,
          isItalic: false,
          isUnderline: false,
          updatedAt: Timestamp.now(),
        };

        const newVideoId = await addVideo(newVideoData);
        
        const savedVideo: Video = {
           ...newVideoData,
           id: newVideoId,
           createdAt: Timestamp.now(), 
        }
        
        setCurrentVideo(savedVideo);
        setVideoLibrary(prevLibrary => [savedVideo, ...prevLibrary].sort((a,b) => toDate(b.updatedAt).getTime() - toDate(a.updatedAt).getTime()));
        
        toast({
          title: 'Success!',
          description: 'Subtitles generated and video saved.',
        });

      } catch (error: any) {
        console.error('Processing failed:', error);
        toast({
          variant: 'destructive',
          title: 'An error occurred.',
          description: error.message || 'Failed to process video. Please try again.',
        });
      } finally {
        setIsLoading(false);
      }
    },
    [toast, language]
  );

  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
    const vttTimeToSeconds = (vttTime: string | undefined) => {
      if (!vttTime) return 0;
      const parts = vttTime.split(':').map(parseFloat);
      if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
      if (parts.length === 2) return parts[0] * 60 + parts[1];
      return 0;
    };
    const activeSub = subtitles.find(
      (sub) =>
        sub &&
        time >= vttTimeToSeconds(sub.startTime) &&
        time <= vttTimeToSeconds(sub.endTime)
    );
    setActiveSubtitleId(activeSub ? activeSub.id : null);
  }, [subtitles]);

  const handlePlayPause = useCallback(() => {
      setIsPlaying(prev => !prev);
  }, []);

  const handleSeek = (time: number) => {
      if (videoRef.current && isFinite(videoRef.current.duration)) {
          videoRef.current.currentTime = time;
          setCurrentTime(time);
      }
  };

  const handleLoadedMetadata = () => {
      if (videoRef.current) {
          setDuration(videoRef.current.duration);
      }
  };

  const updateSubtitle = useCallback(async (id: number, newText: string) => {
    const newSubtitles = subtitles.map((sub) => (sub.id === id ? { ...sub, text: newText } : sub));
    setSubtitles(newSubtitles);

    if (currentVideo) {
      const updatedTimestamp = Timestamp.now();
      const updateData = { 
        subtitles: newSubtitles,
        updatedAt: updatedTimestamp,
      };
      await updateVideo(currentVideo.id, updateData);
      
      setVideoLibrary(prev => prev.map(v => v.id === currentVideo.id ? {...v, subtitles: newSubtitles, updatedAt: updatedTimestamp} : v)
      .sort((a,b) => toDate(b.updatedAt).getTime() - toDate(a.updatedAt).getTime()));
      
      toast({
        title: 'Saved!',
        description: 'Your subtitle changes have been saved.',
      });
    }
  }, [subtitles, currentVideo, toast, setSubtitles]);

  const handleUpdateSubtitles = useCallback(async (newSubtitles: Subtitle[]) => {
    if (currentVideo) {
      const updatedTimestamp = Timestamp.now();
      const newCurrentVideo = { 
        ...currentVideo, 
        subtitles: newSubtitles,
        updatedAt: updatedTimestamp,
      };

      setCurrentVideo(newCurrentVideo);
      setSubtitles(newSubtitles);
      await updateVideo(currentVideo.id, { 
        subtitles: newSubtitles,
        updatedAt: updatedTimestamp,
      });

      setVideoLibrary(prev => prev.map(v => v.id === currentVideo.id ? newCurrentVideo : v)
      .sort((a,b) => toDate(b.updatedAt).getTime() - toDate(a.updatedAt).getTime()));

      toast({
        title: 'Saved!',
        description: 'Your translated subtitles have been saved.',
      });
    }
  }, [currentVideo, toast, setSubtitles]);

  const handleUpdateSubtitleTime = useCallback(async (id: number, startTime: string, endTime: string) => {
    const newSubtitles = subtitles.map((sub) => (sub.id === id ? { ...sub, startTime, endTime } : sub));
    setSubtitles(newSubtitles);

    if (currentVideo) {
      const updatedTimestamp = Timestamp.now();
      const updateData = { 
        subtitles: newSubtitles,
        updatedAt: updatedTimestamp,
      };
      await updateVideo(currentVideo.id, updateData);
      
      setVideoLibrary(prev => prev.map(v => v.id === currentVideo.id ? {...v, subtitles: newSubtitles, updatedAt: updatedTimestamp} : v)
      .sort((a,b) => toDate(b.updatedAt).getTime() - toDate(a.updatedAt).getTime()));
      
      toast({
        title: 'Saved!',
        description: 'Your subtitle timing has been updated.',
      });
    }
  }, [subtitles, currentVideo, toast, setSubtitles]);

    const handleSplit = useCallback(() => {
    if (activeSubtitleId === null) return;

    const vttTimeToSeconds = (vttTime: string | undefined): number => {
        if (!vttTime) return 0;
        const parts = vttTime.split(':').map(parseFloat);
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
        if (parts.length === 2) return parts[0] * 60 + parts[1];
        return 0;
    };

    const secondsToVtt = (seconds: number): string => {
        const date = new Date(0);
        date.setSeconds(seconds);
        return date.toISOString().substr(11, 12);
    }

    const activeSub = subtitles.find(s => s.id === activeSubtitleId);
    if (!activeSub) return;

    const subStartTime = vttTimeToSeconds(activeSub.startTime);
    const subEndTime = vttTimeToSeconds(activeSub.endTime);
    const splitTime = currentTime;

    if (splitTime <= subStartTime || splitTime >= subEndTime) return; // Cannot split at the edges

    const splitRatio = (splitTime - subStartTime) / (subEndTime - subStartTime);
    const text = activeSub.text;
    const splitIndex = Math.round(text.length * splitRatio);

    const newSub1: Subtitle = {
        ...activeSub,
        endTime: secondsToVtt(splitTime),
        text: text.substring(0, splitIndex),
    };
    const newSub2: Subtitle = {
        ...activeSub,
        id: Math.max(...subtitles.map(s => s.id)) + 1, // Ensure unique ID
        startTime: secondsToVtt(splitTime),
        text: text.substring(splitIndex),
    };

    const newSubtitles = subtitles.map(s => s.id === activeSubtitleId ? newSub1 : s);
    const activeSubIndex = newSubtitles.findIndex(s => s.id === activeSubtitleId);
    newSubtitles.splice(activeSubIndex + 1, 0, newSub2);

    setSubtitles(newSubtitles.map((sub, index) => ({ ...sub, id: index + 1 }))); // Re-index all subtitles
    toast({ title: 'Split!', description: 'Subtitle split at the current time.'});
  }, [subtitles, activeSubtitleId, currentTime, setSubtitles, toast]);
  
  const handleDeleteSubtitle = useCallback((id: number) => {
    const newSubtitles = subtitles.filter(sub => sub.id !== id).map((sub, index) => ({ ...sub, id: index + 1 }));
    setSubtitles(newSubtitles);
    toast({
      title: 'Subtitle Deleted',
      description: 'The subtitle has been removed.',
    });
  }, [subtitles, setSubtitles, toast]);

  const handleTranslate = useCallback(async (targetLanguage: string) => {
    if (!currentVideo) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          subtitles, 
          targetLanguage 
        }),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Translation failed');
      }
  
      const { subtitles: translatedSubtitles } = await response.json();
      handleUpdateSubtitles(translatedSubtitles);
      
      toast({
        title: 'Translation Complete!',
        description: `Subtitles translated to ${targetLanguage}`,
      });
      
    } catch (error: any) {
      console.error('Translation failed:', error);
      toast({
        variant: 'destructive',
        title: 'Translation Failed',
        description: error.message || 'Could not translate subtitles',
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentVideo, subtitles, handleUpdateSubtitles, toast]);

  const handleStyleChange = useCallback(async (update: Partial<Video>) => {
    if (currentVideo) {
        const updatedTimestamp = Timestamp.now();
        const updateData = { ...update, updatedAt: updatedTimestamp };

        if (update.subtitleFont) setSubtitleFont(update.subtitleFont);
        if (update.subtitleFontSize) setSubtitleFontSize(update.subtitleFontSize);
        if (update.subtitleColor) setSubtitleColor(update.subtitleColor);
        if (update.subtitleBackgroundColor) setSubtitleBackgroundColor(update.subtitleBackgroundColor);
        if (update.subtitleOutlineColor) setSubtitleOutlineColor(update.subtitleOutlineColor);
        if (update.isBold !== undefined) setIsBold(update.isBold);
        if (update.isItalic !== undefined) setIsItalic(update.isItalic);
        if (update.isUnderline !== undefined) setIsUnderline(update.isUnderline);

        const newCurrentVideo = { ...currentVideo, ...updateData };
        setCurrentVideo(newCurrentVideo);
        
        setVideoLibrary(prev =>
            prev.map(v => (v.id === currentVideo.id ? newCurrentVideo : v))
            .sort((a, b) => toDate(b.updatedAt).getTime() - toDate(a.updatedAt).getTime())
        );
        
        await updateVideo(currentVideo.id, updateData);

        toast({
            title: 'Style Saved!',
            description: `Your subtitle style has been updated.`,
        });
    }
  }, [currentVideo, toast]);

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

        const response = await fetch('/api/corrections', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            subtitleText: subtitle.text,
            context: context,
          }),
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const result = await response.json();

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
    setActiveSubtitleId(null);
    loadVideoLibrary();
  }, [loadVideoLibrary]);

  const handleSelectVideoFromLibrary = (video: Video) => {
    console.log("Selected video from library:", video);
    setCurrentVideo(video);
  };
  
  const handleDeleteVideo = useCallback(async (videoId: string) => {
    try {
      await deleteVideo(videoId);
      setVideoLibrary(prev => prev.filter(v => v.id !== videoId));
      if (currentVideo?.id === videoId) {
        handleReset();
      }
      toast({
        title: 'Video Deleted',
        description: 'The video has been successfully removed.',
      });
    } catch (error) {
      console.error('Failed to delete video:', error);
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: 'Could not delete the video. Please try again.',
      });
    }
  }, [toast, currentVideo, handleReset]);

  const handleExportVideoWithSubtitles = useCallback(async () => {
    if (!currentVideo) return;

    setIsExporting(true);
    toast({
      title: 'Starting Export...',
      description: 'Your video with subtitles is being prepared. This may take a few minutes.',
    });

    try {
      const payload = {
        videoPublicId: currentVideo.publicId,
        subtitles,
        videoName: currentVideo.name,
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
      
      const result = await response.json();

      if (!response.ok || !result.success) {
          throw new Error(result.error || `Failed to process video. Status: ${response.status}`);
      }

      // Redirect the user to the download URL
      window.location.href = result.downloadUrl;

      toast({
        title: 'Export in Progress!',
        description: `Your download will begin shortly.`,
      });
    } catch (error: any) {
      console.error('Export failed:', error);
  
      let errorMessage = 'Could not export the video with subtitles. Please try again.';
      if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: errorMessage,
      });
    } finally {
      setIsExporting(false);
    }
  }, [currentVideo, subtitles, subtitleFont, subtitleFontSize, subtitleColor, subtitleBackgroundColor, subtitleOutlineColor, isBold, isItalic, isUnderline, toast]);
  
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
            videoRef={videoRef}
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            onPlayPause={handlePlayPause}
            onSeek={handleSeek}
            onLoadedMetadata={handleLoadedMetadata}
            videoUrl={currentVideo.videoUrl}
            videoPublicId={currentVideo.publicId}
            videoName={currentVideo.name}
            subtitles={subtitles}
            onUpdateSubtitles={handleUpdateSubtitles}
            activeSubtitleId={activeSubtitleId}
            onTimeUpdate={handleTimeUpdate}
            onUpdateSubtitle={updateSubtitle}
            onSuggestCorrection={handleSuggestCorrection}
            onReset={handleReset}
            isExporting={isExporting}
            onExportVideo={handleExportVideoWithSubtitles}
            subtitleFont={subtitleFont}
            subtitleFontSize={subtitleFontSize}
            subtitleColor={subtitleColor}
            subtitleBackgroundColor={subtitleBackgroundColor}
            subtitleOutlineColor={subtitleOutlineColor}
            isBold={isBold}
            isItalic={isItalic}
            isUnderline={isUnderline}
            onStyleChange={handleStyleChange}
            onTranslate={handleTranslate}
            onSplit={handleSplit}
            onUndo={undoSubtitles}
            onRedo={redoSubtitles}
            canUndo={canUndo}
            canRedo={canRedo}
            onDeleteSubtitle={handleDeleteSubtitle}
            onUpdateSubtitleTime={handleUpdateSubtitleTime}
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
            <VideoUpload
              onVideoSelect={handleVideoSelect}
              isLoading={isLoading}
              language={language}
              onLanguageChange={setLanguage}
            />
            <VideoLibrary videos={videoLibrary} onSelectVideo={handleSelectVideoFromLibrary} onDeleteVideo={handleDeleteVideo} />
          </div>
        </div>
      )}
    </div>
  );
}
