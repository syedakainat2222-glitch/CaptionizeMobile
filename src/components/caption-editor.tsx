'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import VideoUpload from '@/components/video-upload';
import EditorView from '@/components/editor-view';
import { useToast } from '@/hooks/use-toast';
import { parseSrt, type Subtitle } from '@/lib/srt';
import CorrectionDialog from '@/components/correction-dialog';
import VideoLibrary from './video-library';
import { fetchVideoLibrary, addVideo, updateVideo, deleteVideo, getVideo } from '@/lib/video-service';
import type { Video } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

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
      return { past: newPast, present: newPresent, future: [currentState.present, ...currentState.future] };
    });
  }, []);
  const redo = useCallback(() => {
    setState(currentState => {
      if (currentState.future.length === 0) return currentState;
      const newPresent = currentState.future[0];
      const newFuture = currentState.future.slice(1);
      return { past: [...currentState.past, currentState.present], present: newPresent, future: newFuture };
    });
  }, []);
  return { state: state.present, set, undo, redo, canUndo: state.past.length > 0, canRedo: state.future.length > 0 };
};

type CorrectionDialogState = { open: boolean; subtitleId: number | null; suggestion: string | null; explanation: string | null; isLoading: boolean; };

const toDate = (timestamp: Timestamp | Date | undefined | null): Date => {
  if (!timestamp) return new Date();
  if (timestamp instanceof Timestamp) return timestamp.toDate();
  if (timestamp instanceof Date) return timestamp;
  return new Date(timestamp);
};

