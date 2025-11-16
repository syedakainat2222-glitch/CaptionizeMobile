import React from 'react';
import {
  Type,
  Baseline,
  Square,
  Bold,
  Italic,
  Underline,
  Palette
} from 'lucide-react';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Input } from './ui/input';
import { Toggle } from './ui/toggle';
import { Slider } from './ui/slider';
import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import ColorPicker from './ColorPicker';
import type { Video } from '@/lib/types';

const FONT_OPTIONS = [
  // Sans-serif
  'Arial, sans-serif',
  'Inter, sans-serif',
  'Roboto, sans-serif',
  'Open Sans, sans-serif',
  'Lato, sans-serif',
  'Montserrat, sans-serif',
  'Poppins, sans-serif',
  'Oswald, sans-serif',
  'Bebas Neue, sans-serif',
  'Anton, sans-serif',
  'Comfortaa, sans-serif',
  // Serif
  'Georgia, serif',
  'Times New Roman, serif',
  'Playfair Display, serif',
  'Merriweather, serif',
  'Lora, serif',
  // Monospace
  'Courier New, monospace',
  'Source Code Pro, monospace',
  // Cursive & Decorative
  'Pacifico, cursive',
  'Dancing Script, cursive',
  'Caveat, cursive',
  'Lobster, cursive',
  'Righteous, sans-serif'
];

const FONT_SIZE_OPTIONS = [24, 36, 48, 60, 72, 84, 96];

type StyleEditorProps = {
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

const StyleEditor = ({  subtitleFont,
  subtitleFontSize,
  subtitleColor,
  subtitleBackgroundColor,
  subtitleOutlineColor,
  isBold,
  isItalic,
  isUnderline,
  onStyleChange,}: StyleEditorProps) => {
  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
                <Label className="text-sm font-medium flex items-center gap-2"><Type className="h-4 w-4" /> Font</Label>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full justify-between">
                            <span className="truncate">{subtitleFont.split(',')[0]}</span>
                            <Palette className="h-4 w-4 opacity-50" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] max-h-96 overflow-y-auto">
                        <DropdownMenuRadioGroup value={subtitleFont} onValueChange={(v) => onStyleChange({ subtitleFont: v })}>
                            {FONT_OPTIONS.map((font) => (
                                <DropdownMenuRadioItem key={font} value={font} style={{ fontFamily: font }}>
                                    {font.split(',')[0]}
                                </DropdownMenuRadioItem>
                            ))}
                        </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <div className="flex flex-col gap-2">
                <Label className="text-sm font-medium flex items-center gap-2"><Baseline className="h-4 w-4" /> Size</Label>
                <Select value={String(subtitleFontSize)} onValueChange={(v) => onStyleChange({ subtitleFontSize: Number(v) })}>
                    <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
                    <SelectContent>
                        {FONT_SIZE_OPTIONS.map((size) => (
                            <SelectItem key={size} value={String(size)}>{size}px</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ColorPicker label="Text" icon={Type} color={subtitleColor} onColorChange={(c) => onStyleChange({ subtitleColor: c })} />
            <ColorPicker label="Outline" icon={Square} color={subtitleOutlineColor} onColorChange={(c) => onStyleChange({ subtitleOutlineColor: c })} includeTransparent />
            
            <div className="flex flex-col gap-2">
                <Label className="text-sm font-medium flex items-center gap-2"><Square className="h-4 w-4" /> Box</Label>
                <div className='flex items-center gap-2'>
                    <Input type="color" value={subtitleBackgroundColor.slice(0, 7)} onChange={(e) => {
                        const newOpacity = subtitleBackgroundColor.split(',')[3]?.replace(')','') || '0.5';
                        onStyleChange({ subtitleBackgroundColor: `${e.target.value}${Math.round(parseFloat(newOpacity) * 255).toString(16).padStart(2,'0')}`});
                    }} className="p-1 h-10 w-10" />
                    <Slider value={[parseFloat(subtitleBackgroundColor.split(',')[3]?.replace(')','') || '0.5') * 100]} onValueChange={([val]) => {
                       const hexColor = subtitleBackgroundColor.slice(0, 7);
                       const newRgba = `rgba(${parseInt(hexColor.slice(1,3),16)},${parseInt(hexColor.slice(3,5),16)},${parseInt(hexColor.slice(5,7),16)},${val/100})`;
                       onStyleChange({ subtitleBackgroundColor: newRgba });
                    }} max={100} step={5} className="flex-1" />
                </div>
            </div>
        </div>

        <div className="flex items-center gap-2">
            <Toggle pressed={isBold} onPressedChange={(p) => onStyleChange({ isBold: p })} aria-label="Toggle bold"><Bold className="h-4 w-4" /></Toggle>
            <Toggle pressed={isItalic} onPressedChange={(p) => onStyleChange({ isItalic: p })} aria-label="Toggle italic"><Italic className="h-4 w-4" /></Toggle>
            <Toggle pressed={isUnderline} onPressedChange={(p) => onStyleChange({ isUnderline: p })} aria-label="Toggle underline"><Underline className="h-4 w-4" /></Toggle>
        </div>
    </div>
  );
}

export default StyleEditor;
