'use client';

import { useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

// BCP-47 language codes supported by AssemblyAI
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
];

type VideoUploadProps = {
  onVideoSelect: (file: File) => void;
  isLoading: boolean;
  language: string;
  onLanguageChange: (language: string) => void;
};

export default function VideoUpload({ onVideoSelect, isLoading, language, onLanguageChange }: VideoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onVideoSelect(file);
    }
  };

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Prevent triggering file input when interacting with the select dropdown
    if ((e.target as HTMLElement).closest('[data-radix-select-trigger]')) {
      return;
    }
    fileInputRef.current?.click();
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (isLoading) return;
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
        className="w-full transition-shadow duration-300 hover:shadow-lg hover:shadow-primary/10"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <div 
          onClick={handleCardClick}
          className="cursor-pointer"
        >
          <CardHeader className="text-center">
            <CardTitle className="font-headline text-2xl">Upload Your Video</CardTitle>
            <CardDescription>
              Drag & drop a video file or click to select one
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center gap-6 p-8 pt-4">
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
              disabled={isLoading}
            />
          </CardContent>
        </div>
        {!isLoading && (
          <CardContent className="px-8 pb-8">
            <div className="mx-auto max-w-sm space-y-2">
              <Label htmlFor="language-select">Select Language</Label>
              <Select
                value={language}
                onValueChange={onLanguageChange}
                disabled={isLoading}
              >
                <SelectTrigger id="language-select">
                  <SelectValue placeholder="Auto-detect" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Auto-detect</SelectItem>
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
