import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LANGUAGES } from './languages';

interface TranslationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTranslate: (targetLanguage: string) => void;
  isTranslating: boolean;
}

const TranslationDialog = ({ open, onOpenChange, onTranslate, isTranslating }: TranslationDialogProps) => {
  const [targetLanguage, setTargetLanguage] = React.useState('es');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Translate Subtitles</DialogTitle>
          <DialogDescription>
            Select a language to translate your subtitles. This will replace the current subtitles in the editor.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Select value={targetLanguage} onValueChange={setTargetLanguage}>
            <SelectTrigger>
              <SelectValue placeholder="Select a language" />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onTranslate(targetLanguage)} disabled={isTranslating}>
            {isTranslating ? 'Translating...' : 'Translate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default memo(TranslationDialog);
