
import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const generateColorPalette = () => {
    const baseColors = [
      { name: 'White', value: '#FFFFFF' }, { name: 'Black', value: '#000000' },
      { name: 'Yellow', value: '#FFFF00' }, { name: 'Cyan', value: '#00FFFF' },
      { name: 'Magenta', value: '#FF00FF' }, { name: 'Red', value: '#FF0000' },
      { name: 'Green', value: '#00FF00' }, { name: 'Blue', value: '#0000FF' }
    ];
    const shades = [
        { name: 'Light Gray', value: '#CCCCCC' }, { name: 'Gray', value: '#888888' },
        { name: 'Dark Gray', value: '#444444' }, { name: 'Soft Yellow', value: '#FFFFAA' },
        { name: 'Light Blue', value: '#ADD8E6' }, { name: 'Pale Green', value: '#98FB98' },
        { name: 'Light Pink', value: '#FFB6C1' }, { name: 'Orange', value: '#FFA500' }
    ];
    return [...baseColors, ...shades];
};
const COLOR_PALETTE = generateColorPalette();

type ColorPickerProps = {
    label: string,
    icon: React.ElementType,
    color: string,
    onColorChange: (color: string) => void,
    includeTransparent?: boolean,
};

const ColorPicker = ({
    label,
    icon: Icon,
    color,
    onColorChange,
    includeTransparent = false,
}: ColorPickerProps) => (
    <div className="flex flex-col gap-2">
        <Label className="text-sm font-medium flex items-center gap-2">
            <Icon className="h-4 w-4" /> {label}
        </Label>
        <div className="flex items-center gap-2">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="flex-1 justify-start gap-2">
                        <div className="h-4 w-4 rounded-full border relative" style={{ backgroundColor: color === 'transparent' ? 'white' : color }}>
                          {color === 'transparent' && <div className="absolute inset-0 bg-red-500 transform rotate-45" style={{ mixBlendMode: 'multiply' }}></div>}
                        </div>
                        <span className="truncate">{color}</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="max-h-60 overflow-y-auto">
                    <DropdownMenuRadioGroup value={color} onValueChange={onColorChange}>
                        {includeTransparent && <DropdownMenuRadioItem value="transparent">Transparent</DropdownMenuRadioItem>}
                        {COLOR_PALETTE.map((c) => (
                            <DropdownMenuRadioItem key={c.value} value={c.value}>
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-4 rounded-full border" style={{ backgroundColor: c.value }}></div>
                                    <span>{c.name}</span>
                                </div>
                            </DropdownMenuRadioItem>
                        ))}
                    </DropdownMenuRadioGroup>
                </DropdownMenuContent>
            </DropdownMenu>
            <Input
                type="color"
                value={color === 'transparent' ? '#000000' : color}
                onChange={(e) => onColorChange(e.target.value)}
                className="h-10 w-10 p-1"
                aria-label={`Custom ${label.toLowerCase()} color`}
            />
        </div>
    </div>
);

export default ColorPicker;
