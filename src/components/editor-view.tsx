import { memo } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
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
};

const SubtitleItem = ({
  subtitle,
  onUpdate,
  isActive,
  onSuggestCorrection,
}: SubtitleItemProps) => {
  return (
    <div
      className={cn(
        'flex gap-2 rounded-lg border p-3 transition-all duration-300',
        isActive ? 'border-primary bg-primary/5 shadow-md' : 'border-border'
      )}
    >
      <div className="flex flex-col text-xs text-muted-foreground">
        <span>{subtitle.startTime.replace(',', '.')}</span>
        <span>{subtitle.endTime.replace(',', '.')}</span>
      </div>
      <div className="flex-grow">
        <Textarea
          value={subtitle.text}
          onChange={(e) => onUpdate(subtitle.id, e.target.value)}
          className="h-full resize-none bg-background/50"
          rows={2}
        />
      </div>
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
    </div>
  );
};

export default memo(SubtitleItem);