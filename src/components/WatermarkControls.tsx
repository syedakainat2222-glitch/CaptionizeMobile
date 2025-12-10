'use client';

import { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Upload, Image as ImageIcon } from 'lucide-react';
import { uploadToCloudinary } from '@/lib/cloudinary';

type WatermarkControlsProps = {
  onApplyWatermark: (imageUrl: string, position: string, scale: number, opacity: number) => void;
  isApplying: boolean;
};

export default function WatermarkControls({ onApplyWatermark, isApplying }: WatermarkControlsProps) {
  const [imageUrl, setImageUrl] = useState('');
  const [position, setPosition] = useState('north_east');
  const [scale, setScale] = useState(0.2);
  const [opacity, setOpacity] = useState(80);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);


  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsUploading(true);
      try {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = async () => {
            const base64data = reader.result as string;
            const response = await uploadToCloudinary(base64data, 'image');
            if(response) {
                setImageUrl(response.secure_url);
            }
        }
      } catch (error) {
        console.error('Upload failed', error);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleApply = () => {
    if (imageUrl) {
      onApplyWatermark(imageUrl, position, scale, opacity);
    }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="space-y-2">
          <Label>Watermark</Label>
          <div className="flex items-center gap-2">
            <Input
              type="text"
              placeholder="Paste image URL or upload"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
            <Button variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                {isUploading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div> : <Upload className="h-4 w-4" />}
            </Button>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*"
            />
          </div>
        </div>

        {/* Simple position for now, can be expanded */}
        <div className="grid grid-cols-2 gap-4">
            <div>
                <Label htmlFor="watermark-position">Position</Label>
                <select id="watermark-position" value={position} onChange={(e) => setPosition(e.target.value)} className="w-full p-2 border rounded">
                    <option value="north_east">Top Right</option>
                    <option value="north_west">Top Left</option>
                    <option value="south_east">Bottom Right</option>
                    <option value="south_west">Bottom Left</option>
                </select>
            </div>
            <div>
                <Label htmlFor="watermark-opacity">Opacity (%)</Label>
                <Input id="watermark-opacity" type="number" value={opacity} onChange={(e) => setOpacity(parseInt(e.target.value))}/>
            </div>
        </div>

        <Button onClick={handleApply} disabled={isApplying || !imageUrl}>
          {isApplying ? 'Applying...' : 'Apply Watermark'}
        </Button>
      </CardContent>
    </Card>
  );
}