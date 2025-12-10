import { Metadata } from 'next';
import { Film, Zap, Type, Download } from 'lucide-react';

export const metadata: Metadata = {
    title: 'About - Captionize',
    description: 'Learn more about Captionize and our mission to make video content accessible to everyone.',
};

export default function AboutPage() {
    return (
        <main className="container mx-auto px-4 py-8 md:px-6 md:py-12">
            <div className="mx-auto max-w-3xl">
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold font-headline mb-4">About Us</h1>
                    <p className="text-lg md:text-xl text-muted-foreground">
                        Our mission is to make the world’s video content accessible to everyone, effortlessly.
                    </p>
                </div>

                <div className="prose prose-invert max-w-none space-y-8">
                    <p className="text-lg">
                        In a world driven by video, a significant portion of content remains inaccessible to millions. Whether due to hearing impairments, language barriers, or simply watching in a noisy environment, subtitles are no longer just an option—they are a necessity. Captionize was born from a simple idea: what if generating accurate, perfectly timed subtitles could be as easy as uploading a video?
                    </p>

                    <div className="rounded-lg border bg-card p-6">
                        <h2 className="text-2xl font-bold mb-4">How It Works</h2>
                        <ul className="space-y-4">
                            <li className="flex items-start gap-4">
                                <div className="flex-shrink-0 bg-primary/10 text-primary rounded-full p-2">
                                    <Film className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="font-semibold">1. Upload Your Video</h3>
                                    <p className="text-muted-foreground">Simply drag and drop your video file into our uploader. We handle the secure upload and preparation.</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-4">
                                <div className="flex-shrink-0 bg-primary/10 text-primary rounded-full p-2">
                                    <Zap className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="font-semibold">2. AI-Powered Generation</h3>
                                    <p className="text-muted-foreground">Our state-of-the-art AI gets to work, transcribing your video's audio with remarkable accuracy and generating perfectly synchronized subtitles in seconds.</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-4">
                                <div className="flex-shrink-0 bg-primary/10 text-primary rounded-full p-2">
                                    <Type className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="font-semibold">3. Edit & Style</h3>
                                    <p className="text-muted-foreground">Use our intuitive editor to make any corrections. Then, customize the look of your subtitles—change the font, size, color, and more to match your brand.</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-4">
                                <div className="flex-shrink-0 bg-primary/10 text-primary rounded-full p-2">
                                    <Download className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="font-semibold">4. Export Your Video</h3>
                                    <p className="text-muted-foreground">Download your subtitles as an SRT or VTT file, or export a new video file with the subtitles permanently burned in, ready for publishing anywhere.</p>
                                </div>
                            </li>
                        </ul>
                    </div>

                    <p className="text-lg">
                        Captionize is built for content creators, marketers, educators, and anyone who believes in the power of accessible media. We handle the technical complexity so you can focus on what you do best: creating amazing content.
                    </p>

                    <div className="text-center pt-8">
                         <h2 className="text-3xl font-bold font-headline">Join us in making video truly accessible.</h2>
                    </div>
                </div>
            </div>
        </main>
    );
}
