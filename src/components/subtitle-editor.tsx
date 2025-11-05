import type { FC } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import SubtitleItem from './subtitle-item';
import type { Subtitle } from '@/lib/srt';

type SubtitleEditorProps = {
  subtitles: Subtitle[];
  activeSubtitleId: number | null;
  onUpdateSubtitle: (id: number, text: string) => void;
  onSuggestCorrection: (subtitle: Subtitle) => void;
};

const SubtitleEditor: FC<SubtitleEditorProps> = ({
  subtitles,
  activeSubtitleId,
  onUpdateSubtitle,
  onSuggestCorrection,
}) => {
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline">Subtitle Editor</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-4">
            {subtitles.length > 0 ? (
              subtitles.map((sub) =>
                sub ? ( // This check prevents rendering if a subtitle object is undefined
                  <SubtitleItem
                    key={sub.id}
                    subtitle={sub}
                    onUpdate={onUpdateSubtitle}
                    isActive={sub.id === activeSubtitleId}
                    onSuggestCorrection={() => onSuggestCorrection(sub)}
                  />
                ) : null
              )
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <p>No subtitles to display.</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default SubtitleEditor;
