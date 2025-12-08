// Make sure your GEMINI_API_KEY is set in the environment variables
const apiKey = process.env.GEMINI_API_KEY;

async function fixGemini404() {
  try {
    // Step 1: List all available Gemini models
    const listResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`
    );

    if (!listResponse.ok) {
      const errorData = await listResponse.json();
      console.error("Error listing models:", errorData);
      return;
    }

    const models = await listResponse.json();
    console.log("Available Gemini Models:", models);

    // Step 2: Pick a supported model (example: gemini-2.5-flash-latest)
    const modelName = "gemini-2.5-flash-latest"; // replace with a valid model from the list

    // Step 3: Test a translation request
    const prompt = "Translate 'Hello world' to Spanish, keep format simple.";

    const translateResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2 },
        }),
      }
    );

    if (!translateResponse.ok) {
      const errorData = await translateResponse.json();
      console.error("Translation API Error:", errorData);
      return;
    }

    const data = await translateResponse.json();
    console.log("Translation Result:", data?.candidates?.[0]?.content?.parts?.[0]?.text);
  } catch (err) {
    console.error("Unexpected error:", err);
  }
}

fixGemini404();