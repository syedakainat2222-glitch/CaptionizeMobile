const apiKey = "AIzaSyD35yMhavZo3vynqVAtEk4bERBujjSvWiw";
const model = "gemini-2.5-flash";
const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;

console.log("Testing: " + model + " with API v1");
console.log("URL: " + url.replace(apiKey, "API_KEY_HIDDEN"));

fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contents: [{
      parts: [{ text: "Translate 'Hello world' to Spanish" }]
    }]
  })
})
.then(async response => {
  console.log("Status:", response.status, response.statusText);
  
  if (response.ok) {
    const data = await response.json();
    console.log("✅ SUCCESS! Translation test works.");
    console.log("Response:", data.candidates[0].content.parts[0].text);
  } else {
    const error = await response.text();
    console.error("❌ API Error:", response.status);
    console.error("Error details:", error.substring(0, 300));
  }
})
.catch(error => {
  console.error("❌ Network error:", error.message);
});
