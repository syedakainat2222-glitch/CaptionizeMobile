const testPayload = {
  videoPublicId: "captionize-video-1763368774081",
  subtitles: [
    { id: 1, startTime: "00:00:01,000", endTime: "00:00:04,000", text: "Test subtitle 1" },
    { id: 2, startTime: "00:00:05,000", endTime: "00:00:08,000", text: "Test subtitle 2" }
  ],
  videoName: "test-video.mp4",
  subtitleFont: "Arial, sans-serif",
  subtitleFontSize: 48,
  subtitleColor: "#FFFFFF",
  subtitleBackgroundColor: "rgba(0,0,0,0.5)",
  subtitleOutlineColor: "transparent",
  isBold: false,
  isItalic: false,
  isUnderline: false
};

console.log('Testing API with payload size:', JSON.stringify(testPayload).length, 'bytes');

fetch('http://localhost:3000/api/burn-in', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(testPayload)
})
.then(async response => {
  console.log('API Response Status:', response.status);
  if (!response.ok) {
    const error = await response.json();
    console.log('API Error:', error);
  } else {
    console.log('API Success - response headers:', Object.fromEntries(response.headers));
  }
})
.catch(error => {
  console.log('Fetch error:', error.message);
});
