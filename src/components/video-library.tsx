'use client';

import type { Video } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from './ui/button';
import { formatDistanceToNow } from 'date-fns';
import { PlayCircle, Trash2 } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

type VideoLibraryProps = {
  videos: Video[];
  onSelectVideo: (video: Video) => void;
  onDeleteVideo: (videoId: string) => void;
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

export default function VideoLibrary({ videos, onSelectVideo, onDeleteVideo }: VideoLibraryProps) {
  return (
    <Card className="w-full shadow-lg">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="font-headline text-xl sm:text-2xl">Video Library</CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Select a video to edit or delete.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 sm:p-6 sm:pt-0">
        <div className="overflow-auto pr-4 sm:pr-0">
          <div className="space-y-2 sm:space-y-4">
            {videos.length > 0 ? (
              videos.map((video) => (
                <div
                  key={video.id}
                  className="flex items-center justify-between rounded-lg border p-2 sm:p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex-1 overflow-hidden group">
                    <p className="font-semibold truncate group-hover:whitespace-normal group-hover:overflow-visible text-sm sm:text-base">
                        {video.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Updated: {formatDistanceToNow(toDate(video.updatedAt), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex items-center ml-2 sm:ml-4">
                    <Button variant="ghost" size="icon" onClick={() => onSelectVideo(video)} className="h-8 w-8 sm:h-auto sm:w-auto">
                      <PlayCircle className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onDeleteVideo(video.id); }} className="h-8 w-8 sm:h-auto sm:w-auto">
                      <Trash2 className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground p-8">
                <p className="text-sm sm:text-base">Your videos will appear here.</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
