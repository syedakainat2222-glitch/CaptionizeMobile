import { Metadata } from 'next';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export const metadata: Metadata = {
    title: 'FAQ - Captionize',
    description: 'Frequently Asked Questions about the Captionize application.',
};

export default function FaqPage() {
    const faqs = [
        {
            question: 'What is Captionize?',
            answer: 'Captionize is an AI-powered web application that automatically generates, edits, and exports subtitles for your videos. Our goal is to make video content more accessible and easier to consume for everyone.',
        },
        {
            question: 'How does the automatic subtitle generation work?',
            answer: 'When you upload a video, we use state-of-the-art speech-to-text AI models to transcribe the audio content with high accuracy. The AI then synchronizes the transcribed text with the video timeline to create perfectly timed subtitles.',
        },
        {
            question: 'What video formats can I upload?',
            answer: 'Captionize supports all major video formats, including MP4, MOV, AVI, and WebM. If you have trouble with a specific format, please contact our support team.',
        },
        {
            question: 'How accurate are the AI-generated subtitles?',
            answer: 'Our AI models are highly accurate, typically achieving over 95% accuracy for clear audio. However, accuracy can vary based on audio quality, background noise, and speaker accents. That\'s why we provide an easy-to-use editor to make any necessary corrections.',
        },
        {
            question: 'Can I edit the generated subtitles?',
            answer: 'Absolutely. Our powerful editor allows you to easily correct text, adjust timing, and style your subtitles to perfection. You can see the changes in real-time on the video player.',
        },
        {
            question: 'What languages do you support?',
            answer: 'We support automatic language detection and transcription for dozens of languages. You can also translate your subtitles into other languages using our built-in translation feature.',
        },
        {
            question: 'Can I customize the appearance of my subtitles?',
            answer: 'Yes. You have full control over the font, size, color, background, and more. You can style the subtitles to match your brand or creative vision before exporting the final video.',
        },
        {
            question: 'What export options are available?',
            answer: 'You can download your subtitles as separate SRT or VTT files, which are compatible with most video platforms. Alternatively, you can choose to "burn-in" the subtitles, creating a new video file with the text permanently rendered on it, ready for sharing on social media.',
        },
         {
            question: 'Is my data secure?',
            answer: 'We take data privacy and security very seriously. Your videos are uploaded securely and are only processed to provide the subtitle service. Please see our Privacy Policy for more detailed information.',
        },
    ];

    return (
        <main className="container mx-auto px-4 py-8 md:px-6 md:py-12">
            <div className="mx-auto max-w-3xl">
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold font-headline mb-4">Frequently Asked Questions</h1>
                    <p className="text-lg md:text-xl text-muted-foreground">
                        Have a question? We're here to help.
                    </p>
                </div>

                <Accordion type="single" collapsible className="w-full">
                    {faqs.map((faq, index) => (
                        <AccordionItem key={index} value={`item-${index}`}>
                            <AccordionTrigger className="text-lg text-left hover:no-underline">
                                {faq.question}
                            </AccordionTrigger>
                            <AccordionContent className="text-base text-muted-foreground">
                                {faq.answer}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </div>
        </main>
    );
}
