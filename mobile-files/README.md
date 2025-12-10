# MOBILE BUILD FILES

This folder contains Android/PWA build files.
It's IGNORED by git and won't deploy to Vercel.

## Structure:
- android/     - Android Studio project
- pwa/        - PWA manifest, service workers
- icons/      - App icons
- screenshots/ - Store screenshots
- configs/    - Build configurations
- builds/     - APK/AAB outputs
- backups/    - Version backups

## Bubblewrap workflow:
1. Run bubblewrap in ~/studio/
2. It will create files in current directory
3. Move them here: mv android/ mobile-files/android/
4. Move APKs: mv *.apk mobile-files/builds/
