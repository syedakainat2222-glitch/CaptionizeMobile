import React from 'react';
import {
  ArrowLeft,
  Download,
  FileText,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type EditorHeaderProps = {
    onReset: () => void;
    isExporting: boolean;
    handleExport: (format: 'srt' | 'vtt') => void;
    handleExportVideoWithSubtitles: () => void;
};

const EditorHeader = ({ onReset, isExporting, handleExport, handleExportVideoWithSubtitles }: EditorHeaderProps) => {
    return (
        <div className="flex justify-between items-center">
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" onClick={onReset}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Back to Upload</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            <div className="flex items-center gap-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline">
                            <FileText className="mr-2 h-4 w-4" /> Export Subtitles
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuRadioGroup>
                            <DropdownMenuRadioItem value="srt" onClick={() => handleExport('srt')}>
                                SRT (.srt)
                            </DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="vtt" onClick={() => handleExport('vtt')}>
                                VTT (.vtt)
                            </DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                </DropdownMenu>

                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button onClick={handleExportVideoWithSubtitles} disabled={isExporting}>
                                {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                                Export Video
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Burn subtitles into the video and download</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        </div>
    );
};

export default EditorHeader;
