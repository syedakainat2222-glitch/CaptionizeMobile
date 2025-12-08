import { TextServiceClient } from "@google/generative-ai";

const client = new TextServiceClient({
  apiKey: process.env.GEMINI_API_KEY,
});

async function listModels() {
  try {
    const response = await client.listModels();
    console.log(JSON.stringify(response, null, 2));
  } catch (error) {
    console.error("Error fetching models:", error);
  }
}

listModels();
