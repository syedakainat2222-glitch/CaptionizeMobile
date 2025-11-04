'use client';

import type { Video } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from './ui/button';
import { formatDistanceToNow } from 'date-fns';
import { PlayCircle } from 'lucide-react';
import type { Timestamp } from 'firebase/firestore';

type VideoLibraryProps = {
  videos: Video[];
  onSelectVideo: (video: Video) => void;
};

const toDate = (timestamp: Timestamp | Date): Date => {
  if (timestamp && typeof (timestamp as Timestamp).toDate === 'function') {
    return (timestamp as Timestamp).toDate();
  }
  return timestamp as Date;
};

export default function VideoLibrary({ videos, onSelectVideo }: VideoLibraryProps) {
  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline">Video Library</CardTitle>
        <CardDescription>
          Select a previously uploaded video to continue editing.
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
                  <div>
                    <p className="font-semibold">{video.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Last updated: {formatDistanceToNow(toDate(video.updatedAt), { addSuffix: true })}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => onSelectVideo(video)}>
                    <PlayCircle className="h-6 w-6 text-primary" />
                  </Button>
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
