'use client';

import type { Video } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
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
      <CardHeader>
        <CardTitle className="font-headline">Video Library</CardTitle>
        <CardDescription>
          Select a previously uploaded video to continue editing, or delete it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[40vh] pr-4">
          <div className="space-y-4">
            {videos.length > 0 ? (
              videos.map((video) => (
                <div
                  key={video.id}
                  className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex-1 overflow-hidden">
                    <p className="font-semibold truncate">{video.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Last updated: {formatDistanceToNow(toDate(video.updatedAt), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex items-center">
                    <Button variant="ghost" size="icon" onClick={() => onSelectVideo(video)}>
                      <PlayCircle className="h-6 w-6 text-primary" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onDeleteVideo(video.id); }}>
                      <Trash2 className="h-5 w-5 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <p>Your uploaded videos will appear here.</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
