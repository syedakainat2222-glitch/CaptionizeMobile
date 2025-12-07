
'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Bold, Italic, Underline, Palette, PenLine } from 'lucide-react';
import { cn } from '@/lib/utils';
import ColorPicker from './ColorPicker';
import type { Video } from '@/lib/types';

const FONT_OPTIONS = [
  { value: 'Anton', label: 'Anton' },
  { value: 'Bebas Neue', label: 'Bebas Neue' },
  { value: 'Caveat', label: 'Caveat' },
  { value: 'Comfortaa', label: 'Comfortaa' },
  { value: 'Dancing Script', label: 'Dancing Script' },
  { value: 'Inter', label: 'Inter' },
  { value: 'Lato', label: 'Lato' },
  { value: 'Lobster', label: 'Lobster' },
  { value: 'Lora', label: 'Lora' },
  { value: 'Merriweather', label: 'Merriweather' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Open Sans', label: 'Open Sans' },
  { value: 'Oswald', label: 'Oswald' },
  { value: 'Pacifico', label: 'Pacifico' },
  { value: 'Playfair Display', label: 'Playfair Display' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Righteous', label: 'Righteous' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Source Code Pro', label: 'Source Code Pro' },
];


type StyleControlsProps = {
  subtitleFont: string;
  subtitleFontSize: number;
  subtitleColor: string;
  subtitleBackgroundColor: string;
  subtitleOutlineColor: string;
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  onStyleChange: (update: Partial<Video>) => void;
};

const StyleControls = ({
  subtitleFont,
  subtitleFontSize,
  subtitleColor,
  subtitleBackgroundColor,
  subtitleOutlineColor,
  isBold,
  isItalic,
  isUnderline,
  onStyleChange,
}: StyleControlsProps) => {
  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="font-family">Font Family</Label>
            <Select
              value={subtitleFont}
              onValueChange={(value) => onStyleChange({ subtitleFont: value })}
            >
              <SelectTrigger id="font-family">
                <SelectValue placeholder="Select a font" />
              </SelectTrigger>
              <SelectContent>
                {FONT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="font-size">Font Size (px)</Label>
            <Input
              id="font-size"
              type="number"
              value={subtitleFontSize}
              onChange={(e) =>
                onStyleChange({ subtitleFontSize: parseInt(e.target.value, 10) })
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <ColorPicker
            label="Text Color"
            color={subtitleColor}
            onColorChange={(color) => onStyleChange({ subtitleColor: color })}
            icon={Palette}
          />
          <ColorPicker
            label="Background Color"
            color={subtitleBackgroundColor}
            onColorChange={(color) => onStyleChange({ subtitleBackgroundColor: color })}
            icon={Palette}
            includeTransparent
          />
          <ColorPicker
            label="Outline Color"
            color={subtitleOutlineColor}
            onColorChange={(color) => onStyleChange({ subtitleOutlineColor: color })}
            icon={PenLine}
            includeTransparent
          />
        </div>

        <div className="flex justify-start space-x-2">
          <Button
            variant="outline"
            size="icon"
            className={cn({ 'bg-gray-200': isBold })}
            onClick={() => onStyleChange({ isBold: !isBold })}
            aria-pressed={isBold}
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className={cn({ 'bg-gray-200': isItalic })}
            onClick={() => onStyleChange({ isItalic: !isItalic })}
            aria-pressed={isItalic}
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className={cn({ 'bg-gray-200': isUnderline })}
            onClick={() => onStyleChange({ isUnderline: !isUnderline })}
            aria-pressed={isUnderline}
          >
            <Underline className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default StyleControls;