import { memo } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Sparkles, Trash2 } from 'lucide-react';
import type { Subtitle } from '@/lib/srt';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type SubtitleItemProps = {
  subtitle: Subtitle;
  onUpdate: (id: number, text: string) => void;
  isActive: boolean;
  onSuggestCorrection: () => void;
  onDelete: (id: number) => void;
};

const SubtitleItem = ({
  subtitle,
  onUpdate,
  isActive,
  onSuggestCorrection,
  onDelete,
}: SubtitleItemProps) => {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-lg border p-3 transition-all duration-300 md:flex-row md:gap-2',
        isActive ? 'border-primary bg-primary/5 shadow-md' : 'border-border'
      )}
    >
      <div className="flex flex-row justify-between text-xs text-muted-foreground md:flex-col">
        <span>{subtitle.startTime.replace(',', '.')}</span>
        <span>{subtitle.endTime.replace(',', '.')}</span>
      </div>
      <div className="flex-grow">
        <Textarea
          dir="auto"
          value={subtitle.text}
          onChange={(e) => onUpdate(subtitle.id, e.target.value)}
          className="h-full min-h-[60px] resize-none bg-background/50 [&:dir(rtl)]:text-right"
        />
      </div>
      <div className="flex flex-row items-center justify-center gap-2 md:flex-col">
        <TooltipProvider>
            <Tooltip>
            <TooltipTrigger asChild>
                <Button
                variant="ghost"
                size="icon"
                onClick={onSuggestCorrection}
                className="shrink-0 text-amber-500 hover:text-amber-400"
                >
                <Sparkles className="h-5 w-5" />
                </Button>
            </TooltipTrigger>
            <TooltipContent>
                <p>Suggest Correction</p>
            </TooltipContent>
            </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(subtitle.id)}
                    className="shrink-0 text-red-500 hover:text-red-400"
                    >
                    <Trash2 className="h-5 w-5" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Delete Subtitle</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};

export default memo(SubtitleItem);
