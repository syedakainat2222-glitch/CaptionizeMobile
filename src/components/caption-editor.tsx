'use client';

import { useState, useCallback, useEffect } from 'react';
import VideoUpload from '@/components/video-upload';
import EditorView from '@/components/editor-view';
import { useToast } from '@/hooks/use-toast';
import { parseSrt, type Subtitle } from '@/lib/srt';
import { aiSuggestedCorrections } from '@/ai/flows/ai-suggested-corrections';
import CorrectionDialog from '@/components/correction-dialog';
import VideoLibrary from './video-library';
import { fetchVideoLibrary, addVideo, updateVideo, deleteVideo } from '@/lib/video-service';
import type { Video } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { processVideo } from '@/ai/flows/process-video';

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
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingLibrary, setIsFetchingLibrary] = useState(true);
  const [activeSubtitleId, setActiveSubtitleId] = useState<number | null>(null);
  
  // Styling state
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
  const [language, setLanguage] = useState<string>('auto'); // Default to auto-detect

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
    // When currentVideo changes, update the styling state
    if (currentVideo) {
      setSubtitleFont(currentVideo.subtitleFont || 'Arial, sans-serif');
      setSubtitleFontSize(currentVideo.subtitleFontSize || 48);
      setSubtitleColor(currentVideo.subtitleColor || '#FFFFFF');
      setSubtitleBackgroundColor(currentVideo.subtitleBackgroundColor || 'rgba(0,0,0,0.5)');
      setSubtitleOutlineColor(currentVideo.subtitleOutlineColor || 'transparent');
      setIsBold(currentVideo.isBold || false);
      setIsItalic(currentVideo.isItalic || false);
      setIsUnderline(currentVideo.isUnderline || false);
    } else {
      // Reset to defaults
      setSubtitleFont('Arial, sans-serif');
      setSubtitleFontSize(48);
      setSubtitleColor('#FFFFFF');
      setSubtitleBackgroundColor('rgba(0,0,0,0.5)');
      setSubtitleOutlineColor('transparent');
      setIsBold(false);
      setIsItalic(false);
      setIsUnderline(false);
    }
  }, [currentVideo]);
  
  const handleVideoSelect = useCallback(
    async (file: File) => {
      setVideoFile(file);
      setIsLoading(true);

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const videoDataUri = reader.result as string;

          const result = await processVideo({
            videoDataUri,
            languageCode: language === 'auto' ? undefined : language,
          });

          if (!result || !result.subtitles || !result.videoUrl || !result.publicId) {
            throw new Error('Video processing returned an incomplete result.');
          }

          const { videoUrl, publicId, subtitles } = result;

          const parsedSubs = parseSrt(subtitles);
          
          const newVideoData: Omit<Video, 'id' | 'userId' | 'createdAt'> = {
            name: file.name,
            videoUrl: videoUrl,
            publicId: publicId,
            subtitles: parsedSubs,
            // Default styles
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
             userId: '', // This will be set by the service
             createdAt: Timestamp.now(), 
          }
          
          setCurrentVideo(savedVideo);
          setSubtitles(savedVideo.subtitles);
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
    [toast, language]
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
  }, [subtitles, currentVideo, toast]);

  const handleStyleChange = useCallback(async (update: Partial<Video>) => {
    if (currentVideo) {
        const updatedTimestamp = Timestamp.now();
        const updateData = { ...update, updatedAt: updatedTimestamp };

        // Update local state immediately for responsiveness
        if (update.subtitleFont) setSubtitleFont(update.subtitleFont);
        if (update.subtitleFontSize) setSubtitleFontSize(update.subtitleFontSize);
        if (update.subtitleColor) setSubtitleColor(update.subtitleColor);
        if (update.subtitleBackgroundColor) setSubtitleBackgroundColor(update.subtitleBackgroundColor);
        if (update.subtitleOutlineColor) setSubtitleOutlineColor(update.subtitleOutlineColor);
        if (update.isBold !== undefined) setIsBold(update.isBold);
        if (update.isItalic !== undefined) setIsItalic(update.isItalic);
        if (update.isUnderline !== undefined) setIsUnderline(update.isUnderline);

        // Update current video object
        const newCurrentVideo = { ...currentVideo, ...updateData };
        setCurrentVideo(newCurrentVideo);
        
        // Update library
        setVideoLibrary(prev =>
            prev.map(v => (v.id === currentVideo.id ? newCurrentVideo : v))
            .sort((a, b) => toDate(b.updatedAt).getTime() - toDate(a.updatedAt).getTime())
        );
        
        // Persist to Firebase
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
    console.log("Selected video from library:", video);
    setCurrentVideo(video);
    setSubtitles(video.subtitles);
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
            videoPublicId={currentVideo.publicId}
            videoName={currentVideo.name}
            subtitles={subtitles}
            activeSubtitleId={activeSubtitleId}
            onTimeUpdate={handleTimeUpdate}
            onUpdateSubtitle={updateSubtitle}
            onSuggestCorrection={handleSuggestCorrection}
            onReset={handleReset}
            subtitleFont={subtitleFont}
            subtitleFontSize={subtitleFontSize}
            subtitleColor={subtitleColor}
            subtitleBackgroundColor={subtitleBackgroundColor}
            subtitleOutlineColor={subtitleOutlineColor}
            isBold={isBold}
            isItalic={isItalic}
            isUnderline={isUnderline}
            onStyleChange={handleStyleChange}
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
