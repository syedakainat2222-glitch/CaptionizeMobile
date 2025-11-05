'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

export default function CaptionEditor() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [subtitles, setSubtitles] = useState<{ text: string; time: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [suggestion, setSuggestion] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setVideoFile(file);
  };

  // ===============================
  // STEP 1: UPLOAD VIDEO TO CLOUDINARY
  // ===============================
  const handleUpload = async () => {
    if (!videoFile) return setError('Please select a video file first.');
    setError('');
    setLoading(true);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const videoDataUri = reader.result;

        const uploadRes = await fetch('/api/upload-video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoDataUri }),
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error || 'Upload failed');

        setVideoUrl(uploadData.videoUrl);
        console.log('Video uploaded:', uploadData.videoUrl);
        setLoading(false);
      };

      reader.readAsDataURL(videoFile);
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  // ===============================
  // STEP 2: GENERATE SUBTITLES (AI)
  // ===============================
  const handleGenerateSubtitles = async () => {
    if (!videoUrl) return setError('Please upload a video first.');
    setError('');
    setLoading(true);

    try {
      const genRes = await fetch('/api/generate-subtitles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl }),
      });

      const result = await genRes.json();
      if (!genRes.ok) throw new Error(result.error || 'Failed to generate subtitles.');

      setSubtitles(result.subtitles || []);
      console.log('Generated subtitles:', result.subtitles);
    } catch (err: any) {
      console.error('Subtitle generation error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ===============================
  // STEP 3: SUGGEST CORRECTIONS (AI)
  // ===============================
  const handleSuggestCorrection = async (subtitleText: string, context?: string) => {
    try {
      const correctionRes = await fetch('/api/suggest-correction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subtitleText, context }),
      });

      const result = await correctionRes.json();
      if (!correctionRes.ok) throw new Error(result.error || 'Failed to get suggestion.');

      setSuggestion(result.suggestion || 'No suggestion available.');
    } catch (err: any) {
      console.error('Correction suggestion error:', err);
      setSuggestion(`Error: ${err.message}`);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🎬 Caption Editor</h1>

      {/* Video Upload */}
      <div className="mb-4">
        <Input type="file" accept="video/*" onChange={handleFileChange} />
        <Button onClick={handleUpload} disabled={!videoFile || loading} className="mt-2">
          {loading ? <Loader2 className="animate-spin mr-2" /> : 'Upload Video'}
        </Button>
      </div>

      {/* Uploaded Video Preview */}
      {videoUrl && (
        <div className="mb-6">
          <video src={videoUrl} controls className="w-full rounded-lg" />
        </div>
      )}

      {/* Subtitle Generation */}
      <div className="mb-6">
        <Button onClick={handleGenerateSubtitles} disabled={!videoUrl || loading}>
          {loading ? <Loader2 className="animate-spin mr-2" /> : 'Generate Subtitles'}
        </Button>
      </div>

      {/* Subtitle Display */}
      {subtitles.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Generated Subtitles</h2>
          {subtitles.map((sub, i) => (
            <div key={i} className="p-3 border rounded-lg">
              <p className="font-medium">🕒 {sub.time}</p>
              <p className="mb-2">{sub.text}</p>
              <Button
                variant="secondary"
                onClick={() => handleSuggestCorrection(sub.text, 'subtitle context')}
              >
                Suggest Correction
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* AI Suggestion */}
      {suggestion && (
        <div className="mt-6 p-4 bg-gray-100 rounded-lg">
          <h3 className="font-semibold">💡 Suggested Correction:</h3>
          <p>{suggestion}</p>
        </div>
      )}

      {/* Error Display */}
      {error && <p className="text-red-600 mt-4">{error}</p>}
    </div>
  );
}
