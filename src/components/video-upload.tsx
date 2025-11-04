'use client';

import { useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, UploadCloud } from 'lucide-react';

type VideoUploadProps = {
  onVideoSelect: (file: File) => void;
  isLoading: boolean;
};

export default function VideoUpload({ onVideoSelect, isLoading }: VideoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onVideoSelect(file);
    }
  };

  const handleCardClick = () => {
    fileInputRef.current?.click();
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const file = event.dataTransfer.files?.[0];
    if (file && file.type.startsWith('video/')) {
      onVideoSelect(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div className="container mx-auto flex h-full max-w-4xl flex-grow items-center justify-center p-4 sm:p-8">
      <Card
        className="w-full cursor-pointer transition-shadow duration-300 hover:shadow-lg hover:shadow-primary/10"
        onClick={handleCardClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <CardHeader className="text-center">
          <CardTitle className="font-headline text-2xl">Upload Your Video</CardTitle>
          <CardDescription>
            Drag & drop a video file or click to select one
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center gap-6 p-8">
          {isLoading ? (
            <div className="flex flex-col items-center gap-4 text-primary">
              <Loader2 className="h-16 w-16 animate-spin" />
              <p className="text-lg font-semibold">Generating subtitles...</p>
              <p className="text-sm text-muted-foreground">
                This may take a few moments. Please be patient.
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-full border-4 border-dashed border-border p-8">
                <UploadCloud className="h-16 w-16 text-muted-foreground" />
              </div>
              <Button>Select File</Button>
            </>
          )}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="video/*"
            className="hidden"
          />
        </CardContent>
      </Card>
    </div>
  );
}
