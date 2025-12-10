'use client';

import { useRef, useState } from 'react';
import axios from 'axios';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, UploadCloud } from 'lucide-react';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Progress } from './ui/progress';

const LANGUAGES = [
    { value: 'en_us', label: 'English (US)' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' },
    { value: 'it', label: 'Italian' },
    { value: 'pt', label: 'Portuguese' },
    { value: 'nl', label: 'Dutch' },
    { value: 'ru', label: 'Russian' },
    { value: 'ja', label: 'Japanese' },
    { value: 'ko', label: 'Korean' },
    { value: 'zh', label: 'Chinese' },
    { value: 'ur', label: 'Urdu' },
];

type VideoUploadProps = {
  onVideoSelect: (result: { publicId: string; fileName: string; secureUrl: string }) => void;
  isLoading: boolean;
  language: string;
  onLanguageChange: (language: string) => void;
};

export default function VideoUpload({
  onVideoSelect,
  isLoading,
  language,
  onLanguageChange,
}: VideoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-radix-select-trigger]')) {
      return;
    }
    fileInputRef.current?.click();
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (isLoading || isUploading) return;
    const file = event.dataTransfer.files?.[0];
    if (file && file.type.startsWith('video/')) {
      handleUpload(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', file);
    formData.append(
      'upload_preset',
      process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!
    );

    try {
      const response = await axios.post(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/video/upload`,
        formData,
        {
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
                const percentCompleted = Math.round(
                    (progressEvent.loaded * 100) / progressEvent.total
                );
                setUploadProgress(percentCompleted);
            }
          },
        }
      );

      onVideoSelect({
        publicId: response.data.public_id,
        fileName: file.name,
        secureUrl: response.data.secure_url,
      });

    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };


  return (
    <div className="container mx-auto flex h-full max-w-4xl flex-grow items-center justify-center p-4 sm:p-8">
      <Card
        className="w-full transition-shadow duration-300 hover:shadow-lg hover:shadow-primary/10"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <div
          onClick={handleCardClick}
          className={`cursor-pointer ${isUploading || isLoading ? 'pointer-events-none' : ''}`}
        >
          <CardHeader className="text-center">
            <CardTitle className="font-headline text-2xl">
              Upload Your Video
            </CardTitle>
            <CardDescription>
              Drag & drop a video file or click to select one
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center gap-6 p-8 pt-4">
            {isUploading ? (
              <div className="flex w-full flex-col items-center gap-4 text-primary">
                 <p className="text-lg font-semibold">Uploading...</p>
                <Progress value={uploadProgress} className="w-[60%]" />
                <p className="text-sm text-muted-foreground">{uploadProgress}% complete</p>
              </div>
            ) : isLoading ? (
              <div className="flex flex-col items-center gap-4 text-primary">
                <Loader2 className="h-16 w-16 animate-spin" />
                <p className="text-lg font-semibold">Processing video...</p>
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
              disabled={isLoading || isUploading}
            />
          </CardContent>
        </div>
        {!isLoading && !isUploading && (
          <CardContent className="px-8 pb-8">
            <div className="mx-auto max-w-sm space-y-2">
              <Label htmlFor="language-select">Select Language</Label>
              <Select
                value={language}
                onValueChange={onLanguageChange}
                disabled={isLoading || isUploading}
              >
                <SelectTrigger id="language-select">
                  <SelectValue placeholder="Auto-detect" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto-detect</SelectItem>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Choose a language or let us detect it automatically.
              </p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
