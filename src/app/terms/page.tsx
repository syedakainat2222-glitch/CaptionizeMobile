
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Terms of Service - Captionize',
    description: 'Terms of Service for the Captionize application.',
};

export default function TermsOfServicePage() {
    return (
        <main className="container mx-auto px-4 py-8 md:px-6 md:py-12">
            <div className="prose prose-invert mx-auto max-w-3xl">
                <h1>Terms of Service for Captionize</h1>
                <p><strong>Last Updated:</strong> {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

                <p>
                    Welcome to Captionize ("we," "us," or "our"). These Terms of Service ("Terms") govern your use of our application and services. By accessing or using Captionize, you agree to be bound by these Terms. If you disagree with any part of the terms, then you may not access the service.
                </p>

                <h2>1. Description of Service</h2>
                <p>
                    Captionize is a web application that provides users with tools to automatically generate, edit, and export subtitles for video files. The service uses third-party AI providers for transcription and other features.
                </p>

                <h2>2. User Accounts</h2>
                <p>
                    To access certain features of the app, you may be required to create an account. You are responsible for safeguarding your account information and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
                </p>

                <h2>3. User Content</h2>
                <p>
                    You retain full ownership of the videos you upload and the subtitles you create ("User Content"). By using our service, you grant Captionize a worldwide, non-exclusive, royalty-free license to use, reproduce, process, and display your User Content solely for the purpose of providing and improving the service. This includes processing your video through our AI service providers to generate subtitles.
                </p>
                <p>
                    You are solely responsible for your User Content and the consequences of posting or publishing it. You represent and warrant that you have the necessary rights to grant us this license and that your content does not violate any laws or third-party rights.
                </p>

                <h2>4. Prohibited Conduct</h2>
                <p>You agree not to use the service to:</p>
                <ul>
                    <li>Upload, post, or otherwise transmit any content that is illegal, harmful, threatening, abusive, harassing, defamatory, vulgar, obscene, or otherwise objectionable.</li>
                    <li>Infringe upon any patent, trademark, trade secret, copyright, or other proprietary rights of any party.</li>
                    <li>Upload any content that contains software viruses or any other computer code, files, or programs designed to interrupt, destroy, or limit the functionality of any computer software or hardware.</li>
                    <li>Interfere with or disrupt the service or servers or networks connected to the service.</li>
                </ul>

                <h2>5. Third-Party Services</h2>
                <p>
                    Our service relies on third-party services to provide its functionality, including but not limited to Firebase for authentication and storage, Cloudinary for video processing, and AssemblyAI/Google AI for subtitle generation. Your use of our service is also subject to the terms and privacy policies of these third-party providers. We are not responsible for the practices of these third-party services.
                </p>

                <h2>6. Disclaimer of Warranties</h2>
                <p>
                    The service is provided on an "AS IS" and "AS AVAILABLE" basis. We make no warranties, express or implied, regarding the service's reliability, availability, or accuracy. We do not warrant that the results obtained from the use of the service will be accurate or reliable.
                </p>

                <h2>7. Limitation of Liability</h2>
                <p>
                    In no event shall Captionize, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the service.
                </p>

                <h2>8. Indemnification</h2>
                <p>
                    You agree to defend, indemnify and hold harmless Captionize and its licensee and licensors, and their employees, contractors, agents, officers and directors, from and against any and all claims, damages, obligations, losses, liabilities, costs or debt, and expenses (including but not limited to attorney's fees), resulting from or arising out of your use and access of the service, or a breach of these Terms.
                </p>

                <h2>9. Changes to Terms</h2>
                <p>
                    We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will provide notice of any changes by posting the new Terms on this page and updating the "Last Updated" date.
                </p>

                <h2>10. Governing Law</h2>
                <p>
                    These Terms shall be governed and construed in accordance with the laws of the jurisdiction in which the company is based, without regard to its conflict of law provisions.
                </p>
            </div>
        </main>
    );
}
