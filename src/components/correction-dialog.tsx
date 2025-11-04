import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Separator } from './ui/separator';

type CorrectionDialogProps = {
  state: {
    open: boolean;
    isLoading: boolean;
    suggestion: string | null;
    explanation: string | null;
  };
  onOpenChange: (isOpen: boolean) => void;
  onAccept: () => void;
};

export default function CorrectionDialog({
  state,
  onOpenChange,
  onAccept,
}: CorrectionDialogProps) {
  return (
    <Dialog open={state.open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>AI Suggested Correction</DialogTitle>
          <DialogDescription>
            Our AI has analyzed the subtitle and suggests the following
            correction.
          </DialogDescription>
        </DialogHeader>
        <div className="my-4 space-y-4">
          {state.isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div>
                <h3 className="mb-2 font-semibold">Suggestion</h3>
                <p className="rounded-md bg-muted p-3 text-sm">
                  {state.suggestion}
                </p>
              </div>
              <Separator />
              <div>
                <h3 className="mb-2 font-semibold">Explanation</h3>
                <p className="text-sm text-muted-foreground">
                  {state.explanation}
                </p>
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={state.isLoading}
          >
            Cancel
          </Button>
          <Button onClick={onAccept} disabled={state.isLoading}>
            Accept Suggestion
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
