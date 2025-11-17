
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Privacy Policy - Captionize',
    description: 'Privacy Policy for the Captionize application.',
};

export default function PrivacyPolicyPage() {
    return (
        <main className="container mx-auto px-4 py-8 md:px-6 md:py-12">
            <div className="prose prose-invert mx-auto max-w-3xl">
                <h1>Privacy Policy for Captionize</h1>
                <p><strong>Last Updated:</strong> {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

                <p>
                    Welcome to Captionize ("we," "us," or "our"). We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our application. Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the application.
                </p>

                <h2>1. INFORMATION WE COLLECT</h2>
                <p>
                    We may collect information about you in a variety of ways. The information we may collect on the App includes:
                </p>
                <h3>Personal Data</h3>
                <p>
                    While using our App, we may ask you to provide us with certain personally identifiable information that can be used to contact or identify you ("Personal Data"). This includes:
                </p>
                <ul>
                    <li>
                        <strong>Account Information:</strong> When you register for an account, we may collect your name, email address, and profile picture through services like Google Authentication.
                    </li>
                    <li>
                        <strong>User Content:</strong> We collect the videos you upload and the subtitles you generate, edit, or save within the application. This content is necessary to provide the core functionality of the app.
                    </li>
                </ul>

                <h3>Usage Data</h3>
                <p>
                    We may also collect information that your browser sends whenever you visit our App or when you access the App by or through a mobile device ("Usage Data"). This Usage Data may include information such as your computer's Internet Protocol address (e.g., IP address), browser type, browser version, the pages of our App that you visit, the time and date of your visit, the time spent on those pages, unique device identifiers, and other diagnostic data.
                </p>

                <h2>2. HOW WE USE YOUR INFORMATION</h2>
                <p>
                    Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the App to:
                </p>
                <ul>
                    <li>Create and manage your account.</li>
                    <li>Provide the core services of generating, editing, and exporting subtitles for your videos.</li>
                    <li>Process your videos through third-party AI services to generate transcriptions and subtitles.</li>
                    <li>Store your videos and associated subtitles in your personal library.</li>
                    <li>Improve our application and services.</li>
                    <li>Monitor and analyze usage and trends to improve your experience with the App.</li>
                </ul>

                <h2>3. DISCLOSURE OF YOUR INFORMATION</h2>
                <p>
                    We may share information we have collected about you in certain situations. Your information may be disclosed as follows:
                </p>
                <h3>By Law or to Protect Rights</h3>
                <p>
                    If we believe the release of information about you is necessary to respond to legal process, to investigate or remedy potential violations of our policies, or to protect the rights, property, and safety of others, we may share your information as permitted or required by any applicable law, rule, or regulation.
                </p>
                <h3>Third-Party Service Providers</h3>
                <p>
                    We may share your information with third parties that perform services for us or on our behalf. These third parties are essential for the operation of our App and include:
                </p>
                <ul>
                    <li><strong>Firebase (Google):</strong> For user authentication and database storage (Firestore).</li>
                    <li><strong>Cloudinary:</strong> For video storage, processing, and subtitle burn-in services.</li>
                    <li><strong>AssemblyAI:</strong> For automatic speech-to-text transcription to generate subtitles.</li>
                    <li><strong>Google AI (Gemini):</strong> For AI-powered features such as subtitle correction suggestions.</li>
                </ul>
                <p>
                    These service providers have their own privacy policies and we encourage you to review them. They will only have access to your data to the extent necessary to perform their functions.
                </p>

                <h2>4. DATA STORAGE AND SECURITY</h2>
                <p>
                    We use administrative, technical, and physical security measures to help protect your personal information. Your videos and subtitles are stored using Firebase Firestore and Cloudinary. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other type of misuse.
                </p>
                
                <h2>5. YOUR RIGHTS AND CHOICES</h2>
                <h3>Account Information</h3>
                <p>
                    You may at any time review or change the information in your account or terminate your account by logging into your account settings. Upon your request to terminate your account, we will deactivate or delete your account and information from our active databases. However, some information may be retained in our files to prevent fraud, troubleshoot problems, assist with any investigations, enforce our Terms of Use and/or comply with legal requirements.
                </p>
                <h3>Accessing and Deleting Your Content</h3>
                <p>
                    You can access and delete the videos and subtitles stored in your library directly within the application. Deleting a video from your library will remove it and its associated data from our primary databases.
                </p>
                
                <h2>6. POLICY FOR CHILDREN</h2>
                <p>
                    We do not knowingly solicit information from or market to children under the age of 13. If you become aware of any data we have collected from children under age 13, please contact us using the contact information provided below.
                </p>

                <h2>7. CHANGES TO THIS PRIVACY POLICY</h2>
                <p>
                    We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. You are advised to review this Privacy Policy periodically for any changes.
                </p>

                <h2>8. CONTACT US</h2>
                <p>
                    If you have questions or comments about this Privacy Policy, please contact us at:
                </p>
                <p>
                    Captionize Support<br/>
                    Email: support@captionize.app
                </p>
            </div>
        </main>
    );
}