export default function CaptionEditor() {
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const { state: subtitles, set: setSubtitles, undo: undoSubtitles, redo: redoSubtitles, canUndo, canRedo } = useHistory<Subtitle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isFetchingLibrary, setIsFetchingLibrary] = useState(true);
  const [activeSubtitleId, setActiveSubtitleId] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [subtitleFont, setSubtitleFont] = useState('Arial, sans-serif');
  const [subtitleFontSize, setSubtitleFontSize] = useState(48);
  const [subtitleColor, setSubtitleColor] = useState('#FFFFFF');
  const [subtitleOutlineColor, setSubtitleOutlineColor] = useState('transparent');
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const { toast } = useToast();
  const [videoLibrary, setVideoLibrary] = useState<Video[]>([]);
  const [language, setLanguage] = useState<string>('auto');
  const [correctionDialogState, setCorrectionDialogState] = useState<CorrectionDialogState>({ open: false, subtitleId: null, suggestion: null, explanation: null, isLoading: false });
  const [pollingIntervalId, setPollingIntervalId] = useState<NodeJS.Timeout | null>(null);

  const loadVideoLibrary = useCallback(async () => {
    setIsFetchingLibrary(true);
    try {
      const videos = await fetchVideoLibrary();
      setVideoLibrary(videos);
      const processingVideo = videos.find(v => v.status === 'processing');
      if (processingVideo) {
        setCurrentVideo(processingVideo);
        startPolling(processingVideo.id);
      }
    } catch (error) {
      console.error("Failed to fetch video library:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not load your video library.' });
    } finally {
      setIsFetchingLibrary(false);
    }
  }, [toast]);

  const startPolling = useCallback((videoId: string) => {
    if (pollingIntervalId) clearInterval(pollingIntervalId);

    const intervalId = setInterval(async () => {
      try {
        const video = await getVideo(videoId);
        if (video && video.status === 'completed') {
          if (pollingIntervalId) clearInterval(pollingIntervalId);
          setPollingIntervalId(null);
          const updatedVideo = { ...video, subtitles: parseSrt(video.subtitles as any) };
          setCurrentVideo(updatedVideo);
          setVideoLibrary(prev => prev.map(v => v.id === videoId ? updatedVideo : v));
          toast({ title: 'Success!', description: 'Subtitles ready and video is saved.' });
        }
      } catch (error) {
        console.error('Polling error:', error);
        if (pollingIntervalId) clearInterval(pollingIntervalId);
        setPollingIntervalId(null);
      }
    }, 5000); // Poll every 5 seconds

    setPollingIntervalId(intervalId);
  }, [pollingIntervalId, toast]);

  useEffect(() => {
    loadVideoLibrary();
    return () => {
      if (pollingIntervalId) clearInterval(pollingIntervalId);
    };
  }, [loadVideoLibrary]);

  useEffect(() => {
    if (currentVideo) {
        setSubtitles(currentVideo.subtitles || []);
        setSubtitleFont(currentVideo.subtitleFont || 'Arial, sans-serif');
        setSubtitleFontSize(currentVideo.subtitleFontSize || 48);
        setSubtitleColor(currentVideo.subtitleColor || '#FFFFFF');
        setSubtitleOutlineColor(currentVideo.subtitleOutlineColor || 'transparent');
        setIsBold(currentVideo.isBold || false);
        setIsItalic(currentVideo.isItalic || false);
        setIsUnderline(currentVideo.isUnderline || false);
    } else {
        setSubtitles([]);
    }
  }, [currentVideo, setSubtitles]);

  const handleVideoSelect = useCallback(async (result: { publicId: string; fileName: string; secureUrl: string }) => {
    setIsLoading(true);
    try {
        const newVideoData: Omit<Video, 'id' | 'createdAt'> = {
            name: result.fileName,
            videoUrl: result.secureUrl, 
            publicId: result.publicId,
            userId: 'dev-user', 
            subtitles: [],
            status: 'processing',
            updatedAt: Timestamp.now(),
        };

        const newVideoId = await addVideo(newVideoData);
        const processingVideo: Video = { ...newVideoData, id: newVideoId, createdAt: Timestamp.now() };

        setVideoLibrary(prev => [processingVideo, ...prev].sort((a,b) => toDate(b.updatedAt).getTime() - toDate(a.updatedAt).getTime()));
        setCurrentVideo(processingVideo);

        const response = await fetch('/api/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                cloudinaryPublicId: result.publicId, 
                languageCode: language === 'auto' ? undefined : language,
                videoId: newVideoId 
            }),
        });

        if (!response.ok) throw new Error(await response.text());
        
        // Start polling for this new video
        startPolling(newVideoId);

        toast({ title: 'Processing Started', description: 'Your video is being processed. Subtitles will appear when ready.' });

    } catch (error: any) {
        console.error('Processing failed:', error);
        toast({ variant: 'destructive', title: 'An error occurred.', description: error.message || 'Failed to process video. Please try again.' });
        setCurrentVideo(null); // Clear video on failure
    } finally {
        setIsLoading(false);
    }
  }, [toast, language, startPolling]);

  // ... (All other handlers: handleTimeUpdate, handlePlayPause, etc. remain unchanged) ...


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
          {currentVideo.status === 'processing' && (
            <div className="flex flex-1 flex-col items-center justify-center space-y-4">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
                <p className="text-lg text-muted-foreground">Processing video... subtitles will appear automatically when ready.</p>
            </div>
          )}
          {currentVideo.status === 'completed' && (
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
          )}
          <CorrectionDialog
            state={correctionDialogState}
            onOpenChange={(isOpen) => setCorrectionDialogState({ ...correctionDialogState, open: isOpen })}
            onAccept={handleAcceptSuggestion}
          />
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center p-4">
          <div className="w-full max-w-6xl space-y-8">
            <VideoUpload onVideoSelect={handleVideoSelect} isLoading={isLoading} language={language} onLanguageChange={setLanguage} />
            <VideoLibrary videos={videoLibrary} onSelectVideo={handleSelectVideoFromLibrary} onDeleteVideo={handleDeleteVideo} />
          </div>
        </div>
      )}
    </div>
  );
}

// Keep all other functions like handleTimeUpdate, updateSubtitle etc. the same.
// I've omitted them here for brevity but they should be included in the final file.

