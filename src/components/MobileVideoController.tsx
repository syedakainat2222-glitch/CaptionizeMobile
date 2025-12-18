'use client';

import { useEffect, useRef } from 'react';

export const setupMobileVideoController = (videoRef: React.RefObject<HTMLVideoElement>) => {
  useEffect(() => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    
    // Function to handle mobile play
    const handleMobilePlay = () => {
      if (video.paused) {
        // Ensure video is ready and visible
        video.style.display = 'block';
        video.hidden = false;
        
        // Try to play with sound
        video.play().catch(err => {
          console.log('Mobile play failed, trying muted:', err);
          // If that fails, try muted first
          video.muted = true;
          video.play().then(() => {
            // Unmute after playing starts
            setTimeout(() => {
              video.muted = false;
            }, 100);
          }).catch(e => {
            console.log('Muted play also failed:', e);
          });
        });
      } else {
        video.pause();
      }
    };

    // Find and modify the timeline play button
    const setupTimelineButton = () => {
      const buttons = document.querySelectorAll('[data-timeline-play]');
      buttons.forEach(button => {
        // Remove existing click handlers
        button.replaceWith(button.cloneNode(true));
        
        const newButton = document.querySelector(`[data-timeline-play="${button.getAttribute('data-timeline-play')}"]`);
        if (newButton) {
          // Add direct event listener (not through React)
          newButton.addEventListener('click', handleMobilePlay);
          newButton.addEventListener('touchstart', handleMobilePlay);
        }
      });
    };

    // Set up initially
    setupTimelineButton();
    
    // Set up mutation observer to catch dynamically added buttons
    const observer = new MutationObserver(setupTimelineButton);
    observer.observe(document.body, { childList: true, subtree: true });

    // Cleanup
    return () => {
      observer.disconnect();
      const buttons = document.querySelectorAll('[data-timeline-play]');
      buttons.forEach(button => {
        button.removeEventListener('click', handleMobilePlay);
        button.removeEventListener('touchstart', handleMobilePlay);
      });
    };
  }, [videoRef]);
};